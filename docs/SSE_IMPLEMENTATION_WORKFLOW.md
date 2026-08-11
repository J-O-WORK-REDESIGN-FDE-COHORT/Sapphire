# SSE Progress Tracking - Workflow Service Implementation Guide

This guide covers all Workflow Service (Java/Spring) changes needed to publish progress events to Redis.

---

## Overview

**Files to Create**: 6 new files
**Files to Modify**: 2 existing files
**Estimated Time**: 6-8 hours

---

## File 1: Create Progress Event Models

**Location**: `src/main/java/com/sapphire/recommendation/model/progress/ProgressEvent.java`

```java
package com.sapphire.recommendation.model.progress;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProgressEvent {
    private String type; // "progress", "complete", "error"
    private String workflowId;
    private String userId;
    private String timestamp;
    
    private StepDetails step;
    private Integer percentage;
    private ErrorDetails error;
    private Map<String, Object> result;
    
    public static ProgressEvent progress(String workflowId, String userId, StepDetails step, int percentage) {
        return ProgressEvent.builder()
                .type("progress")
                .workflowId(workflowId)
                .userId(userId)
                .timestamp(Instant.now().toString())
                .step(step)
                .percentage(percentage)
                .build();
    }
    
    public static ProgressEvent complete(String workflowId, String userId, Map<String, Object> result) {
        return ProgressEvent.builder()
                .type("complete")
                .workflowId(workflowId)
                .userId(userId)
                .timestamp(Instant.now().toString())
                .percentage(100)
                .result(result)
                .build();
    }
    
    public static ProgressEvent error(String workflowId, String userId, ErrorDetails error) {
        return ProgressEvent.builder()
                .type("error")
                .workflowId(workflowId)
                .userId(userId)
                .timestamp(Instant.now().toString())
                .error(error)
                .build();
    }
}
```

**Location**: `src/main/java/com/sapphire/recommendation/model/progress/StepDetails.java`

```java
package com.sapphire.recommendation.model.progress;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StepDetails {
    private int current;
    private int total;
    private String name;
    private String description;
    private String status; // "pending", "in_progress", "completed", "failed"
}
```

**Location**: `src/main/java/com/sapphire/recommendation/model/progress/ErrorDetails.java`

```java
package com.sapphire.recommendation.model.progress;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorDetails {
    private String code;
    private String message;
    private boolean retryable;
    private Object details;
}
```

---

## File 2: Create Progress Publisher Service

**Location**: `src/main/java/com/sapphire/recommendation/service/ProgressPublisherService.java`

