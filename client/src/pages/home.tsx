import { Heart, Activity, Users, BarChart3, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { login } = useAuth();

  const handleLogin = () => {
    // Initiate OIDC login flow
    login();
  };

  const stats = [
    { icon: Users, value: "50K+", label: "Active Users", color: "text-blue-600" },
    { icon: Heart, value: "2M+", label: "Health Records", color: "text-red-600" },
    { icon: Activity, value: "95%", label: "User Satisfaction", color: "text-green-600" },
    { icon: BarChart3, value: "24/7", label: "Monitoring", color: "text-purple-600" }
  ];

  const features = [
    {
      icon: Heart,
      title: "Heart Rate Monitoring",
      description: "Real-time tracking of your cardiovascular health with intelligent alerts."
    },
    {
      icon: Activity,
      title: "Activity Tracking",
      description: "Monitor your daily steps, workouts, and movement patterns."
    },
    {
      icon: BarChart3,
      title: "Blood Pressure Analysis",
      description: "Track and analyze your blood pressure trends over time."
    },
    {
      icon: Shield,
      title: "Secure Health Data",
      description: "Your health information is encrypted and protected with enterprise-grade security."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Sapphire Wellness</h1>
            </div>
            <Button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Your Health Journey
              <span className="text-blue-600"> Starts Here</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Monitor, track, and improve your wellness with our comprehensive health dashboard. 
              Get real-time insights into your vital signs and take control of your health.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
                data-testid="button-start-tracking"
              >
                Start Tracking Now
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2" data-testid={`stat-value-${index}`}>
                  {stat.value}
                </div>
                <div className="text-gray-600" data-testid={`stat-label-${index}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Comprehensive Health Monitoring
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track all aspects of your health with our advanced monitoring tools and get personalized insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg" data-testid={`feature-title-${index}`}>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600" data-testid={`feature-description-${index}`}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Health?
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already taking control of their wellness journey.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleLogin}
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
            data-testid="button-join-now"
          >
            Join Sapphire Wellness Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Sapphire Wellness</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-400">
              © 2024 Sapphire Wellness. Empowering healthier lives through technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}