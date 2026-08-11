import { useState } from "react";
import { X, Heart, Activity, Moon, Brain, Apple, Droplet, Target, ChevronRight, Sparkles, Crown, Check, CreditCard, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";




interface WellnessRecommendationsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Recommendation {
  id: string;
  category: 'heart' | 'activity' | 'sleep' | 'stress' | 'nutrition' | 'hydration';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const recommendations: Recommendation[] = [
  {
    id: '1',
    category: 'heart',
    title: 'Optimize Heart Rate Variability',
    description: 'Your recent heart rate patterns show room for improvement in cardiovascular efficiency.',
    priority: 'high',
    actionItems: [
      'Practice 5-minute deep breathing exercises twice daily',
      'Incorporate 20 minutes of moderate cardio 4x per week',
      'Maintain consistent sleep schedule to support heart rhythm'
    ],
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200'
  },
  {
    id: '2',
    category: 'activity',
    title: 'Increase Daily Movement',
    description: 'Based on your step count trends, increasing daily activity could boost your energy levels.',
    priority: 'high',
    actionItems: [
      'Aim for 8,000+ steps daily with gradual increases',
      'Take 2-minute walking breaks every hour during work',
      'Try strength training 2x per week for 30 minutes'
    ],
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  {
    id: '3',
    category: 'sleep',
    title: 'Enhance Sleep Quality',
    description: 'Your sleep duration is good, but we can optimize sleep quality for better recovery.',
    priority: 'medium',
    actionItems: [
      'Create a wind-down routine 30 minutes before bed',
      'Keep bedroom temperature between 65-68°F',
      'Limit screen exposure 1 hour before bedtime'
    ],
    icon: Moon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200'
  },
  {
    id: '4',
    category: 'stress',
    title: 'Stress Management Protocol',
    description: 'Implementing stress reduction techniques can improve your overall wellness metrics.',
    priority: 'medium',
    actionItems: [
      'Practice mindfulness meditation for 10 minutes daily',
      'Try progressive muscle relaxation before sleep',
      'Schedule regular social activities to boost mood'
    ],
    icon: Brain,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200'
  },
  {
    id: '5',
    category: 'nutrition',
    title: 'Nutritional Balance Optimization',
    description: 'Personalized nutrition recommendations based on your activity and health goals.',
    priority: 'low',
    actionItems: [
      'Increase protein intake to 1g per lb of body weight',
      'Add omega-3 rich foods 3x per week (salmon, walnuts)',
      'Consume antioxidant-rich berries daily for recovery'
    ],
    icon: Apple,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  {
    id: '6',
    category: 'hydration',
    title: 'Hydration Strategy',
    description: 'Optimal hydration timing to support your wellness goals and activity levels.',
    priority: 'low',
    actionItems: [
      'Drink 16-20oz water upon waking to kickstart metabolism',
      'Consume 6-8oz water every hour during active periods',
      'Add electrolytes after workouts lasting over 60 minutes'
    ],
    icon: Droplet,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200'
  }
];

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-green-100 text-green-800 border-green-300'
};

export default function WellnessRecommendations({ isOpen, onClose }: WellnessRecommendationsProps) {


  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  

  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);

  const { user, logout, isLoggingOut } = useAuth();

  const handleSelectionTelemetry = () => {

    trackEvent('Sapphire Recommendation Plan Viewed', {
      CTA: 'Complete',
      elementId: 'Sapphire Recommendation Plan Viewed',
      action: 'clicked',
      userId: user?.email
    });
    console.log('Recommendation View Telemetry Sent')


  }

  const handlePurchase = () => {
    setShowPurchase(false);
    setPurchaseConfirmed(true);
    trackEvent('Sapphire Recommendation Plan Purchased', {
      CTA: 'Complete',
      elementId: 'Sapphire Recommendation Plan Purchased',
      action: 'clicked',
      userId: user?.email
    });
    console.log('Purchase Telemetry Sent')
    setTimeout(() => {
      setPurchaseConfirmed(false);
      setSelectedRecommendation(null);
    }, 3000);
  };

  if (!isOpen) return null;

  return (


    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Main Panel */}
      <div className="relative ml-auto w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Wellness Coach</h2>
              <p className="text-sm text-gray-600">Personalized recommendations</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-recommendations">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {purchaseConfirmed ? (
            /* Purchase Confirmation Screen */
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Purchase Successful!</h3>
                <p className="text-gray-600 mb-4">Your Professional Plan has been activated. You now have access to advanced wellness coaching features.</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 text-green-800">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-medium">Professional Plan Active</span>
                  </div>
                </div>
              </div>
            </div>
          ) : showPurchase ? (
            /* Professional Plan Purchase Screen */
            <div className="p-4 h-full overflow-y-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPurchase(false)}
                className="mb-4 -ml-2 text-gray-600 hover:text-gray-900"
                data-testid="button-back-from-purchase"
              >
                ← Back to recommendation
              </Button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upgrade to Professional</h3>
                <p className="text-gray-600 text-sm">Unlock advanced wellness coaching and personalized health insights</p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900">$29.99</div>
                  <div className="text-sm text-gray-600">per month</div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    "Advanced AI health coaching",
                    "Personalized meal plans",
                    "1-on-1 virtual wellness sessions",
                    "Priority customer support",
                    "Detailed health analytics",
                    "Custom workout programs"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    onClick={handlePurchase}
                    data-testid="button-confirm-purchase"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase Professional Plan
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Shield className="w-3 h-3" />
                    <span>Secure payment • Cancel anytime • 30-day money-back guarantee</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-gray-600">"The best wellness app I've ever used!" - 50,000+ happy members</p>
              </div>
            </div>
          ) : !selectedRecommendation ? (
            /* Recommendations List */
            <div className="p-4 space-y-3 h-full overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Priority Recommendations</h3>
                <p className="text-xs text-gray-500">Based on your recent health data and goals</p>
              </div>

              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                    rec.bgColor
                  )}
                  onClick={() => {setSelectedRecommendation(rec), handleSelectionTelemetry()}}
                  data-testid={`recommendation-card-${rec.category}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <rec.icon className={cn("w-4 h-4", rec.color)} />
                      <Badge variant="outline" className={cn("text-xs", priorityColors[rec.priority])}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>

                  <h4 className="font-medium text-gray-900 text-sm mb-1">{rec.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{rec.description}</p>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200 mt-6">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Target className="w-3 h-3" />
                  <span>Recommendations update weekly based on your progress</span>
                </div>
              </div>
            </div>
          ) : (
            /* Detailed Recommendation View */
            <div className="p-4 h-full overflow-y-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRecommendation(null)}
                className="mb-4 -ml-2 text-gray-600 hover:text-gray-900"
                data-testid="button-back-to-list"
              >
                ← Back to recommendations
              </Button>

              <div className={cn("p-4 rounded-lg border mb-4", selectedRecommendation.bgColor)}>
                <div className="flex items-start gap-3 mb-3">
                  <selectedRecommendation.icon className={cn("w-5 h-5 mt-1", selectedRecommendation.color)} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{selectedRecommendation.title}</h3>
                    <Badge variant="outline" className={cn("text-xs", priorityColors[selectedRecommendation.priority])}>
                      {selectedRecommendation.priority} priority
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedRecommendation.description}</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Action Plan</h4>
                <div className="space-y-3">
                  {selectedRecommendation.actionItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-5 h-5 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    data-testid="button-start-plan"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Start This Plan
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-gray-600"
                    data-testid="button-customize-plan"
                  >
                    Customize Plan
                  </Button>

                  {/* Professional Plan Upsell */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-3">
                      <div className="flex items-start gap-3">
                        <Crown className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm mb-1">Unlock Professional Coaching</h4>
                          <p className="text-xs text-gray-600 leading-relaxed mb-3">
                            Get personalized meal plans, 1-on-1 virtual sessions, and advanced AI coaching tailored specifically for this recommendation.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                            onClick={() => setShowPurchase(true)}
                            data-testid="button-upgrade-professional"
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Upgrade to Professional - $29.99/mo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}