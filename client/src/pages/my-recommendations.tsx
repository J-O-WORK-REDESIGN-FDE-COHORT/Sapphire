import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Heart, Activity, Moon, Brain, Apple, Droplet, Target, Sparkles, TrendingUp, Calendar, CheckCircle2, Clock, ChevronRight, Filter, Star, Building2, DollarSign, Users, Award, Info, Zap, BarChart3, ShoppingCart, Bookmark, RefreshCw, Loader2 } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { GET_USER_RECOMMENDATIONS, GENERATE_RECOMMENDATION } from "@/graphql/dashboard";
import { SUBSCRIBE_TO_SERVICE, GET_USER_SUBSCRIPTIONS } from "@/graphql/partners";
import { useToast } from "@/hooks/use-toast";
import { useRecommendationProgress } from "@/hooks/useRecommendationProgress";

// GraphQL Response Types
interface UserRecommendationMetadata {
  labels: {
    priority: string;
    difficulty: string;
  };
  tags: string[];
  annotations: {
    lastUpdatedBy: string;
    matchAlgorithm: string;
    telemetrySource: string;
    partnerServiceCode: string;
    recommendationEngineVersion: string;
  };
}

interface PartnerServiceLabels {
  duration: string;
  ageGroup: string;
  difficulty: string;
}

interface PartnerServiceAnnotations {
  sla: string;
  contentOwner: string;
}

interface PartnerServiceLink {
  rel: string;
  href: string;
}

interface PartnerService {
  serviceId: string;
  serviceCode: string;
  name: string;
  category: string;
  serviceType: string;
  description: string;
  status: string;
  labels: PartnerServiceLabels;
  annotations: PartnerServiceAnnotations;
  tags: string[];
  links: PartnerServiceLink[];
}

interface RecommendationSpec {
  recommendation: {
    relevanceScore: number;
    generatedAt: number;
  };
  partnerService: PartnerService;
}

interface UserRecommendationResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  metadata: UserRecommendationMetadata;
  spec: RecommendationSpec;
}

interface GetUserRecommendationsData {
  userRecommendations: UserRecommendationResponse[];
}

interface WellnessPartner {
  id: string;
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
  specialization: string;
  verified: boolean;
}

interface PricingTier {
  type: 'free' | 'premium';
  price: number;
  duration: string;
  features: string[];
}

interface Recommendation {
  id: string;
  category: 'heart' | 'activity' | 'sleep' | 'stress' | 'nutrition' | 'hydration';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  matchScore: number; // 0-100
  telemetryReason: string; // Why this was recommended based on user data
  impact: string;
  timeframe: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  actionItems: string[];
  benefits: string[];
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
  
  // Wellness Partner Integration
  partner: WellnessPartner;
  pricing: PricingTier[];
  enrollmentCount: number; // How many users enrolled
  successRate: number; // Percentage of users who completed
}

