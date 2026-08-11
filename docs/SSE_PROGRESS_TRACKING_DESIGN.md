# SSE Progress Tracking for Recommendation Generation - Technical Design

## Executive Summary

This document outlines the technical design for implementing Server-Sent Events (SSE) with real-time progress tracking for the recommendation generation workflow. The solution provides users with visual feedback during the multi-step Temporal workflow execution, handles errors gracefully, and maintains state across navigation.

---

## Current System Analysis

### Current Flow
1. **Frontend**: User clicks "Generate Recommendations" button in [`my-recommendations.tsx`](client/src/pages/my-recommendations.tsx:624-646)
2. **GraphQL Mutation**: [`GENERATE_RECOMMENDATION`](client/src/graphql/dashboard.ts:56-63) mutation called via Apollo Client
3. **BFF Layer**: [`generateRecommendation`](C:/Work/Offering/sapphire-bff-api/src/resolvers/index.js:256-259) resolver in BFF
4. **Workflow Service**: POST to `/api/v1/recommendations/trigger` triggers Temporal workflow
5. **Temporal Workflow**: [`RecommendationWorkflowImpl`](C:/Work/Offering/recommendation-workflow-service/src/main/java/com/sapphire/recommendation/workflow/RecommendationWorkflowImpl.java:86-147) executes 7 activities
6. **Frontend**: Shows generic toast, polls for results after 3 seconds

### Current Limitations
- ❌ No real-time progress indication
- ❌ User has no visibility into workflow execution
- ❌ No error details if workflow fails
- ❌ Progress lost on navigation
- ❌ No way to track long-running workflows

---

## Workflow Steps Analysis

Based on [`RecommendationWorkflowImpl.java`](C:/Work/Offering/recommendation-workflow-service/src/main/java/com/sapphire/recommendation/workflow/RecommendationWorkflowImpl.java), the workflow has these distinct steps:

| Step | Activity | Description | Estimated Duration |
|------|----------|-------------|-------------------|
| 1 | `generateWellnessSummary` | Generate AI-based wellness summary (with fallback to rule-based) | 5-10s |
| 2 | `saveWellnessSummary` | Save wellness summary to database | 1-2s |
| 3 | `fetchUserProfile` | Fetch user profile information | 1-2s |
| 4 | `searchServices` | Search partner services based on wellness summary | 3-5s |
| 5 | `getRecommendations` | Generate recommendations from search results | 2-3s |
| 6 | `getUserRecommendations` | Fetch existing recommendations for deduplication | 1-2s |
| 7 | `saveRecommendation` | Save new recommendations (loop for each) | 1-2s per recommendation |

**Total Estimated Duration**: 15-30 seconds

---

## Proposed Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RecommendationProgressModal Component               │  │
│  │  - Progress bar with percentage                      │  │
│  │  - Step-by-step status indicators                    │  │
│  │  - Error display with retry option                   │  │
│  │  - Cancellation support                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useRecommendationProgress Hook                      │  │
│  │  - SSE connection management                         │  │
│  │  - Progress state management                         │  │
│  │  - LocalStorage persistence                          │  │
│  │  - Reconnection logic                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    BFF LAYER (Node.js)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SSE Endpoint: /sse/recommendation-progress/:userId  │  │
│  │  - Establish SSE connection                          │  │
│  │  - Subscribe to Redis channel                        │  │
│  │  - Stream progress events                            │  │
│  │  - Handle connection lifecycle                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GraphQL Mutation Enhancement                        │  │
│  │  - Return workflowId for tracking                    │  │
│  │  - Store workflow metadata in Redis                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              WORKFLOW SERVICE (Java/Spring)                 │

---

## Redis Channel Strategy: Single Global Channel

### Design Decision

Instead of using user-specific channels (`recommendation-progress:{userId}`), we use a **single global channel** (`recommendation-progress`) with client-side filtering. This approach offers several advantages:

#### Advantages
1. **Simpler Infrastructure**: Only one Redis channel to manage
2. **Easier Monitoring**: All events flow through one channel for observability
3. **Reduced Redis Overhead**: No need to create/destroy channels per user
4. **Scalable**: Works well with Redis pub/sub architecture
5. **Flexible Filtering**: Clients can filter by userId, workflowId, or both

#### Implementation Details

**Backend (Workflow Service)**
```java
// Publish to single global channel
String channel = "recommendation-progress";  // Same for all users
redisTemplate.convertAndSend(channel, eventJson);
```

