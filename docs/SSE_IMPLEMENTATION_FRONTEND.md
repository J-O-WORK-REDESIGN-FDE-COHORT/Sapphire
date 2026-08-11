# SSE Progress Tracking - Frontend Implementation Guide

This guide covers all frontend changes needed to implement real-time progress tracking for recommendation generation.

---

## Overview

**Files to Create**: 3 new files
**Files to Modify**: 2 existing files
**Estimated Time**: 4-6 hours

---

## File 1: Create Progress Types

**Location**: `client/src/types/progress.ts`

```typescript
/**
 * Progress event types received from SSE
 */
export interface ProgressEvent {
  type: 'connected' | 'progress' | 'complete' | 'error';
  workflowId: string;
  userId: string;
  timestamp: string;
  
  step?: StepDetails;
  percentage?: number;
  error?: ErrorDetails;
  result?: CompletionResult;
}

export interface StepDetails {
  current: number;        // 1-7
  total: number;          // 7
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface ErrorDetails {
  code: string;
  message: string;
  retryable: boolean;
  details?: any;
}

export interface CompletionResult {
  recommendationsCount: number;
  newRecommendations: number;
}

export interface PersistedProgress {
  workflowId: string;
  userId: string;
  currentStep: number;
  percentage: number;
  timestamp: number;
  isActive: boolean;
}

/**
 * Workflow step configuration
 */
export interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  icon: string;
  weight: number;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    name: 'Generating Personalized Profile',
    description: 'Analyzing your health data and wellness patterns',
    icon: 'Brain',
    weight: 20
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

## File 2: Create Progress Hook

**Location**: `client/src/hooks/useRecommendationProgress.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgressEvent, PersistedProgress, StepDetails, ErrorDetails, CompletionResult } from '@/types/progress';

const BFF_URL = import.meta.env.VITE_BFF_API_URL || 'http://localhost:4000';
const MAX_RECONNECT_ATTEMPTS = 10;
const WORKFLOW_TIMEOUT = 60000; // 60 seconds

interface UseRecommendationProgressOptions {
  userId: string;
  workflowId?: string;
  onComplete?: (result: CompletionResult) => void;
  onError?: (error: ErrorDetails) => void;
}

interface ProgressState {
  isConnected: boolean;
  isGenerating: boolean;
  currentStep: number;
  percentage: number;
  stepDetails: StepDetails | null;
  error: ErrorDetails | null;
  result: CompletionResult | null;
}