```java
package com.sapphire.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sapphire.recommendation.model.progress.ErrorDetails;
import com.sapphire.recommendation.model.progress.ProgressEvent;
import com.sapphire.recommendation.model.progress.StepDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProgressPublisherService {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    
    private static final String CHANNEL = "recommendation-progress";
    private static final int TOTAL_STEPS = 7;
    
    // Workflow step configuration
    private static final Map<Integer, StepInfo> WORKFLOW_STEPS = Map.of(
        1, new StepInfo("Generating Personalized Profile", "Analyzing your health data and wellness patterns", 20),
        2, new StepInfo("Saving Wellness Summary", "Storing your personalized health insights", 10),
        3, new StepInfo("Fetching Profile Details", "Retrieving your preferences and goals", 10),
        4, new StepInfo("Searching Partner Services", "Finding wellness programs that match your needs", 25),
        5, new StepInfo("Generating Recommendations", "Creating personalized wellness plans", 20),
        6, new StepInfo("Checking Existing Plans", "Avoiding duplicate recommendations", 5),
        7, new StepInfo("Finalizing Recommendations", "Saving your personalized wellness plans", 10)
    );
    
    /**
     * Publish progress update for a workflow step
     */
    public void publishProgress(String userId, String workflowId, int step, String status) {
        try {
            StepInfo stepInfo = WORKFLOW_STEPS.get(step);
            if (stepInfo == null) {
                log.warn("Unknown step: {}", step);
                return;
            }
            
            int percentage = calculatePercentage(step, status);
            
            StepDetails stepDetails = StepDetails.builder()
                    .current(step)
                    .total(TOTAL_STEPS)
                    .name(stepInfo.getName())
                    .description(stepInfo.getDescription())
                    .status(status)
                    .build();
            
            ProgressEvent event = ProgressEvent.progress(workflowId, userId, stepDetails, percentage);
            
            publishEvent(event);
            
            // Also store in Redis with TTL for recovery
            storeProgress(workflowId, event);
            
            log.info("Published progress for userId: {}, workflowId: {}, step: {}/{}, status: {}, percentage: {}%", 
                    userId, workflowId, step, TOTAL_STEPS, status, percentage);
                    
        } catch (Exception e) {
            log.error("Error publishing progress for userId: {}, workflowId: {}", userId, workflowId, e);
        }
    }
    
    /**
     * Publish workflow completion event
     */
    public void publishComplete(String userId, String workflowId, int recommendationsCount, int newRecommendations) {
        try {
            Map<String, Object> result = Map.of(
                    "recommendationsCount", recommendationsCount,
                    "newRecommendations", newRecommendations
            );
            
            ProgressEvent event = ProgressEvent.complete(workflowId, userId, result);
            
            publishEvent(event);
            
            // Clear stored progress
            clearProgress(workflowId);
            
            log.info("Published completion for userId: {}, workflowId: {}, new: {}, total: {}", 
                    userId, workflowId, newRecommendations, recommendationsCount);
                    
        } catch (Exception e) {
            log.error("Error publishing completion for userId: {}, workflowId: {}", userId, workflowId, e);
        }
    }
    
    /**
     * Publish workflow error event
     */
    public void publishError(String userId, String workflowId, String errorCode, String errorMessage, boolean retryable) {
        try {
            ErrorDetails errorDetails = ErrorDetails.builder()
                    .code(errorCode)
                    .message(sanitizeErrorMessage(errorMessage))
                    .retryable(retryable)
                    .build();
            
            ProgressEvent event = ProgressEvent.error(workflowId, userId, errorDetails);
            
            publishEvent(event);
            
            // Clear stored progress
            clearProgress(workflowId);
            
            log.error("Published error for userId: {}, workflowId: {}, code: {}, message: {}", 
                    userId, workflowId, errorCode, errorMessage);
                    
        } catch (Exception e) {
            log.error("Error publishing error event for userId: {}, workflowId: {}", userId, workflowId, e);
        }
    }
    
    /**
     * Publish error from exception
     */
    public void publishError(String userId, String workflowId, Exception exception) {
        String errorCode = determineErrorCode(exception);
        String errorMessage = getUserFriendlyMessage(exception);
        boolean retryable = isRetryable(exception);
        
        publishError(userId, workflowId, errorCode, errorMessage, retryable);
    }
    
    /**
     * Publish event to Redis channel
     */
    private void publishEvent(ProgressEvent event) {
        try {
            String message = objectMapper.writeValueAsString(event);
            redisTemplate.convertAndSend(CHANNEL, message);
        } catch (Exception e) {
            log.error("Error publishing event to Redis", e);
        }
    }
    
    /**
     * Store progress in Redis with TTL for recovery
     */
    private void storeProgress(String workflowId, ProgressEvent event) {
        try {
            String key = "workflow-progress:" + workflowId;
            String value = objectMapper.writeValueAsString(event);
            redisTemplate.opsForValue().set(key, value, Duration.ofHours(1));
        } catch (Exception e) {
            log.error("Error storing progress in Redis", e);
        }
    }
    
    /**
     * Clear stored progress
     */
    private void clearProgress(String workflowId) {
        try {
            String key = "workflow-progress:" + workflowId;
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.error("Error clearing progress from Redis", e);
        }
    }
    
    /**
     * Calculate percentage based on step and status
     */
    private int calculatePercentage(int step, String status) {
        int basePercentage = 0;
        
        // Add weight of all completed steps
        for (int i = 1; i < step; i++) {
            StepInfo info = WORKFLOW_STEPS.get(i);
            if (info != null) {
                basePercentage += info.getWeight();
            }
        }
        
        // Add partial weight for current step
        StepInfo currentStepInfo = WORKFLOW_STEPS.get(step);
        if (currentStepInfo != null) {
            if ("completed".equals(status)) {
                basePercentage += currentStepInfo.getWeight();
            } else if ("in_progress".equals(status)) {
                basePercentage += currentStepInfo.getWeight() / 2;
            }
        }
        
        return Math.min(basePercentage, 100);
    }
    
    /**
     * Determine error code from exception
     */
    private String determineErrorCode(Exception e) {
        String className = e.getClass().getSimpleName();
        
        if (className.contains("Timeout")) {
            return "TIMEOUT";
        } else if (className.contains("Network") || className.contains("Connection")) {
            return "NETWORK_ERROR";
        } else if (className.contains("Validation")) {
            return "VALIDATION_ERROR";
        } else if (className.contains("Authentication") || className.contains("Authorization")) {
            return "AUTH_ERROR";
        } else if (className.contains("ActivityFailure")) {
            return "ACTIVITY_FAILED";
        }
        
        return "WORKFLOW_ERROR";
    }
    
    /**
     * Get user-friendly error message
     */
    private String getUserFriendlyMessage(Exception e) {
        String message = e.getMessage();
        
        if (message == null || message.isEmpty()) {
            return "An unexpected error occurred during recommendation generation.";
        }
        
        // Sanitize technical details
        message = sanitizeErrorMessage(message);
        
        // Provide user-friendly messages for common errors
        if (message.contains("timeout")) {
            return "The recommendation generation is taking longer than expected. Please try again.";
        } else if (message.contains("network") || message.contains("connection")) {
            return "Unable to connect to required services. Please check your connection and try again.";
        } else if (message.contains("validation")) {
            return "Invalid data provided. Please check your profile and try again.";
        }
        
        return "An error occurred while generating recommendations. Please try again.";
    }
    
    /**
     * Determine if exception is retryable
     */
    private boolean isRetryable(Exception e) {
        String className = e.getClass().getSimpleName();
        
        // Non-retryable errors
        if (className.contains("Validation") || 
            className.contains("Authentication") || 
            className.contains("Authorization")) {
            return false;
        }
        
        // Retryable errors
        return true;
    }
    
    /**
     * Sanitize error message to remove sensitive information
     */
    private String sanitizeErrorMessage(String message) {
        if (message == null) {
            return "";
        }
        
        // Remove email addresses
        message = message.replaceAll("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b", "[email]");
        
        // Remove URLs
        message = message.replaceAll("https?://[^\\s]+", "[url]");
        
        // Remove stack traces
        if (message.contains("at ")) {
            message = message.substring(0, message.indexOf("at "));
        }
        
        return message.trim();
    }
    
    /**
     * Step information holder
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    private static class StepInfo {
        private String name;
        private String description;
        private int weight;
    }
}
```

