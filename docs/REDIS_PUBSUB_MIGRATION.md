# Migration: In-Memory PubSub to Redis-Based PubSub

## Problem Statement

The current BFF implementation uses `PubSub` from `graphql-subscriptions`, which is an **in-memory pub/sub**. This has several limitations:

### Current Issues with In-Memory PubSub

1. **Single Instance Only**: Only works within a single Node.js process
2. **Lost on Restart**: All subscriptions lost when BFF restarts
3. **No Horizontal Scaling**: Can't scale BFF across multiple instances
4. **Memory Leaks**: Subscriptions accumulate in memory
5. **No Persistence**: Messages lost if no active subscribers

### Current Implementation

**File**: [`C:\Work\Offering\sapphire-bff-api\src\utils\redis.js`](C:/Work/Offering/sapphire-bff-api/src/utils/redis.js)

```javascript
import { PubSub } from 'graphql-subscriptions';  // ❌ In-memory

export const pubsub = new PubSub();  // ❌ Only works in single process

// Redis subscriber receives from external Redis
await subscriber.subscribe('alerts', (message) => {
  const alert = JSON.parse(message);
  pubsub.publish('ALERTS', { alertReceived: alert });  // ❌ In-memory publish
});
```

**File**: [`C:\Work\Offering\sapphire-bff-api\src\resolvers\index.js`](C:/Work/Offering/sapphire-bff-api/src/resolvers/index.js)

```javascript
Subscription: {
  alertReceived: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(['ALERTS']),  // ❌ In-memory iterator
      (payload, variables) => {
        return payload.alertReceived.userId === variables.userId;
      }
    )
  }
}
```

---

## Solution: Use RedisPubSub

Replace `graphql-subscriptions` with `graphql-redis-subscriptions` for distributed pub/sub.

### Benefits of RedisPubSub

1. ✅ **Distributed**: Works across multiple BFF instances
2. ✅ **Persistent**: Survives service restarts
3. ✅ **Scalable**: Handles thousands of concurrent subscriptions
4. ✅ **Reliable**: Redis manages message delivery
5. ✅ **Production-Ready**: Battle-tested in production environments

---

## Migration Plan

### Step 1: Install Dependencies

```bash
cd C:\Work\Offering\sapphire-bff-api
npm install graphql-redis-subscriptions
```

### Step 2: Update `utils/redis.js`

**Before** (In-Memory):
```javascript
import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();
```

**After** (Redis-Based):
```javascript
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Create Redis clients for pub/sub
const publisherClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT
  }
});

const subscriberClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT
  }
});

// Handle errors
publisherClient.on('error', (err) => console.error('Redis Publisher Error', err));
subscriberClient.on('error', (err) => console.error('Redis Subscriber Error', err));

// Create RedisPubSub instance
export const pubsub = new RedisPubSub({
  publisher: publisherClient,
  subscriber: subscriberClient
});

export async function initializeRedisSubscriber() {
  // Connect publisher and subscriber
  await publisherClient.connect();
  await subscriberClient.connect();
  console.log('✅ Connected to Redis (Publisher & Subscriber)');

  // Create separate client for alert subscription
  const alertSubscriber = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT
    }
  });

  alertSubscriber.on('error', (err) => console.error('Redis Alert Subscriber Error', err));
  await alertSubscriber.connect();

  // Subscribe to alerts channel from external source
  await alertSubscriber.subscribe('alerts', (message) => {
    try {
      const alert = JSON.parse(message);
      console.log(`📢 Received alert for user ${alert.userId}:`, alert);
      
      // Publish to Redis-based pubsub (distributed)
      pubsub.publish('ALERTS', { alertReceived: alert });
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  });

  console.log('✅ Subscribed to Redis channel: alerts');
}
```

### Step 3: Update Resolver (No Changes Needed!)

The resolver code remains **exactly the same** because `RedisPubSub` implements the same interface as `PubSub`:

```javascript
Subscription: {
  alertReceived: {
    subscribe: withFilter(
      () => {
        console.log('🔔 New subscription to ALERTS channel');
        return pubsub.asyncIterator(['ALERTS']);  // ✅ Now uses Redis
      },
      (payload, variables) => {
        const match = payload.alertReceived.userId === variables.userId;
        if (match) {
          console.log(`✅ Alert matched for user ${variables.userId}`);
        }
        return match;
      }
    )
  }
}
```

### Step 4: Add Cleanup on Shutdown

**Add to** `src/index.js`:

```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await pubsub.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  await pubsub.close();
  process.exit(0);
});
```

---

## Complete Updated `utils/redis.js`