const sampleRecommendations: Recommendation[] = [
  {
    id: '1',
    category: 'heart',
    title: 'CardioFit Pro - Heart Health Optimization Program',
    description: 'A comprehensive 8-week program designed to improve cardiovascular health through personalized exercise routines, nutrition guidance, and stress management techniques.',
    priority: 'high',
    matchScore: 94,
    telemetryReason: 'Your heart rate variability has decreased by 12% over the past 2 weeks, and resting heart rate is 8 bpm above your baseline. This program can help restore optimal cardiovascular function.',
    impact: 'High - Can improve cardiovascular health by 15-20%',
    timeframe: '8 weeks program',
    difficulty: 'moderate',
    actionItems: [
      'Complete initial cardiovascular assessment with certified trainer',
      'Follow personalized 4x weekly cardio workout plan',
      'Attend weekly virtual coaching sessions',
      'Track daily heart rate metrics and submit weekly reports'
    ],
    benefits: [
      'Improved heart rate variability',
      'Lower resting heart rate',
      'Better cardiovascular endurance',
      'Reduced risk of heart disease'
    ],
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    partner: {
      id: 'p1',
      name: 'HeartWise Wellness Center',
      logo: '❤️',
      rating: 4.8,
      reviewCount: 1247,
      specialization: 'Cardiovascular Health',
      verified: true
    },
    pricing: [
      {
        type: 'free',
        price: 0,
        duration: '2 weeks trial',
        features: ['Basic workout plans', 'Weekly progress tracking', 'Community forum access']
      },
      {
        type: 'premium',
        price: 149,
        duration: '8 weeks',
        features: ['Personalized workout plans', 'Daily progress tracking', '1-on-1 coaching sessions', 'Nutrition guidance', 'Priority support', 'Certificate of completion']
      }
    ],
    enrollmentCount: 3421,
    successRate: 87
  },
  {
    id: '2',
    category: 'activity',
    title: 'ActiveLife Movement Mastery',
    description: 'Transform your daily activity levels with this science-backed program that makes movement a natural part of your lifestyle through habit formation and progressive challenges.',
    priority: 'high',
    matchScore: 89,
    telemetryReason: 'Your average daily step count (4,200 steps) is 45% below recommended levels. Your sedentary time has increased by 3 hours/day in the last month.',
    impact: 'High - Can increase energy levels by 25%',
    timeframe: '6 weeks program',
    difficulty: 'easy',
    actionItems: [
      'Set personalized daily step goals with gradual progression',
      'Complete 3 guided movement sessions per week',
      'Join weekly group challenges and accountability circles',
      'Use gamification features to track streaks and earn rewards'
    ],
    benefits: [
      'Increased daily energy and vitality',
      'Better weight management',
      'Improved mood and mental clarity',
      'Stronger muscles and bones'
    ],
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    partner: {
      id: 'p2',
      name: 'MoveFit Studios',
      logo: '🏃',
      rating: 4.9,
      reviewCount: 2156,
      specialization: 'Movement & Fitness',
      verified: true
    },
    pricing: [
      {
        type: 'free',
        price: 0,
        duration: 'Forever',
        features: ['Basic step tracking', 'Weekly challenges', 'Community support']
      },
      {
        type: 'premium',
        price: 99,
        duration: '6 weeks',
        features: ['Personalized activity plans', 'Live group sessions', 'Advanced analytics', 'Personal coach check-ins', 'Custom challenges', 'Achievement badges']
      }
    ],
    enrollmentCount: 5678,
    successRate: 92
  },
  {
    id: '3',
    category: 'sleep',
    title: 'RestWell Sleep Optimization System',
    description: 'Evidence-based sleep improvement program combining cognitive behavioral therapy for insomnia (CBT-I), sleep hygiene education, and relaxation techniques.',
    priority: 'medium',
    matchScore: 85,
    telemetryReason: 'Your sleep efficiency is at 72% (optimal is 85%+). You\'re experiencing 4-5 wake episodes per night, and deep sleep accounts for only 12% of total sleep time.',
    impact: 'Medium - Can improve sleep quality by 30%',
    timeframe: '4 weeks program',
    difficulty: 'easy',
    actionItems: [
      'Complete sleep assessment and receive personalized sleep schedule',
      'Follow daily wind-down routine with guided relaxation',
      'Implement bedroom optimization recommendations',
      'Track sleep metrics and adjust plan weekly with sleep coach'
    ],
    benefits: [
      'Better morning alertness and energy',
      'Improved memory and cognitive function',
      'Enhanced physical recovery',
      'Stronger immune system'
    ],
    icon: Moon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    partner: {
      id: 'p3',
      name: 'DreamScape Sleep Institute',
      logo: '🌙',
      rating: 4.7,
      reviewCount: 892,
      specialization: 'Sleep Medicine',
      verified: true
    },
    pricing: [
      {
        type: 'free',
        price: 0,
        duration: '1 week trial',
        features: ['Sleep tracking', 'Basic sleep tips', 'Relaxation audio library']
      },
      {
        type: 'premium',
        price: 129,
        duration: '4 weeks',
        features: ['CBT-I program', 'Personal sleep coach', 'Custom sleep schedule', 'Advanced sleep analytics', 'Unlimited relaxation content', 'Sleep environment consultation']
      }
    ],
    enrollmentCount: 2341,
    successRate: 88
  },
  {
    id: '4',
    category: 'stress',
    title: 'MindBalance Stress Resilience Training',
    description: 'Comprehensive stress management program integrating mindfulness, cognitive reframing, and evidence-based relaxation techniques to build lasting resilience.',
    priority: 'high',
    matchScore: 91,
    telemetryReason: 'Your stress biomarkers show elevated cortisol patterns. Heart rate variability indicates chronic stress response. You\'ve had 18 high-stress episodes in the past week.',
    impact: 'High - Can reduce stress levels by 40%',
    timeframe: '6 weeks program',
    difficulty: 'moderate',
    actionItems: [
      'Complete stress assessment and identify personal triggers',
      'Practice daily 15-minute guided mindfulness meditation',
      'Attend bi-weekly live stress management workshops',
      'Implement personalized coping strategies with therapist support'
    ],
    benefits: [
      'Lower anxiety and stress levels',
      'Better emotional regulation',
      'Improved relationships and communication',
      'Enhanced work performance and focus'
    ],
    icon: Brain,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    partner: {
      id: 'p4',
      name: 'Serenity Mind Wellness',
      logo: '🧠',
      rating: 4.9,
      reviewCount: 1567,
      specialization: 'Mental Health & Stress',
      verified: true
    },
    pricing: [
      {
        type: 'free',
        price: 0,
        duration: '2 weeks trial',
        features: ['Basic meditation library', 'Stress tracking', 'Community forums']
      },
      {
        type: 'premium',
        price: 179,
        duration: '6 weeks',
        features: ['Personal therapist sessions', 'Custom stress plan', 'Live workshops', 'Advanced biofeedback', '24/7 crisis support', 'Lifetime resource access']
      }
    ],
    enrollmentCount: 4123,
    successRate: 89
  },
  {
    id: '5',
    category: 'nutrition',
    title: 'NutriOptimal Personalized Nutrition Plan',
    description: 'Data-driven nutrition program tailored to your metabolic profile, activity levels, and health goals with ongoing support from registered dietitians.',
    priority: 'medium',
    matchScore: 82,
    telemetryReason: 'Your energy levels show significant afternoon crashes. Body composition analysis suggests suboptimal protein intake. Hydration patterns indicate inconsistent nutrition timing.',
    impact: 'Medium - Can improve energy by 20%',
    timeframe: '8 weeks program',
    difficulty: 'moderate',
    actionItems: [
      'Complete metabolic assessment and food preference survey',
      'Receive personalized meal plans with grocery lists',
      'Log meals and get real-time feedback from dietitian',
      'Attend weekly nutrition education webinars'
    ],
    benefits: [
      'Better muscle recovery and growth',
      'Improved cognitive function',
      'Enhanced immune system',
      'Sustained energy throughout day'
    ],
    icon: Apple,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    partner: {
      id: 'p5',
      name: 'VitalNutrition Experts',
      logo: '🍎',
      rating: 4.8,
      reviewCount: 1834,
      specialization: 'Clinical Nutrition',
      verified: true
    },
    pricing: [
      {
        type: 'free',
        price: 0,
        duration: '1 week trial',
        features: ['Basic meal plans', 'Calorie tracking', 'Recipe library']
      },
      {
        type: 'premium',
        price: 199,
        duration: '8 weeks',
        features: ['Personalized meal plans', 'Registered dietitian support', 'Metabolic testing', 'Supplement guidance', 'Grocery delivery integration', 'Progress photos & analytics']
      }
    ],
    enrollmentCount: 3789,
    successRate: 85
  },
  {
    id: '6',
    category: 'hydration',
    title: 'HydroBalance Optimal Hydration System',
    description: 'Smart hydration program that optimizes your fluid intake based on activity, climate, and individual needs for peak performance.',
    priority: 'low',
    matchScore: 76,
    telemetryReason: 'Your hydration patterns show inconsistent intake. Morning dehydration markers detected. Post-workout recovery is slower than optimal, suggesting inadequate rehydration.',
    impact: 'Medium - Can improve performance by 10-15%',
    timeframe: '3 weeks program',
    difficulty: 'easy',
    actionItems: [
      'Set up smart hydration reminders based on your schedule',
      'Track fluid intake with connected water bottle',
      'Learn optimal hydration timing for workouts',
      'Receive personalized electrolyte recommendations'
    ],
    benefits: [
      'Better physical performance',
      'Improved skin health and appearance',
      'Enhanced digestion',
      'Reduced fatigue and headaches'
    ],
    icon: Droplet,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    partner: {
      id: 'p6',
      name: 'AquaVital Hydration Lab',
      logo: '💧',
      rating: 4.6,
      reviewCount: 678,
      specialization: 'Sports Hydration',
      verified: true
    },
    pricing: [
      {
        type: 'free',
        price: 0,
        duration: 'Forever',
        features: ['Basic hydration tracking', 'Reminder notifications', 'Daily tips']
      },
      {
        type: 'premium',
        price: 79,
        duration: '3 weeks',
        features: ['Smart bottle integration', 'Personalized hydration plan', 'Electrolyte optimization', 'Performance analytics', 'Climate-based adjustments', 'Lifetime plan access']
      }
    ],
    enrollmentCount: 2156,
    successRate: 94
  }
];

