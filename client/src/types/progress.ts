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

// Made with Bob
