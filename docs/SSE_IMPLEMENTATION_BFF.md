# SSE Progress Tracking - BFF Implementation Guide

This guide covers all BFF (Backend for Frontend) changes needed to implement the SSE endpoint and GraphQL enhancements.

---

## Overview

**Files to Modify**: 4 existing files
**Estimated Time**: 3-4 hours

---

## File 1: Add SSE Endpoint

**Location**: `C:\Work\Offering\sapphire-bff-api\src\index.js`

**Add after line 100** (after the GraphQL middleware setup):

```javascript
// ============================================================================
// SSE Endpoint for Recommendation Progress
// ============================================================================

app.get('/sse/recommendation-progress/:userId', async (req, res) => {
  const { userId } = req.params;
  const { workflowId } = req.query;
  
  console.log(`[SSE] Connection request from userId: ${userId}, workflowId: ${workflowId}`);
  
  // Verify authentication
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) {
    console.error('[SSE] No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { isValid, user, error } = await verifyToken(token, KEYCLOAK_JWKS_URL, KEYCLOAK_ISSUER);
  
  if (!isValid) {
    console.error('[SSE] Invalid token:', error);
    return res.status(401).json({ error: `Invalid token: ${error}` });
  }
  
  // Verify user can only access their own progress
  if (user.email !== userId) {
    console.error('[SSE] User mismatch:', { authenticated: user.email, requested: userId });
    return res.status(403).json({ error: 'Forbidden: Cannot access other user\'s progress' });
  }
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
  
  console.log(`[SSE] Client connected for userId: ${userId}`);
  
  // Create Redis subscriber for this connection
  const subscriber = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT
    }
  });
  
  subscriber.on('error', (err) => {
    console.error('[SSE] Redis subscriber error:', err);
  });
  
  try {
    await subscriber.connect();
    console.log(`[SSE] Redis subscriber connected for userId: ${userId}`);
    
    // Subscribe to global recommendation progress channel
    const channel = 'recommendation-progress';
    
    await subscriber.subscribe(channel, (message) => {
      try {
        const event = JSON.parse(message);
        
        // Server-side filtering: only send events for this user
        if (event.userId !== userId) {
          return;
        }
        
        // Optional: filter by workflowId if provided
        if (workflowId && event.workflowId !== workflowId) {
          return;
        }
        
        console.log(`[SSE] Sending event to userId: ${userId}, type: ${event.type}`);
        
        // Send SSE event
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        
        // Close connection on complete or error
        if (event.type === 'complete' || event.type === 'error') {
          console.log(`[SSE] Workflow ${event.type} for userId: ${userId}, closing connection`);
          setTimeout(() => {
            subscriber.unsubscribe(channel);
            subscriber.quit();
            res.end();
          }, 1000);
        }
      } catch (error) {
        console.error('[SSE] Error processing message:', error);
      }
    });
    
    console.log(`[SSE] Subscribed to channel: ${channel} for userId: ${userId}`);
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      userId,
      workflowId: workflowId || null,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Handle client disconnect
    req.on('close', () => {
      console.log(`[SSE] Client disconnected for userId: ${userId}`);
      subscriber.unsubscribe(channel).catch(err => {
        console.error('[SSE] Error unsubscribing:', err);
      });
      subscriber.quit().catch(err => {
        console.error('[SSE] Error closing subscriber:', err);
      });
    });
    
    // Keep-alive ping every 30 seconds
    const keepAliveInterval = setInterval(() => {
      res.write(`:keepalive\n\n`);
    }, 30000);
    
    req.on('close', () => {
      clearInterval(keepAliveInterval);
    });
    
  } catch (error) {
    console.error('[SSE] Error setting up subscriber:', error);
    res.status(500).json({ error: 'Failed to establish SSE connection' });
  }
});

console.log('✅ SSE endpoint configured at /sse/recommendation-progress/:userId');
```

**Add Redis client import at the top** (if not already present):

```javascript
import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
```

---

## File 2: Update GraphQL Schema

**Location**: `C:\Work\Offering\sapphire-bff-api\src\schema\typeDefs.js`

**Find and update** (around line 25):

```javascript
type GenerateRecommendationResult {
  success: Boolean!
  message: String!
  workflowId: String  # ADD THIS LINE
}
```

---

## File 3: Update UsersAPI DataSource

**Location**: `C:\Work\Offering\sapphire-bff-api\src\datasources\UsersAPI.js`

**Update the `generateRecommendation` method** (around line 377):