---

## File 3: Create Progress Publisher Activity

**Location**: `src/main/java/com/sapphire/recommendation/activity/ProgressPublisherActivity.java`

```java
package com.sapphire.recommendation.activity;

import io.temporal.activity.ActivityInterface;
import io.temporal.activity.ActivityMethod;

@ActivityInterface
public interface ProgressPublisherActivity {
    
    @ActivityMethod
    void publishProgress(String userId, String workflowId, int step, String status);
    
    @ActivityMethod
    void publishComplete(String userId, String workflowId, int recommendationsCount, int newRecommendations);
    
    @ActivityMethod
    void publishError(String userId, String workflowId, String errorCode, String errorMessage, boolean retryable);
}
```

**Location**: `src/main/java/com/sapphire/recommendation/activity/impl/ProgressPublisherActivityImpl.java`

```java
package com.sapphire.recommendation.activity.impl;

import com.sapphire.recommendation.activity.ProgressPublisherActivity;
import com.sapphire.recommendation.service.ProgressPublisherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class ProgressPublisherActivityImpl implements ProgressPublisherActivity {
    
    private final ProgressPublisherService progressPublisherService;
    
    @Override
    public void publishProgress(String userId, String workflowId, int step, String status) {
        log.debug("Publishing progress: userId={}, workflowId={}, step={}, status={}", 
                userId, workflowId, step, status);
        progressPublisherService.publishProgress(userId, workflowId, step, status);
    }
    
    @Override
    public void publishComplete(String userId, String workflowId, int recommendationsCount, int newRecommendations) {
        log.debug("Publishing completion: userId={}, workflowId={}, new={}, total={}", 
                userId, workflowId, newRecommendations, recommendationsCount);
        progressPublisherService.publishComplete(userId, workflowId, recommendationsCount, newRecommendations);
    }
    
    @Override
    public void publishError(String userId, String workflowId, String errorCode, String errorMessage, boolean retryable) {
        log.debug("Publishing error: userId={}, workflowId={}, code={}", 
                userId, workflowId, errorCode);
        progressPublisherService.publishError(userId, workflowId, errorCode, errorMessage, retryable);
    }
}
```