const priorityConfig = {
  high: { label: 'High Priority', color: 'bg-red-100 text-red-800 border-red-300' },
  medium: { label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  low: { label: 'Low Priority', color: 'bg-green-100 text-green-800 border-green-300' }
};

const difficultyConfig: Record<string, { label: string; color: string; icon: string }> = {
  easy: { label: 'Easy', color: 'text-green-600', icon: '●' },
  moderate: { label: 'Moderate', color: 'text-yellow-600', icon: '●●' },
  challenging: { label: 'Challenging', color: 'text-red-600', icon: '●●●' },
  'all-levels': { label: 'All Levels', color: 'text-blue-600', icon: '●' },
  intermediate: { label: 'Intermediate', color: 'text-yellow-600', icon: '●●' }
};

// Category mapping based on service category
const getCategoryFromServiceCategory = (category: string): 'heart' | 'activity' | 'sleep' | 'stress' | 'nutrition' | 'hydration' => {
  const categoryMap: Record<string, 'heart' | 'activity' | 'sleep' | 'stress' | 'nutrition' | 'hydration'> = {
    'WELLNESS_COACHING': 'heart',
    'FITNESS': 'activity',
    'SLEEP': 'sleep',
    'MENTAL_HEALTH': 'stress',
    'NUTRITION': 'nutrition',
    'HYDRATION': 'hydration'
  };
  return categoryMap[category] || 'heart';
};

// Icon mapping
const getIconForCategory = (category: 'heart' | 'activity' | 'sleep' | 'stress' | 'nutrition' | 'hydration') => {
  const iconMap = {
    heart: Heart,
    activity: Activity,
    sleep: Moon,
    stress: Brain,
    nutrition: Apple,
    hydration: Droplet
  };
  return iconMap[category];
};

// Color mapping
const getColorsForCategory = (category: 'heart' | 'activity' | 'sleep' | 'stress' | 'nutrition' | 'hydration') => {
  const colorMap = {
    heart: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    activity: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    sleep: { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    stress: { color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    nutrition: { color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    hydration: { color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' }
  };
  return colorMap[category];
};

// Transform GraphQL response to UI format
const transformRecommendation = (apiRec: UserRecommendationResponse): Recommendation => {
  const category = getCategoryFromServiceCategory(apiRec.spec.partnerService.category);
  const colors = getColorsForCategory(category);
  
  return {
    id: apiRec.id,
    category,
    title: apiRec.spec.partnerService.name,
    description: apiRec.spec.partnerService.description,
    priority: apiRec.metadata.labels.priority as 'high' | 'medium' | 'low',
    matchScore: apiRec.spec.recommendation.relevanceScore,
    telemetryReason: '', // Removed hardcoded reason
    impact: `Relevance score: ${apiRec.spec.recommendation.relevanceScore}%`,
    timeframe: apiRec.spec.partnerService.labels.duration || 'Varies',
    difficulty: apiRec.metadata.labels.difficulty as 'easy' | 'moderate' | 'challenging',
    actionItems: [],
    benefits: [],
    icon: getIconForCategory(category),
    ...colors,
    partner: {
      id: apiRec.spec.partnerService.serviceId,
      name: apiRec.spec.partnerService.name,
      logo: '🏥',
      rating: 0,
      reviewCount: 0,
      specialization: apiRec.spec.partnerService.category.replace('_', ' '),
      verified: apiRec.spec.partnerService.status === 'ACTIVE'
    },
    pricing: [],
    enrollmentCount: 0,
    successRate: 0
  };
};

export default function MyRecommendations() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll, isConnected } = useNotifications();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'matchScore' | 'priority' | 'rating'>('matchScore');
  const [subscribingServiceId, setSubscribingServiceId] = useState<string | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);

  // Use recommendation progress hook
  const {
    isConnected: isProgressConnected,
    isGenerating,
    percentage,
    stepDetails,
    error: progressError,
    result: progressResult
  } = useRecommendationProgress({
    userId: user?.email || '',
    workflowId: currentWorkflowId || undefined,
    onComplete: (result) => {
      refetch(); // Refresh recommendations
      toast({
        title: "Recommendations Ready!",
        description: `Generated ${result.newRecommendations} new recommendations`,
        duration: 5000,
      });
      setCurrentWorkflowId(null);
    },
    onError: (error) => {
      console.error('Progress error:', error);
      setCurrentWorkflowId(null);
      toast({
        title: "Generation Issue",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Fetch recommendations from GraphQL
  const { data, loading, error, refetch } = useQuery<GetUserRecommendationsData>(GET_USER_RECOMMENDATIONS, {
    variables: { userEmail: user?.email || '' },
    skip: !user?.email,
  });

  // Fetch user subscriptions
  const { data: subscriptionsData, refetch: refetchSubscriptions } = useQuery(GET_USER_SUBSCRIPTIONS, {
    variables: { email: user?.email || '' },
    skip: !user?.email,
  });

  // Generate recommendations mutation
  const [generateRecommendation, { loading: isGenerateRecommendationLoading }] = useMutation(GENERATE_RECOMMENDATION);

  // Subscribe to service mutation
  const [subscribeToService] = useMutation(SUBSCRIBE_TO_SERVICE, {
    onCompleted: (data: any) => {
      console.log('Successfully subscribed to service:', data);
      setSubscribingServiceId(null);
      // Refetch subscriptions to update UI
      refetchSubscriptions();
      // Track subscription event
      trackEvent(AnalyticsEvents.SERVICE_SUBSCRIBED, {
        serviceId: data.subscribeToService.partnerServiceId,
        userId: user?.email,
        timestamp: new Date().toISOString(),
      });
    },
    onError: (error) => {
      console.error('Error subscribing to service:', error);
      setSubscribingServiceId(null);
      alert('Failed to subscribe to service. Please try again.');
    },
  });

  // Check if user is subscribed to a service
  const isSubscribed = (serviceId: string): boolean => {
    if (!subscriptionsData) return false;
    const subs = (subscriptionsData as any).userSubscriptions;
    if (!subs) return false;
    return subs.some(
      (sub: any) => sub.partnerServiceId === serviceId && sub.isActive
    );
  };

  // Restore an in-flight workflow when the user navigates back to this page.
  // The hook persists { workflowId, isActive, timestamp } to localStorage on every progress
  // event, so we can reconnect to an already-running SSE stream without a new mutation.
  useEffect(() => {
    if (!user?.email) return;
    try {
      const saved = localStorage.getItem(`rec-progress-${user.email}`);
      if (!saved) return;
      const progress = JSON.parse(saved);
      if (
        progress.isActive &&
        progress.workflowId &&
        Date.now() - progress.timestamp < 3_600_000 // 1 hour max
      ) {
        setCurrentWorkflowId(progress.workflowId);
      }
    } catch {
      // ignore malformed data
    }
  }, [user?.email]);

  const handleGenerateRecommendations = async () => {
    if (isGenerateRecommendationLoading || isGenerationActive) {
      return;
    }

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
      const workflowId = (data as any)?.generateRecommendation?.workflowId;
      
      if (workflowId) {
        setCurrentWorkflowId(workflowId);
        toast({
          title: "Generating Recommendations",
          description: "Your personalized recommendations are being created.",
          duration: 3000,
        });
      } else {
        setCurrentWorkflowId(null);
        toast({
          title: "Generation Failed",
          description: "Failed to start recommendation generation. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      trackEvent(AnalyticsEvents.RECOMMENDATIONS_GENERATED, {
        userId: user?.email,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Generate recommendation error:', err);
      setCurrentWorkflowId(null);
      toast({
        title: "Generation Failed",
        description: "Failed to start recommendation generation. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleSubscribe = async (serviceId: string) => {
    if (!user?.email) {
      alert('Please log in to subscribe to services.');
      return;
    }

    setSubscribingServiceId(serviceId);
    
    // Set end date to 30 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    try {
      await subscribeToService({
        variables: {
          email: user.email,
          serviceId: serviceId,
          endDate: endDate.toISOString(),
        },
      });
    } catch (err) {
      console.error('Subscription error:', err);
    }
  };

  useEffect(() => {
    trackPage('My Recommendations', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.RECOMMENDATION_VIEWED, {
      page: 'My Recommendations',
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);

  useEffect(() => {
    // Ensure terminal workflows always release button state, even if completion payload is missing.
    // Guard: when restoring a workflowId from localStorage on page re-entry the SSE hasn't
    // reconnected yet — progressResult/progressError/stepDetails are all null at that point.
    // Only clear once we've received at least one data signal, avoiding a premature wipe.
    const hasReceivedData = Boolean(progressResult || progressError || stepDetails);
    if (currentWorkflowId && !isGenerating && hasReceivedData && !isProgressConnected) {
      setCurrentWorkflowId(null);
    }
  }, [currentWorkflowId, isGenerating, isProgressConnected, progressResult, progressError, stepDetails]);

  if (!user) return null;

  const userName = user?.given_name || user?.name || 'User';

  // Transform API data to UI format, fallback to sample data if no API data
  const recommendations = data?.userRecommendations
    ? data.userRecommendations.map(transformRecommendation)
    : sampleRecommendations;

  const filteredRecommendations = selectedCategory === 'all'
    ? recommendations
    : recommendations.filter((rec: Recommendation) => rec.category === selectedCategory);

  // Sort recommendations
  const sortedRecommendations = [...filteredRecommendations].sort((a: Recommendation, b: Recommendation) => {
    if (sortBy === 'matchScore') return b.matchScore - a.matchScore;
    if (sortBy === 'rating') return b.partner.rating - a.partner.rating;
    // priority sorting
    const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const stats = {
    total: recommendations.length,
    avgMatchScore: recommendations.length > 0
      ? Math.round(recommendations.reduce((acc: number, r: Recommendation) => acc + r.matchScore, 0) / recommendations.length)
      : 0,
    highPriority: recommendations.filter((r: Recommendation) => r.priority === 'high').length
  };

  const isAwaitingFirstProgressEvent = Boolean(currentWorkflowId)
    && !isGenerating
    && !progressResult
    && !progressError
    && !stepDetails;
  const isGenerationActive = isGenerateRecommendationLoading || isGenerating || isAwaitingFirstProgressEvent;
  const shouldShowProgress = isGenerationActive || Boolean(progressError);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">My Recommendations</h1>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-8">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-slate-900">My Recommendations</h1>
              {isConnected && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  🟢 Live
                </span>
              )}
            </div>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading your personalized recommendations...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Unable to load recommendations</h3>
                    <p className="text-sm text-red-800">
                      {error.message || 'An error occurred while fetching your recommendations. Please try again later.'}
                    </p>
                    <p className="text-xs text-red-700 mt-2">Showing sample recommendations instead.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Progress Display */}
            {shouldShowProgress && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <div>
                          <h3 className="font-semibold text-blue-900">Generating Recommendations</h3>
                          <p className="text-sm text-blue-700">
                            {stepDetails?.description || 'Creating personalized wellness plans based on your health data'}
                          </p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
                    </div>
                    
                    <Progress value={percentage} className="h-2" />

                    {progressError && (
                      <Alert variant="destructive">
                        <AlertDescription>{progressError.message}</AlertDescription>
                      </Alert>
                    )}

                    {progressResult && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-900">Success!</AlertTitle>
                        <AlertDescription className="text-green-800">
                          Generated {progressResult.newRecommendations} new personalized recommendations
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hero Section */}
            {!loading && (
            <>
            <div className="mb-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                      Personalized Wellness Recommendations
                    </h1>
                    <p className="text-slate-600">AI-powered wellness plans from verified partners, tailored to your health data</p>
                  </div>
                </div>
                <Button
                  onClick={handleGenerateRecommendations}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                  size="lg"
                  disabled={isGenerationActive}
                >
                  {isGenerationActive ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {isGenerationActive ? 'Generating...' : 'Generate Recommendations'}
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Available Plans</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                    </div>
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Avg Match Score</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.avgMatchScore}%</p>
                    </div>
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">High Priority</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.highPriority}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sort Options */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Sort by:</span>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === 'matchScore' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('matchScore')}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Best Match
                  </Button>
                  <Button
                    variant={sortBy === 'priority' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('priority')}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Priority
                  </Button>
                  <Button
                    variant={sortBy === 'rating' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('rating')}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Rating
                  </Button>
                </div>
              </div>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedRecommendations.map((rec: Recommendation) => (
                <Card
                  key={rec.id}
                  className={cn(
                    "transition-all hover:shadow-lg border-2 relative overflow-hidden",
                    rec.borderColor
                  )}
                >
                  {/* Match Score Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {rec.matchScore}% Match
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", rec.bgColor)}>
                        <rec.icon className={cn("w-6 h-6", rec.color)} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg pr-20">{rec.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={cn("text-xs", priorityConfig[rec.priority].color)}>
                            {priorityConfig[rec.priority].label}
                          </Badge>
                          {difficultyConfig[rec.difficulty] && (
                            <span className={cn("text-xs font-medium", difficultyConfig[rec.difficulty].color)}>
                              {difficultyConfig[rec.difficulty].icon} {difficultyConfig[rec.difficulty].label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardDescription className="text-sm leading-relaxed mb-3">
                      {rec.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      {/* CTA */}
                      {isSubscribed(rec.partner.id) ? (
                        <Button
                          className="w-full mt-2"
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                          Already Subscribed
                        </Button>
                      ) : (
                        <Button
                          className="w-full mt-2"
                          size="sm"
                          onClick={() => handleSubscribe(rec.partner.id)}
                          disabled={subscribingServiceId === rec.partner.id}
                        >
                          {subscribingServiceId === rec.partner.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Subscribing...
                            </>
                          ) : (
                            <>
                              Subscribe to Service
                              <CheckCircle2 className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Made with Bob

// Made with Bob