**Backend (BFF SSE Endpoint)**
```javascript
// Subscribe to global channel
const channel = 'recommendation-progress';
await subscriber.subscribe(channel, (message) => {
  const event = JSON.parse(message);
  
  // Server-side validation: ensure user can only see their own events
  if (event.userId !== authenticatedUserId) {
    return; // Skip events for other users
  }
  
  // Optional: filter by workflowId if provided
  if (workflowId && event.workflowId !== workflowId) {
    return;
  }
  
  // Send to client via SSE
  res.write(`data: ${JSON.stringify(event)}\n\n`);
});
```

**Frontend (Client-side)**
```typescript
// Additional client-side filtering for safety
eventSource.onmessage = (event) => {
  const data: ProgressEvent = JSON.parse(event.data);
  
  // Double-check userId matches (defense in depth)
  if (data.userId !== currentUserId) {
    console.warn('Received event for different user, ignoring');
    return;
  }
  
  // Filter by workflowId if tracking specific workflow
  if (trackingWorkflowId && data.workflowId !== trackingWorkflowId) {
    return;
  }
  
  handleProgressEvent(data);

### Why Redis Pub/Sub (Not In-Memory)?

**Important**: This design uses **Redis Pub/Sub**, which is an **external, distributed message broker**, NOT an in-memory solution.

#### Redis Pub/Sub Characteristics

1. **External Service**: Redis runs as a separate service (not in Node.js/Java process memory)
2. **Distributed**: Multiple BFF instances can subscribe to the same channel
3. **Persistent Connection**: Redis maintains pub/sub connections independently
4. **Scalable**: Handles multiple publishers and subscribers across services
5. **Reliable**: Redis manages message delivery and connection state

#### Architecture Flow

```
Workflow Service (Java)
    ↓ publish
Redis Server (External)
    ↓ subscribe
BFF Instance 1, 2, 3... (Node.js)
    ↓ SSE stream
Frontend Clients
```

#### Why Not In-Memory Pub/Sub?

**In-memory pub/sub would fail because:**
- ❌ Only works within single process
- ❌ Lost on service restart
- ❌ Can't communicate between Workflow Service (Java) and BFF (Node.js)
- ❌ Doesn't scale across multiple BFF instances
- ❌ No persistence or recovery

**Redis Pub/Sub solves these issues:**
- ✅ Cross-service communication (Java ↔ Node.js)
- ✅ Survives service restarts (subscribers reconnect)
- ✅ Multiple BFF instances can subscribe
- ✅ Decoupled architecture
- ✅ Battle-tested for production use

#### Redis Configuration

**Workflow Service (Java)**
```yaml
# application.yml
spring:
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD}
    # Uses external Redis server
```

**BFF (Node.js)**
```javascript
// Uses existing Redis connection from utils/redis.js
import { pubsub } from '../utils/redis.js';

// pubsub is already configured to connect to external Redis
const subscriber = redis.duplicate(); // Creates new connection to Redis server
await subscriber.connect();
await subscriber.subscribe('recommendation-progress', handler);
```

#### Existing Redis Setup

The project already uses Redis for:
- Alert subscriptions (see [`utils/redis.js`](C:/Work/Offering/sapphire-bff-api/src/utils/redis.js))
- GraphQL subscriptions
- Caching

This design **reuses the same Redis infrastructure** - no new in-memory pub/sub is introduced.

};
```

#### Security Considerations

1. **Server-side Filtering**: BFF validates userId matches authenticated user
2. **Client-side Filtering**: Additional safety check on frontend
3. **No Data Leakage**: Users never receive events for other users
4. **Authentication**: JWT validation on SSE endpoint connection

#### Performance Impact

- **Network**: Minimal - BFF filters before sending to client
- **Redis**: Efficient - single channel scales well with Redis pub/sub
- **CPU**: Negligible - simple string comparison for filtering

├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Progress Publisher Service                          │  │
│  │  - Publish progress to Redis after each activity     │  │
│  │  - Include step info, percentage, status             │  │
│  │  - Handle errors and publish error events            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Enhanced RecommendationWorkflowImpl                 │  │
│  │  - Inject progress publisher                         │  │
│  │  - Publish after each activity completion            │  │
│  │  - Publish error events on failures                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    REDIS (PubSub)                           │
├─────────────────────────────────────────────────────────────┤
│  Channel: recommendation-progress (single global channel)   │
│  - All workflow progress events published here              │
│  - Client-side filtering by userId/workflowId               │
│  - TTL: 1 hour for stored progress data                     │
│  - Supports multiple subscribers                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Progress Event Schema

```typescript
interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  workflowId: string;
  userId: string;
  timestamp: string;
  
  // For progress events
  step?: {
    current: number;        // 1-7
    total: number;          // 7
    name: string;           // e.g., "Generating wellness profile"
    description: string;    // e.g., "Analyzing your health data..."
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
  
  percentage?: number;      // 0-100
  
  // For error events
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: any;
  };
  
  // For complete events
  result?: {
    recommendationsCount: number;
    newRecommendations: number;
  };
}
```