---

## File 4: Update Workflow Implementation

**Location**: `src/main/java/com/sapphire/recommendation/workflow/RecommendationWorkflowImpl.java`

**Add progress publisher activity stub** (after line 83):

```java
private final ProgressPublisherActivity progressPublisher =
        Workflow.newActivityStub(ProgressPublisherActivity.class, ACTIVITY_OPTIONS);
```

**Update `executeRecommendationWorkflow` method** (replace existing method):

```java
@Override
public void executeRecommendationWorkflow(String userId) {
    String workflowId = Workflow.getInfo().getWorkflowId();
    
    Workflow.getLogger(RecommendationWorkflowImpl.class)
            .info("Starting recommendation workflow for userId: {}, workflowId: {}", userId, workflowId);
    
    try {
        // Step 1: Generate wellness summary
        progressPublisher.publishProgress(userId, workflowId, 1, "in_progress");
        WellnessSummaryResponse wellnessSummary;
        try {
            wellnessSummary = generateWellnessSummaryAiActivity.generateWellnessSummary(userId, AI_BASED);
        } catch (ActivityFailure ex) {
            Workflow.getLogger(RecommendationWorkflowImpl.class)
                    .warn("AI-based wellness summary failed, falling back to rule-based for userId: {}", userId);
            wellnessSummary = generateWellnessSummaryRuleBasedActivity.generateWellnessSummary(userId, RULE_BASED);
        }
        progressPublisher.publishProgress(userId, workflowId, 1, "completed");
        
        // Step 2: Save wellness summary
        progressPublisher.publishProgress(userId, workflowId, 2, "in_progress");
        SaveWellnessSummaryRequest saveSummaryRequest = SaveWellnessSummaryRequest.builder()
                .profileSummary(wellnessSummary.getProfileSummary())
                .dataSummary(wellnessSummary.getDataSummary())
                .build();
        saveWellnessSummaryActivity.saveWellnessSummary(userId, saveSummaryRequest);
        progressPublisher.publishProgress(userId, workflowId, 2, "completed");
        
        // Step 3: Fetch user profile
        progressPublisher.publishProgress(userId, workflowId, 3, "in_progress");
        UserProfileResponse userProfile = userProfileActivity.fetchUserProfile(userId);
        String systemUserId = userProfile.getUserId();
        progressPublisher.publishProgress(userId, workflowId, 3, "completed");
        
        // Step 4: Search services
        progressPublisher.publishProgress(userId, workflowId, 4, "in_progress");
        String keywordForSearch = (wellnessSummary.getProfileKeywords() != null
                && !wellnessSummary.getProfileKeywords().isBlank())
                ? wellnessSummary.getProfileKeywords()
                : wellnessSummary.getProfileSummary();
        ServiceSearchResponse serviceSearchResponse =
                serviceSearchActivity.searchServices(keywordForSearch, wellnessSummary.getDataSummary());
        progressPublisher.publishProgress(userId, workflowId, 4, "completed");
        
        // Step 5: Get recommendations
        progressPublisher.publishProgress(userId, workflowId, 5, "in_progress");
        List<Recommendation> incomingRecommendations =
                recommendationActivity.getRecommendations(wellnessSummary, serviceSearchResponse);
        progressPublisher.publishProgress(userId, workflowId, 5, "completed");
        
        // Step 6: Get existing recommendations
        progressPublisher.publishProgress(userId, workflowId, 6, "in_progress");
        List<UserRecommendation> existingRecommendations =
                userSearchActivity.getUserRecommendations(userId);
        List<Recommendation> newRecommendations =
                deduplicate(incomingRecommendations, existingRecommendations);
        progressPublisher.publishProgress(userId, workflowId, 6, "completed");
        
        Workflow.getLogger(RecommendationWorkflowImpl.class)
                .info("Deduplication complete. New recommendations: {}, Total: {} for userId: {}",
                        newRecommendations.size(), incomingRecommendations.size(), userId);
        
        // Step 7: Save recommendations
        if (!newRecommendations.isEmpty()) {
            progressPublisher.publishProgress(userId, workflowId, 7, "in_progress");
            for (Recommendation recommendation : newRecommendations) {
                userUpdateActivity.saveRecommendation(userId, toUserUpdateRequest(recommendation));
            }
            progressPublisher.publishProgress(userId, workflowId, 7, "completed");
        } else {
            Workflow.getLogger(RecommendationWorkflowImpl.class)
                    .info("No new recommendations to save for userId: {}", userId);
        }
        
        // Publish completion
        progressPublisher.publishComplete(userId, workflowId, 
                incomingRecommendations.size(), newRecommendations.size());
        
        Workflow.getLogger(RecommendationWorkflowImpl.class)
                .info("Recommendation workflow completed successfully for userId: {}, workflowId: {}", 
                        userId, workflowId);
                
    } catch (Exception e) {
        Workflow.getLogger(RecommendationWorkflowImpl.class)
                .error("Recommendation workflow failed for userId: {}, workflowId: {}", 
                        userId, workflowId, e);
        
        // Publish error event
        String errorCode = e.getClass().getSimpleName();
        String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown error";
        progressPublisher.publishError(userId, workflowId, errorCode, errorMessage, true);
        
        throw e;
    }
}
```

