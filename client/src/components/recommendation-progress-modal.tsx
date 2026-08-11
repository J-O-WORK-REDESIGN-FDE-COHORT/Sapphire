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
            {error && 'Generation could not be completed'}
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

// Made with Bob