### Workflow Steps Configuration

```typescript
const WORKFLOW_STEPS = [
  {
    id: 1,
    name: 'Generating Personalized Profile',
    description: 'Analyzing your health data and wellness patterns',
    icon: 'Brain',
    weight: 20 // percentage weight
  },
  {
    id: 2,
    name: 'Saving Wellness Summary',
    description: 'Storing your personalized health insights',
    icon: 'Save',
    weight: 10
  },
  {
    id: 3,
    name: 'Fetching Profile Details',
    description: 'Retrieving your preferences and goals',
    icon: 'User',
    weight: 10
  },
  {
    id: 4,
    name: 'Searching Partner Services',
    description: 'Finding wellness programs that match your needs',
    icon: 'Search',
    weight: 25
  },
  {
    id: 5,
    name: 'Generating Recommendations',
    description: 'Creating personalized wellness plans',
    icon: 'Sparkles',
    weight: 20
  },
  {
    id: 6,
    name: 'Checking Existing Plans',
    description: 'Avoiding duplicate recommendations',
    icon: 'CheckCircle',
    weight: 5
  },
  {
    id: 7,
    name: 'Finalizing Recommendations',
    description: 'Saving your personalized wellness plans',
    icon: 'Check',
    weight: 10
  }
];
```

---

## Implementation Plan

### Phase 1: Backend Infrastructure (Workflow Service)

#### Files to Create/Modify:

1. **Create**: `ProgressPublisherService.java`
   - Location: `src/main/java/com/sapphire/recommendation/service/`
   - Purpose: Publish progress events to Redis
   - Key Methods:
     - `publishProgress(userId, workflowId, step, status)`
     - `publishComplete(userId, workflowId, result)`
     - `publishError(userId, workflowId, error)`

2. **Create**: `ProgressPublisherActivity.java` & `ProgressPublisherActivityImpl.java`
   - Location: `src/main/java/com/sapphire/recommendation/activity/`
   - Purpose: Temporal activity wrapper for progress publishing

3. **Modify**: `RecommendationWorkflowImpl.java`
   - Add progress publishing after each activity
   - Wrap activities with try-catch for error publishing

4. **Create**: Model classes for progress events
   - `ProgressEvent.java`
   - `StepDetails.java`
   - `ErrorDetails.java`

5. **Modify**: `application.yml`
   - Add Redis configuration for PubSub

### Phase 2: BFF Layer (GraphQL API)

#### Files to Create/Modify:

1. **Modify**: `src/index.js`
   - Add SSE endpoint: `GET /sse/recommendation-progress/:userId`
   - Implement Redis subscription
   - Handle SSE connection lifecycle

2. **Modify**: `src/schema/typeDefs.js`
   - Update `GenerateRecommendationResult` to include `workflowId`

3. **Modify**: `src/datasources/UsersAPI.js`
   - Update `generateRecommendation()` to return `workflowId`

4. **Modify**: `src/resolvers/index.js`
   - Update mutation resolver to return `workflowId`

### Phase 3: Frontend Implementation

#### Files to Create/Modify:

1. **Create**: `client/src/hooks/useRecommendationProgress.ts`
   - SSE connection management
   - Progress state management
   - LocalStorage persistence
   - Auto-reconnection logic

2. **Create**: `client/src/components/recommendation-progress-modal.tsx`
   - Progress bar UI
   - Step indicators
   - Error display
   - Success message

3. **Create**: `client/src/types/progress.ts`
   - TypeScript interfaces for progress events

4. **Modify**: `client/src/pages/my-recommendations.tsx`
   - Integrate progress modal
   - Handle workflow initiation
   - Show background progress indicator

5. **Modify**: `client/src/graphql/dashboard.ts`
   - Update mutation to receive `workflowId`

---

## Error Handling Strategy

### 1. Connection Errors
- **Automatic Reconnection**: Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- **Max Attempts**: 10 reconnection attempts
- **User Notification**: Show connection status in UI
- **Fallback**: Allow workflow to continue in background

### 2. Workflow Errors
- **Activity Failures**: Publish error event with retry information
- **Timeout**: 60-second timeout with background continuation option
- **Validation Errors**: Non-retryable, show clear error message
- **Network Errors**: Retryable, show retry button

### 3. State Recovery
- **LocalStorage**: Persist workflow state every update
- **TTL**: 1 hour for stored progress
- **Auto-recovery**: Reconnect on page reload if workflow active
- **Cleanup**: Clear storage on completion or expiration

---

## Navigation Persistence Solution