---

## File 5: Update Worker Configuration

**Location**: `src/main/java/com/sapphire/recommendation/worker/RecommendationWorkerConfig.java`

**Add ProgressPublisherActivityImpl to worker** (in the worker registration):

```java
@Bean
public WorkerFactory workerFactory(
        WorkflowClient workflowClient,
        GenerateWellnessSummaryActivityImpl generateWellnessSummaryActivity,
        SaveWellnessSummaryActivityImpl saveWellnessSummaryActivity,
        UserProfileActivityImpl userProfileActivity,
        ServiceSearchActivityImpl serviceSearchActivity,
        RecommendationActivityImpl recommendationActivity,
        UserSearchActivityImpl userSearchActivity,
        UserUpdateActivityImpl userUpdateActivity,
        ProgressPublisherActivityImpl progressPublisherActivity) {  // ADD THIS
    
    WorkerFactory factory = WorkerFactory.newInstance(workflowClient);
    Worker worker = factory.newWorker(taskQueue);
    
    worker.registerWorkflowImplementationTypes(RecommendationWorkflowImpl.class);
    worker.registerActivitiesImplementations(
            generateWellnessSummaryActivity,
            saveWellnessSummaryActivity,
            userProfileActivity,
            serviceSearchActivity,
            recommendationActivity,
            userSearchActivity,
            userUpdateActivity,
            progressPublisherActivity  // ADD THIS
    );
    
    return factory;
}
```

---

## File 6: Update Application Configuration

**Location**: `src/main/resources/application.yml`

**Add Redis configuration** (if not already present):

```yaml
spring:
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    timeout: 2000ms
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
        max-wait: -1ms
```

**Add Redis configuration bean** if needed:

**Location**: `src/main/java/com/sapphire/recommendation/config/RedisConfig.java`