```javascript
/**
 * Trigger recommendation generation for a user
 * @param {string} userId - User ID (email)
 * @returns {Promise<Object>} Generation result with workflowId
 */
async generateRecommendation(userId) {
  return tracer.startActiveSpan('UsersAPI.generateRecommendation', async (span) => {
    try {
      span.setAttribute('user.id', userId);
      console.info(`[UsersAPI] generateRecommendation called for userId: ${userId}`);

      // The API endpoint is at a different base URL for recommendations
      const recommendationsBaseURL = process.env.RECOMMENDATIONS_API_URL || 'http://localhost:8095/api/v1';
      
      const response = await this.post(`${recommendationsBaseURL}/recommendations/trigger`, {
        body: {
          userId
        }
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      console.info(`[UsersAPI] Recommendation generation triggered successfully for userId: ${userId}, workflowId: ${response.workflowId}`);
      
      return {
        success: true,
        message: 'Recommendation generation triggered successfully',
        workflowId: response.workflowId  // ADD THIS LINE - Return workflowId from workflow service
      };
    } catch (error) {
      console.error('[UsersAPI] generateRecommendation - Error:', error.message);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## File 4: Update Resolver (Optional Enhancement)

**Location**: `C:\Work\Offering\sapphire-bff-api\src\resolvers\index.js`

**The resolver should already work**, but you can add logging (around line 256):

```javascript
generateRecommendation: async (_, { userId }, { dataSources }) => {
  console.info('[Resolver] Mutation.generateRecommendation called', { userId });
  const result = await dataSources.usersAPI.generateRecommendation(userId);
  console.info('[Resolver] Mutation.generateRecommendation completed', { 
    userId, 
    workflowId: result.workflowId 
  });
  return result;
},
```

---

## Environment Variables

**Add to `.env` file**:

```bash
# Redis Configuration (if not already present)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Recommendations Service URL (if not already present)
RECOMMENDATIONS_API_URL=http://localhost:8095/api/v1
```

---

## CORS Configuration

**Ensure CORS allows SSE** (should already be configured, but verify):

```javascript
app.use(
  '/graphql',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }),
  express.json({ limit: '50mb' }),
  expressMiddleware(server, {
    context: async ({ req }) => {
      // ... existing context setup
    }
  })
);

// Add CORS for SSE endpoint
app.use(
  '/sse',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
);
```

---

## Testing the SSE Endpoint

### 1. Manual Test with curl

```bash
# Get JWT token from browser (copy from Network tab)
TOKEN="your-jwt-token-here"

# Test SSE connection
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/sse/recommendation-progress/user@example.com?workflowId=test-123
```

Expected output:
```
data: {"type":"connected","userId":"user@example.com","workflowId":"test-123","timestamp":"2024-..."}
```

### 2. Test with Redis CLI

```bash
# In one terminal, connect to SSE
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/sse/recommendation-progress/user@example.com