### Approach: LocalStorage + Background Indicator

```typescript
interface PersistedProgress {
  workflowId: string;
  userId: string;
  currentStep: number;
  percentage: number;
  timestamp: number;
  isActive: boolean;
}

// Save on every progress update
localStorage.setItem(`rec-progress-${userId}`, JSON.stringify(progress));

// Load on page mount
const savedProgress = localStorage.getItem(`rec-progress-${userId}`);

// Show background indicator if workflow active
{backgroundProgress && (
  <Alert>
    <Loader2 className="animate-spin" />
    <AlertTitle>Generating Recommendations</AlertTitle>
    <AlertDescription>
      Your recommendations are being generated ({percentage}% complete).
      <Button onClick={() => showProgressModal()}>View Progress</Button>
    </AlertDescription>
  </Alert>
)}
```

---

## Security Considerations

### 1. Authentication
- Verify JWT token on SSE endpoint
- Ensure user can only access their own progress
- Use same auth middleware as GraphQL

### 2. Authorization
- Single global Redis channel: `recommendation-progress`
- Client-side filtering by userId and workflowId
- Server validates user can only see their own events
- Rate limit SSE connections (10 per 15 minutes)

### 3. Data Sanitization
- Remove sensitive data from progress messages
- Sanitize error messages before sending to client
- No PII in progress events

---

## Performance Optimization

### 1. Redis Optimization
- Single global channel: `recommendation-progress`
- All events published to one channel
- Client-side filtering by userId/workflowId
- Set TTL on progress data (1 hour)
- Throttle progress updates (max 1 per 500ms)

### 2. Connection Management
- Limit concurrent SSE connections per user (3 max)
- Close idle connections after 5 minutes
- Implement heartbeat to detect dead connections

### 3. Event Throttling
- Batch rapid updates
- Skip intermediate progress if new update arrives
- Debounce percentage calculations

---

## Testing Strategy

### 1. Unit Tests
- `useRecommendationProgress` hook tests
- Progress calculation logic
- Error handling scenarios
- LocalStorage persistence

### 2. Integration Tests
- SSE endpoint connectivity
- Redis pub/sub functionality
- Workflow progress publishing
- End-to-end flow

### 3. E2E Tests (Playwright)
- Complete recommendation generation flow
- Progress modal display and updates
- Navigation persistence
- Error scenarios and recovery

---

## Deployment Checklist

### Prerequisites
- [ ] Redis configured with PubSub support
- [ ] BFF has Redis connection
- [ ] Workflow service has Redis connection
- [ ] CORS configured for SSE endpoint

### Environment Variables
```bash
# BFF
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<password>

# Workflow Service
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379
SPRING_REDIS_PASSWORD=<password>
```

### Deployment Steps
1. Deploy workflow service with progress publisher
2. Deploy BFF with SSE endpoint
3. Deploy frontend with progress modal
4. Test end-to-end flow
5. Monitor Redis pub/sub performance

---

## Monitoring & Observability

### Metrics to Track
- SSE connection count
- Average workflow duration
- Progress event publish rate
- Error rate by step
- Reconnection attempts

### Logging
- Log all progress events
- Log SSE connections/disconnections
- Log workflow errors with context
- Log performance metrics

### Alerts
- High error rate (>5%)
- Long workflow duration (>60s)
- High reconnection rate
- Redis connection failures

---

## Future Enhancements

### Phase 2 Features
1. **Workflow Cancellation**: Allow users to cancel in-progress workflows
2. **Multiple Workflows**: Support tracking multiple concurrent workflows
3. **Historical Progress**: Store and display past workflow executions
4. **Push Notifications**: Browser notifications on completion
5. **Estimated Time**: Show estimated time remaining
6. **Detailed Logs**: Expandable activity logs for debugging

### Phase 3 Features
1. **Analytics**: Track workflow performance and user engagement
2. **A/B Testing**: Test different progress UI variations
3. **Predictive ETA**: ML-based time estimation
4. **Workflow Insights**: Show why certain recommendations were generated

---

## Summary

This design provides a comprehensive solution for real-time progress tracking during recommendation generation:

✅ **Real-time Updates**: SSE provides instant progress feedback
✅ **Visual Progress**: Step-by-step indicators with percentage
✅ **Error Handling**: Graceful error display with retry options
✅ **Navigation Persistence**: State preserved across page navigation
✅ **GraphQL Compatible**: Works seamlessly with existing Apollo setup
✅ **Scalable**: Redis pub/sub handles multiple concurrent users
✅ **Secure**: Proper authentication and authorization
✅ **Performant**: Optimized for minimal overhead

The implementation follows best practices and integrates cleanly with the existing architecture while providing significant UX improvements.