```javascript
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { createClient } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Create Redis clients for RedisPubSub
const publisherClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT
  }
});

const subscriberClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT
  }
});

publisherClient.on('error', (err) => console.error('Redis Publisher Error', err));
subscriberClient.on('error', (err) => console.error('Redis Subscriber Error', err));

// Create distributed RedisPubSub instance
export const pubsub = new RedisPubSub({
  publisher: publisherClient,
  subscriber: subscriberClient
});

export async function initializeRedisSubscriber() {
  // Connect RedisPubSub clients
  await publisherClient.connect();
  await subscriberClient.connect();
  console.log('✅ Connected to Redis (Publisher & Subscriber for GraphQL)');

  // Create separate client for external alert subscription
  const alertSubscriber = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT
    }
  });

  alertSubscriber.on('error', (err) => console.error('Redis Alert Subscriber Error', err));
  await alertSubscriber.connect();

  // Subscribe to alerts channel from external source
  await alertSubscriber.subscribe('alerts', (message) => {
    try {
      const alert = JSON.parse(message);
      console.log(`📢 Received alert for user ${alert.userId}:`, alert);
      
      // Publish to distributed Redis-based pubsub
      pubsub.publish('ALERTS', { alertReceived: alert });
    } catch (error) {
      console.error('Error processing Redis message:', error);
    }
  });

  console.log('✅ Subscribed to Redis channel: alerts');
}

// Made with Bob
```

---

## Testing the Migration

### 1. Unit Test

```javascript
// test/redis-pubsub.test.js
import { pubsub } from '../src/utils/redis.js';

describe('RedisPubSub', () => {
  it('should publish and receive messages across instances', async () => {
    const received = [];
    
    // Subscribe
    const subscription = pubsub.asyncIterator(['TEST_CHANNEL']);
    
    // Publish
    await pubsub.publish('TEST_CHANNEL', { message: 'Hello' });
    
    // Receive
    const result = await subscription.next();
    expect(result.value.message).toBe('Hello');
  });
});
```

### 2. Integration Test

1. Start BFF instance 1
2. Start BFF instance 2
3. Subscribe to alerts on instance 1
4. Publish alert via Redis CLI or external service
5. Verify both instances receive the alert
6. Verify GraphQL subscription on instance 1 receives filtered alert

### 3. Load Test

```bash
# Test with multiple concurrent subscriptions
artillery run load-test.yml
```

---

## Rollback Plan

If issues occur, rollback is simple:

1. Revert `utils/redis.js` to use `PubSub` from `graphql-subscriptions`
2. Restart BFF
3. No database changes needed

---

## Benefits After Migration

### Before (In-Memory)
- ❌ Single BFF instance only
- ❌ Lost on restart
- ❌ Memory accumulation
- ❌ No horizontal scaling

### After (Redis-Based)
- ✅ Multiple BFF instances
- ✅ Survives restarts
- ✅ Redis manages memory
- ✅ Horizontal scaling ready
- ✅ Production-grade reliability

---

## Recommendation Progress Integration

Once this migration is complete, the recommendation progress feature will use the **same Redis infrastructure**:

```javascript
// Both use Redis-based pub/sub
pubsub.publish('ALERTS', { alertReceived: alert });  // Existing alerts
pubsub.publish('RECOMMENDATION_PROGRESS', { progress: event });  // New progress
```

This provides a **unified, distributed pub/sub architecture** for all real-time features.

---

## Timeline

- **Step 1**: Install dependencies - 5 minutes
- **Step 2**: Update `utils/redis.js` - 15 minutes
- **Step 3**: Test locally - 30 minutes
- **Step 4**: Deploy to staging - 1 hour
- **Step 5**: Monitor and validate - 1 day
- **Step 6**: Deploy to production - 1 hour

**Total**: ~2 days including testing and monitoring

---

## Monitoring

After migration, monitor:

1. **Redis Connections**: Should see 2 connections per BFF instance (publisher + subscriber)
2. **Memory Usage**: Should remain stable (no accumulation)
3. **Subscription Count**: Track active GraphQL subscriptions
4. **Message Throughput**: Monitor pub/sub message rate
5. **Error Rate**: Watch for connection errors

---

## Conclusion

Migrating from in-memory `PubSub` to `RedisPubSub` is:

- ✅ **Simple**: Minimal code changes
- ✅ **Safe**: Same interface, easy rollback
- ✅ **Beneficial**: Enables horizontal scaling
- ✅ **Necessary**: Required for production reliability

This migration should be completed **before** implementing the recommendation progress feature to ensure a solid, distributed foundation.