export function useRecommendationProgress({
  userId,
  workflowId,
  onComplete,
  onError
}: UseRecommendationProgressOptions) {
  const [state, setState] = useState<ProgressState>({
    isConnected: false,
    isGenerating: false,
    currentStep: 0,
    percentage: 0,
    stepDetails: null,
    error: null,
    result: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save progress to localStorage
  const saveProgress = useCallback((progress: Partial<ProgressState>) => {
    if (!userId || !workflowId) return;

    const persistedProgress: PersistedProgress = {
      workflowId,
      userId,
      currentStep: progress.currentStep || state.currentStep,
      percentage: progress.percentage || state.percentage,
      timestamp: Date.now(),
      isActive: progress.isGenerating !== false
    };

    localStorage.setItem(
      `rec-progress-${userId}`,
      JSON.stringify(persistedProgress)
    );
  }, [userId, workflowId, state.currentStep, state.percentage]);

  // Load progress from localStorage
  const loadProgress = useCallback((): PersistedProgress | null => {
    if (!userId) return null;

    const saved = localStorage.getItem(`rec-progress-${userId}`);
    if (!saved) return null;

    try {
      const progress: PersistedProgress = JSON.parse(saved);
      
      // Check if workflow is still active (within last hour)
      if (Date.now() - progress.timestamp > 3600000) {
        localStorage.removeItem(`rec-progress-${userId}`);
        return null;
      }

      return progress;
    } catch (error) {
      console.error('Error loading progress:', error);
      return null;
    }
  }, [userId]);

  // Clear progress from localStorage
  const clearProgress = useCallback(() => {
    if (!userId) return;
    localStorage.removeItem(`rec-progress-${userId}`);
  }, [userId]);

  // Handle progress event
  const handleProgressEvent = useCallback((event: ProgressEvent) => {
    console.log('Progress event received:', event);

    // Validate event is for current user
    if (event.userId !== userId) {
      console.warn('Received event for different user, ignoring');
      return;
    }

    // Filter by workflowId if tracking specific workflow
    if (workflowId && event.workflowId !== workflowId) {
      return;
    }

    switch (event.type) {
      case 'connected':
        setState(prev => ({ ...prev, isConnected: true }));
        break;

      case 'progress':
        const newState = {
          isGenerating: true,
          currentStep: event.step?.current || 0,
          percentage: event.percentage || 0,
          stepDetails: event.step || null,
          error: null
        };
        setState(prev => ({ ...prev, ...newState }));
        saveProgress(newState);
        break;

      case 'complete':
        clearProgress();
        setState(prev => ({
          ...prev,
          isGenerating: false,
          percentage: 100,
          result: event.result || null,
          error: null
        }));
        if (event.result && onComplete) {
          onComplete(event.result);
        }
        // Close connection after completion
        setTimeout(() => disconnect(), 1000);
        break;

      case 'error':
        clearProgress();
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: event.error || null
        }));
        if (event.error && onError) {
          onError(event.error);
        }
        break;
    }
  }, [userId, workflowId, onComplete, onError, saveProgress, clearProgress]);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!userId) {
      console.error('Cannot connect: userId is required');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Build SSE URL
    const url = new URL(`${BFF_URL}/sse/recommendation-progress/${userId}`);
    if (workflowId) {
      url.searchParams.set('workflowId', workflowId);
    }

    console.log('Connecting to SSE:', url.toString());

    // Create EventSource with credentials
    const eventSource = new EventSource(url.toString(), {
      withCredentials: true
    });

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      reconnectAttemptsRef.current = 0;
      setState(prev => ({ ...prev, isConnected: true }));
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data);
        handleProgressEvent(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
      
      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
        
        setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          error: {
            code: 'CONNECTION_FAILED',
            message: 'Unable to connect to server. Please refresh the page.',
            retryable: true
          }
        }));
      }
    };

    eventSourceRef.current = eventSource;

    // Set timeout for workflow
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        error: {
          code: 'TIMEOUT',
          message: 'Recommendation generation is taking longer than expected',
          retryable: false
        }
      }));
    }, WORKFLOW_TIMEOUT);
  }, [userId, workflowId, handleProgressEvent]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  // Retry connection
  const retry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setState(prev => ({ ...prev, error: null }));
    connect();
  }, [connect]);

  // Auto-connect on mount if workflow is active
  useEffect(() => {
    const savedProgress = loadProgress();
    if (savedProgress?.isActive && savedProgress.workflowId) {
      console.log('Restoring progress from localStorage:', savedProgress);
      setState(prev => ({
        ...prev,
        currentStep: savedProgress.currentStep,
        percentage: savedProgress.percentage,
        isGenerating: true
      }));
      connect();
    }
  }, [loadProgress, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    retry,
    clearProgress
  };
}
```

---

## File 3: Create Progress Modal Component

**Location**: `client/src/components/recommendation-progress-modal.tsx`

```typescript
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Check, Brain, Save, User, Search, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecommendationProgress } from '@/hooks/useRecommendationProgress';
import { WORKFLOW_STEPS, CompletionResult } from '@/types/progress';

interface RecommendationProgressModalProps {
  isOpen: boolean;
  userId: string;
  workflowId?: string;
  onClose: () => void;
  onComplete: (result: CompletionResult) => void;
}

const STEP_ICONS: Record<number, any> = {
  1: Brain,
  2: Save,
  3: User,
  4: Search,
  5: Sparkles,
  6: CheckCircle,
  7: Check
};

