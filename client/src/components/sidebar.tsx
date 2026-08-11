import { Heart, LayoutDashboard, LogOut, Crown, Zap, Sparkles, ChevronDown, Users, Briefcase, UserCircle, Bell, Wrench, Star, Building2, ShoppingBag, MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import WellnessRecommendations from "./wellness-recommendations";
import { useState, useEffect } from "react";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@apollo/client/react";
import { ACTIVITY_SUMMARY, UPGRADE_USER_TO_PREMIUM } from "@/graphql/auth";

interface SidebarProps {
  className?: string;
}

interface ActivitySummaryData {
  fetchUser: {
    name: string;
    email: string;
    userTier: string;
  };
}

interface UpgradeUserToPremiumData {
  upgradeUserToPremium: {
    name: string;
    email: string;
    userTier: string;
  };
}

export default function Sidebar({ className }: SidebarProps) {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [partnersExpanded, setPartnersExpanded] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [location, setLocation] = useLocation();

  // Fetch user profile data
  const { data, refetch } = useQuery<ActivitySummaryData>(ACTIVITY_SUMMARY, {
    variables: { email: user?.email },
    skip: !user?.email,
  });

  const profileData = data?.fetchUser;
  const displayName = profileData?.name || `${user?.given_name || ''} ${user?.family_name || ''}`.trim() || 'User';
  const userTier = profileData?.userTier || 'free';

  useEffect(() => {
    if (location === "/registered-partners" || location === "/partner-services" || location === "/find-partner") {
      setPartnersExpanded(true);
    }
    if (location === "/user-profile" || location === "/my-alerts" || location === "/my-services" || location === "/my-recommendations") {
      setAccountExpanded(true);
    }
  }, [location]);

  // GraphQL mutation for upgrading to premium
  const [upgradeToPremium, { loading: upgrading }] = useMutation<UpgradeUserToPremiumData>(UPGRADE_USER_TO_PREMIUM, {
    onCompleted: (data) => {
      console.log("Upgrade data", data);

      trackEvent(AnalyticsEvents.USER_UPGRADED, {
        CTA: 'Complete',
        elementId: 'User Upgraded',
        action: 'clicked',
        userId: data.upgradeUserToPremium.email,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Upgrade Successful!",
        description: `Welcome to Premium, ${data.upgradeUserToPremium.name}!`,
      });

      console.log('Upgrade successful for user:', user?.email);

      // Refresh user data to show premium status
      refetch();
    },
    onError: (error) => {
      console.error('Upgrade failed:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleUpgrade = () => {
    if (!user?.email) return;
    
    upgradeToPremium({
      variables: { email: user.email },
    });
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "#", active: true },
  ];

  const premiumNavigationItems = [
    {
      icon: Sparkles,
      label: "Sapphire Wellness Buddy",
      href: "/wellness-coach",
      active: location === "/wellness-coach",
      premium: true
    },
  ];

  return (
    <aside className={cn("hidden lg:flex lg:flex-col lg:w-64 bg-white shadow-sm border-r border-slate-200", className)}>
      <div className="flex items-center h-16 px-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-900">WellnessHub</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-lg",
            location === "/dashboard" || location === "/"
              ? "text-primary bg-blue-50"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mr-3" />
          Dashboard
        </Link>

        {/* My Account Section */}
        <div>
          <button
            onClick={() => setAccountExpanded(!accountExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <div className="flex items-center">
              <UserCircle className="w-5 h-5 mr-3" />
              My Account
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", accountExpanded && "rotate-180")} />
          </button>
          
          {accountExpanded && (
            <div className="ml-8 mt-1 space-y-1">
              <Link
                href="/user-profile"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg",
                  location === "/user-profile"
                    ? "text-primary bg-blue-50 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <UserCircle className="w-4 h-4 mr-2" />
                My Profile
              </Link>
              <Link
                href="/my-alerts"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg",
                  location === "/my-alerts"
                    ? "text-primary bg-blue-50 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Bell className="w-4 h-4 mr-2" />
                My Alerts
              </Link>
              <Link
                href="/my-services"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg",
                  location === "/my-services"
                    ? "text-primary bg-blue-50 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Wrench className="w-4 h-4 mr-2" />
                My Services
              </Link>
              <Link
                href="/my-recommendations"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg",
                  location === "/my-recommendations"
                    ? "text-primary bg-blue-50 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Star className="w-4 h-4 mr-2" />
                My Recommendations
              </Link>
            </div>
          )}
        </div>

        {/* Wellness Partners and Services Section */}
        <div>
          <button
            onClick={() => setPartnersExpanded(!partnersExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-3" />
              Partners & Services
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", partnersExpanded && "rotate-180")} />
          </button>
          
          {partnersExpanded && (
            <div className="ml-8 mt-1 space-y-1">
              <Link
                href="/registered-partners"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg",
                  location === "/registered-partners"
                    ? "text-primary bg-blue-50 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Wellness Partners
              </Link>
              <Link
                href="/partner-services"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg",
                  location === "/partner-services"
                    ? "text-primary bg-blue-50 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Wellness Services
              </Link>
              <Link
                href="/find-partner"
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-lg",
                  location === "/find-partner"
                    ? "text-primary bg-blue-50 font-medium"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Search className="w-4 h-4 mr-2" aria-hidden="true" />
                Find a Partner
              </Link>
            </div>
          )}
        </div>


        {/* Premium Features Section */}
        {userTier === 'premium' && (
          <>
            <div className="pt-4 pb-2">
              <div className="flex items-center gap-2 px-3 py-1">
                <Crown className="w-3 h-3 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-800 uppercase tracking-wide">Premium Features</span>
              </div>
            </div>

            {premiumNavigationItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  item.active
                    ? "text-primary bg-blue-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-200",
                  "border border-transparent"
                )}
                data-testid="button-wellness-coach"
              >
                <item.icon className="w-5 h-5 mr-3 text-purple-600" />
                {item.label}
                <div className="ml-auto">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" />
                </div>
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900 truncate">
                {displayName}
              </p>
              {userTier === 'premium' && (
                <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500">
              {userTier === 'premium' ? 'Premium Member' : 'Free Member'}
            </p>
          </div>
        </div>

        {userTier === 'free' && (
          <Button
            variant="default"
            size="sm"
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            data-testid="button-upgrade"
          >
            <Zap className="w-4 h-4 mr-2" />
            {upgrading ? "Upgrading..." : "Upgrade to Premium"}
          </Button>
        )}

        {userTier === 'premium' && (
          <div className="p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-800">Premium Features Unlocked</span>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          disabled={isLoggingOut}
          className="w-full text-slate-600 hover:text-slate-900"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>

      {/* Wellness Recommendations Blade */}
      <WellnessRecommendations
        isOpen={showRecommendations}
        onClose={() => setShowRecommendations(false)}
      />
    </aside>
  );
}