# In another terminal, publish test event
redis-cli
> PUBLISH recommendation-progress '{"type":"progress","userId":"user@example.com","workflowId":"test-123","percentage":50,"step":{"current":3,"total":7,"name":"Test Step","description":"Testing","status":"in_progress"},"timestamp":"2024-01-01T00:00:00Z"}'
```

You should see the event appear in the SSE connection.

### 3. Integration Test

```javascript
// test/sse-endpoint.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('SSE Endpoint', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .get('/sse/recommendation-progress/test@example.com')
      .expect(401);
    
    expect(response.body.error).toContain('Authentication required');
  });
  
  it('should establish SSE connection with valid token', async () => {
    const token = 'valid-jwt-token'; // Mock or generate valid token
    
    const response = await request(app)
      .get('/sse/recommendation-progress/test@example.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Content-Type', 'text/event-stream');
  });
  
  it('should filter events by userId', async () => {
    // Test that user only receives their own events
    // Implementation depends on your testing setup
  });
});
```

---

## Monitoring and Logging

### Key Metrics to Track

1. **Active SSE Connections**: Number of concurrent SSE connections
2. **Connection Duration**: How long connections stay open
3. **Event Throughput**: Number of events sent per second
4. **Error Rate**: Failed connections or event delivery errors
5. **Redis Pub/Sub Performance**: Message delivery latency

### Logging Best Practices

```javascript
// Add structured logging
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'bff',
  component: 'sse',
  event: 'connection_established',
  userId,
  workflowId,
  connectionId: req.id // If using request ID middleware
}));
```

### Health Check Endpoint

**Add to `src/index.js`**:

```javascript
app.get('/health/sse', async (req, res) => {
  try {
    // Check Redis connection
    const testClient = createClient({
      socket: { host: REDIS_HOST, port: REDIS_PORT }
    });
    await testClient.connect();
    await testClient.ping();
    await testClient.quit();
    
    res.json({
      status: 'healthy',
      redis: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      redis: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## Performance Optimization

### 1. Connection Pooling

```javascript
// Create a Redis connection pool for SSE
import { createPool } from 'generic-pool';

const redisPool = createPool({
  create: async () => {
    const client = createClient({
      socket: { host: REDIS_HOST, port: REDIS_PORT }
    });
    await client.connect();
    return client;
  },
  destroy: async (client) => {
    await client.quit();
  }
}, {
  max: 50, // Maximum connections
  min: 5   // Minimum connections
});
```

### 2. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const sseRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 connections per window per IP
  message: 'Too many SSE connections, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/sse/recommendation-progress/:userId', sseRateLimiter, async (req, res) => {
  // ... SSE implementation
});
```

### 3. Memory Management

```javascript
// Track active connections
const activeConnections = new Map();

app.get('/sse/recommendation-progress/:userId', async (req, res) => {
  const connectionId = `${userId}-${Date.now()}`;
  
  // Limit connections per user
  const userConnections = Array.from(activeConnections.values())
    .filter(conn => conn.userId === userId);
  
  if (userConnections.length >= 3) {
    return res.status(429).json({ 
      error: 'Maximum concurrent connections reached for this user' 
    });
  }
  
  activeConnections.set(connectionId, { userId, timestamp: Date.now() });
  
  req.on('close', () => {
    activeConnections.delete(connectionId);
  });
  
  // ... rest of SSE implementation
});
```

---

## Security Considerations

### 1. Token Validation

```javascript
// Validate token on every SSE connection
const { isValid, user, error } = await verifyToken(token, KEYCLOAK_JWKS_URL, KEYCLOAK_ISSUER);

if (!isValid) {
  console.error('[SSE] Invalid token:', error);
  return res.status(401).json({ error: `Invalid token: ${error}` });
}

// Verify user can only access their own progress
if (user.email !== userId) {
  console.error('[SSE] User mismatch');
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 2. Input Validation

```javascript
// Validate userId format
if (!userId || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userId)) {
  return res.status(400).json({ error: 'Invalid userId format' });
}

// Validate workflowId format (if provided)
if (workflowId && !/^recommendation-workflow-[a-zA-Z0-9@._-]+-\d+$/.test(workflowId)) {
  return res.status(400).json({ error: 'Invalid workflowId format' });
}
```

### 3. Timeout Protection

```javascript
// Set maximum connection duration (e.g., 5 minutes)
const connectionTimeout = setTimeout(() => {
  console.log(`[SSE] Connection timeout for userId: ${userId}`);
  res.write(`data: ${JSON.stringify({
    type: 'error',
    error: {
      code: 'TIMEOUT',
      message: 'Connection timeout',
      retryable: true
    }
  })}\n\n`);
  res.end();
}, 5 * 60 * 1000);

req.on('close', () => {
  clearTimeout(connectionTimeout);
});
```

---

## Troubleshooting

### Issue: SSE Connection Immediately Closes

**Cause**: Nginx or reverse proxy buffering
**Solution**: Add `X-Accel-Buffering: no` header

```javascript
res.setHeader('X-Accel-Buffering', 'no');
```

### Issue: Events Not Received

**Cause**: Redis pub/sub not working
**Solution**: Check Redis connection and channel name

```bash
# Test Redis pub/sub
redis-cli
> SUBSCRIBE recommendation-progress
> PUBLISH recommendation-progress "test"
```

### Issue: Memory Leak

**Cause**: Connections not properly closed
**Solution**: Ensure cleanup on disconnect

```javascript
req.on('close', () => {
  subscriber.unsubscribe(channel);
  subscriber.quit();
  clearInterval(keepAliveInterval);
});
```

---

## Deployment Checklist

- [ ] Redis is accessible from BFF
- [ ] Environment variables configured
- [ ] CORS allows SSE endpoint
- [ ] Rate limiting configured
- [ ] Monitoring and logging in place
- [ ] Health check endpoint working
- [ ] Load testing completed
- [ ] Security review passed

---

## Next Steps

After BFF implementation:
1. Test SSE endpoint locally
2. Integrate with frontend
3. Test end-to-end flow
4. Deploy to staging
5. Monitor performance
6. Deploy to production