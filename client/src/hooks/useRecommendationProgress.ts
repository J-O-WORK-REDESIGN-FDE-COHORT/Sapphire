import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgressEvent, PersistedProgress, StepDetails, ErrorDetails, CompletionResult } from '@/types/progress';
import { useAuth } from './useAuth';

// Use BASE_URL for SSE endpoint (not the GraphQL-specific API_URL)
const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || 'http://localhost:4000';
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
  const { accessToken } = useAuth();
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
  const hasConnectedRef = useRef(false);

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
        setState(prev => ({ ...prev, isConnected: true, isGenerating: true, error: null, result: null }));
        break;

      case 'progress':
        const newState = {
          isGenerating: true,
          currentStep: event.step?.current || 0,
          percentage: event.percentage || 0,
          stepDetails: event.step || null,
          error: null,
          result: null
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
          error: event.error || null,
          result: null
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

    if (!workflowId) {
      console.error('Cannot connect: workflowId is required');
      return;
    }

    if (!accessToken) {
      console.error('Cannot connect: accessToken is required');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // If we're reconnecting to an in-flight workflow (e.g. after navigating back to
    // this page), pre-fill the last-known step/percentage so the UI doesn't flash 0%.
    const persisted = loadProgress();
    const isReconnecting = persisted?.workflowId === workflowId && persisted?.isActive === true;

    setState(prev => ({
      ...prev,
      isConnected: false,
      isGenerating: true,
      currentStep: isReconnecting ? persisted!.currentStep : 0,
      percentage: isReconnecting ? persisted!.percentage : 0,
      stepDetails: null,
      error: null,
      result: null
    }));

    // Build SSE URL with token as query param (EventSource doesn't support custom headers)
    const url = new URL(`${BFF_BASE_URL}/sse/recommendation-progress/${userId}`);
    url.searchParams.set('workflowId', workflowId);
    url.searchParams.set('token', accessToken);

    console.log('Connecting to SSE:', url.toString().replace(accessToken, '***'));

    // Create EventSource
    const eventSource = new EventSource(url.toString());

    eventSource.onopen = () => {
      console.log('[SSE Client] Connection opened successfully');
      reconnectAttemptsRef.current = 0;
      setState(prev => ({ ...prev, isConnected: true }));
    };

    eventSource.onmessage = (event) => {
      console.log('[SSE Client] Message received:', event.data);
      try {
        const data: ProgressEvent = JSON.parse(event.data);
        console.log('[SSE Client] Parsed event:', data);
        handleProgressEvent(data);
      } catch (error) {
        console.error('[SSE Client] Error parsing SSE message:', error, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE Client] Connection error:', error);
      console.log('[SSE Client] EventSource readyState:', eventSource.readyState);
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
  }, [userId, workflowId, accessToken, handleProgressEvent]);

  // Auto-connect when workflowId is provided (only once)
  useEffect(() => {
    if (workflowId && accessToken && !hasConnectedRef.current && !eventSourceRef.current) {
      console.log('Auto-connecting to SSE with workflowId:', workflowId);
      hasConnectedRef.current = true;
      connect();
    }
  }, [workflowId, accessToken, connect]);

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
    hasConnectedRef.current = false;
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  // Retry connection
  const retry = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setState(prev => ({ ...prev, error: null }));
    connect();
  }, [connect]);

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

// Made with Bob