export function RecommendationProgressModal({
  isOpen,
  userId,
  workflowId,
  onClose,
  onComplete
}: RecommendationProgressModalProps) {
  const {
    isConnected,
    isGenerating,
    currentStep,
    percentage,
    stepDetails,
    error,
    result,
    disconnect,
    retry
  } = useRecommendationProgress({
    userId,
    workflowId,
    onComplete: (result) => {
      onComplete(result);
      setTimeout(() => onClose(), 2000);
    },
    onError: (error) => {
      console.error('Progress error:', error);
    }
  });

  const handleClose = () => {
    if (isGenerating) {
      // Allow running in background
      disconnect();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGenerating && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
            {result && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {error && <AlertCircle className="w-5 h-5 text-red-600" />}
            Generating Recommendations
          </DialogTitle>
          <DialogDescription>
            {isGenerating && 'Creating personalized wellness plans based on your health data'}
            {result && 'Your recommendations are ready!'}
            {error && 'An error occurred during generation'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Status */}
          {!isConnected && isGenerating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Connecting...</AlertTitle>
              <AlertDescription>
                Establishing connection to server
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Progress</span>
                <span className="text-gray-600">{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )}

          {/* Current Step Indicator */}
          {stepDetails && isGenerating && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="mt-0.5">
                {stepDetails.status === 'in_progress' && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                {stepDetails.status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-900">
                  {stepDetails.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {stepDetails.description}
                </p>
              </div>
            </div>
          )}

          {/* Step List */}
          {isGenerating && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {WORKFLOW_STEPS.map((step) => {
                const StepIcon = STEP_ICONS[step.id];
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const isPending = currentStep < step.id;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md transition-colors',
                      isCurrent && 'bg-blue-50',
                      isCompleted && 'opacity-60'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                        isCompleted && 'bg-green-100 text-green-700',
                        isCurrent && 'bg-blue-100 text-blue-700',
                        isPending && 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm flex-1',
                        isCurrent && 'font-medium text-gray-900',
                        !isCurrent && 'text-gray-600'
                      )}
                    >
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Issue</AlertTitle>
              <AlertDescription>
                {error.message}
                {error.retryable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retry}
                    className="mt-2 w-full"
                  >
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {result && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Success!</AlertTitle>
              <AlertDescription className="text-green-800">
                Generated {result.newRecommendations} new personalized recommendations
                {result.recommendationsCount > result.newRecommendations && (
                  <span className="block text-xs mt-1">
                    ({result.recommendationsCount - result.newRecommendations} were already in your list)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {isGenerating && !error && (
            <Button variant="outline" onClick={handleClose}>
              Run in Background
            </Button>
          )}
          {(result || error) && (
            <Button onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## File 4: Modify GraphQL Queries

**Location**: `client/src/graphql/dashboard.ts`

**Changes**:

```typescript
// Update the mutation to receive workflowId
export const GENERATE_RECOMMENDATION = gql`
  mutation GenerateRecommendation($userId: String!) {
    generateRecommendation(userId: $userId) {
      success
      message
      workflowId  # ADD THIS LINE
    }
  }
`;
```

---

## File 5: Modify My Recommendations Page

**Location**: `client/src/pages/my-recommendations.tsx`

**Changes**:

```typescript
// Add imports at the top
import { RecommendationProgressModal } from '@/components/recommendation-progress-modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PersistedProgress } from '@/types/progress';

// Add state variables (around line 543)
const [showProgressModal, setShowProgressModal] = useState(false);
const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
const [backgroundProgress, setBackgroundProgress] = useState<PersistedProgress | null>(null);

// Add function to load background progress
useEffect(() => {
  if (user?.email) {
    const saved = localStorage.getItem(`rec-progress-${user.email}`);
    if (saved) {
      try {
        const progress: PersistedProgress = JSON.parse(saved);
        if (progress.isActive && Date.now() - progress.timestamp < 3600000) {
          setBackgroundProgress(progress);
        }
      } catch (error) {
        console.error('Error loading background progress:', error);
      }
    }
  }
}, [user?.email]);

// Update handleGenerateRecommendations function (around line 624)
const handleGenerateRecommendations = async () => {
  if (!user?.email) {
    toast({
      title: "Authentication Required",
      description: "Please log in to generate recommendations.",
      variant: "destructive",
      duration: 3000,
    });
    return;
  }

  try {
    const { data } = await generateRecommendation({
      variables: { userId: user.email },
    });
    
    // Extract workflowId from response
    const workflowId = data?.generateRecommendation?.workflowId;
    
    if (workflowId) {
      setCurrentWorkflowId(workflowId);
      setShowProgressModal(true);
      setBackgroundProgress(null); // Clear any existing background progress
    } else {
      // Fallback to old behavior if workflowId not returned
      toast({
        title: "Recommendations Generation Started",
        description: "Your personalized recommendations are being generated.",
        duration: 5000,
      });
      
      setTimeout(() => {
        refetch();
      }, 3000);
    }
    
    trackEvent(AnalyticsEvents.RECOMMENDATIONS_GENERATED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Generate recommendation error:', err);
    toast({
      title: "Generation Failed",
      description: "Failed to start recommendation generation. Please try again.",
      variant: "destructive",
      duration: 5000,
    });
  }
};

// Add background progress banner (after line 786, before the Hero Section)
{backgroundProgress && (
  <Alert className="mb-6">
    <Loader2 className="h-4 w-4 animate-spin" />
    <AlertTitle>Generating Recommendations</AlertTitle>
    <AlertDescription className="flex items-center justify-between">
      <span>
        Your recommendations are being generated in the background ({backgroundProgress.percentage}% complete).
      </span>
      <Button
        variant="link"
        size="sm"
        onClick={() => {
          setCurrentWorkflowId(backgroundProgress.workflowId);
          setShowProgressModal(true);
        }}
      >
        View Progress
      </Button>
    </AlertDescription>
  </Alert>
)}

// Add progress modal (before the closing </div> of the main container, around line 977)
<RecommendationProgressModal
  isOpen={showProgressModal}
  userId={user?.email || ''}
  workflowId={currentWorkflowId || undefined}
  onClose={() => {
    setShowProgressModal(false);
    setBackgroundProgress(null);
  }}
  onComplete={(result) => {
    refetch(); // Refresh recommendations
    setBackgroundProgress(null);
    toast({
      title: "Recommendations Ready!",
      description: `Generated ${result.newRecommendations} new recommendations`,
      duration: 5000,
    });
  }}
/>
```

---

## Testing Checklist

### Unit Tests
- [ ] Test `useRecommendationProgress` hook
- [ ] Test localStorage persistence
- [ ] Test reconnection logic
- [ ] Test event filtering

### Integration Tests
- [ ] Test SSE connection establishment
- [ ] Test progress event handling
- [ ] Test error scenarios
- [ ] Test completion flow

### E2E Tests (Playwright)
- [ ] Test full recommendation generation flow
- [ ] Test progress modal display
- [ ] Test navigation persistence
- [ ] Test background indicator
- [ ] Test error handling and retry

---

## Deployment Notes

1. **Environment Variables**: Ensure `VITE_BFF_API_URL` is set correctly
2. **CORS**: BFF must allow SSE connections from frontend origin
3. **Authentication**: SSE endpoint must accept JWT tokens
4. **Browser Support**: EventSource is supported in all modern browsers

---

## Rollback Plan

If issues occur:
1. Remove progress modal from `my-recommendations.tsx`
2. Revert GraphQL mutation changes
3. Keep old toast-based notification
4. No database changes needed

---

## Next Steps

After frontend implementation:
1. Test locally with mock SSE server
2. Integrate with BFF SSE endpoint
3. Test end-to-end flow
4. Deploy to staging
5. Monitor and validate