```java
package com.sapphire.recommendation.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {
    
    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        return template;
    }
    
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
```

---

## Testing

### 1. Unit Tests

**Location**: `src/test/java/com/sapphire/recommendation/service/ProgressPublisherServiceTest.java`

```java
package com.sapphire.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProgressPublisherServiceTest {
    
    @Mock
    private RedisTemplate<String, String> redisTemplate;
    
    @Mock
    private ValueOperations<String, String> valueOperations;
    
    private ProgressPublisherService progressPublisherService;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        progressPublisherService = new ProgressPublisherService(redisTemplate, new ObjectMapper());
    }
    
    @Test
    void shouldPublishProgressEvent() {
        // Given
        String userId = "test@example.com";
        String workflowId = "workflow-123";
        int step = 1;
        String status = "in_progress";
        
        // When
        progressPublisherService.publishProgress(userId, workflowId, step, status);
        
        // Then
        verify(redisTemplate).convertAndSend(eq("recommendation-progress"), anyString());
        verify(valueOperations).set(eq("workflow-progress:" + workflowId), anyString(), any());
    }
    
    @Test
    void shouldPublishCompleteEvent() {
        // Given
        String userId = "test@example.com";
        String workflowId = "workflow-123";
        
        // When
        progressPublisherService.publishComplete(userId, workflowId, 5, 3);
        
        // Then
        verify(redisTemplate).convertAndSend(eq("recommendation-progress"), anyString());
        verify(redisTemplate).delete("workflow-progress:" + workflowId);
    }
    
    @Test
    void shouldPublishErrorEvent() {
        // Given
        String userId = "test@example.com";
        String workflowId = "workflow-123";
        
        // When
        progressPublisherService.publishError(userId, workflowId, "ERROR", "Test error", true);
        
        // Then
        verify(redisTemplate).convertAndSend(eq("recommendation-progress"), anyString());
        verify(redisTemplate).delete("workflow-progress:" + workflowId);
    }
}
```

### 2. Integration Test

```java
@SpringBootTest
class ProgressPublisherIntegrationTest {
    
    @Autowired
    private ProgressPublisherService progressPublisherService;
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Test
    void shouldPublishAndReceiveProgressEvent() throws Exception {
        // Subscribe to channel
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();
        
        redisTemplate.execute((RedisCallback<Void>) connection -> {
            connection.subscribe((message, pattern) -> {
                receivedMessage.set(new String(message.getBody()));
                latch.countDown();
            }, "recommendation-progress".getBytes());
            return null;
        });
        
        // Publish event
        progressPublisherService.publishProgress("test@example.com", "workflow-123", 1, "in_progress");
        
        // Wait for message
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertNotNull(receivedMessage.get());
        assertTrue(receivedMessage.get().contains("in_progress"));
    }
}
```

---

## Deployment Checklist

- [ ] Redis dependency added to pom.xml
- [ ] Redis configuration in application.yml
- [ ] All new classes created
- [ ] Workflow implementation updated
- [ ] Worker configuration updated
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Redis connection verified
- [ ] Progress events publishing correctly

---

## Monitoring

### Key Metrics

1. **Progress Events Published**: Count of events per workflow
2. **Event Publish Latency**: Time to publish to Redis
3. **Failed Publications**: Count of failed Redis publishes
4. **Workflow Duration**: Time from start to completion
5. **Error Rate**: Percentage of workflows that fail

### Logging

```java
log.info("Progress published: userId={}, workflowId={}, step={}, percentage={}", 
        userId, workflowId, step, percentage);
```

---

## Troubleshooting

### Issue: Events Not Publishing

**Check**: Redis connection
```bash
redis-cli ping
```

**Check**: Redis logs
```bash
redis-cli monitor
```

### Issue: Workflow Fails After Adding Progress

**Check**: Activity registration in worker
**Check**: Activity timeout configuration
**Check**: Redis connection timeout

---

## Next Steps

After workflow service implementation:
1. Test locally with Redis
2. Verify events are published
3. Integrate with BFF
4. Test end-to-end flow
5. Deploy to staging
6. Monitor performance