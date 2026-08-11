import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/lib/apolloClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import RegisteredPartners from "@/pages/registered-partners";
import PartnerServices from "@/pages/partner-services";
import MyServices from "@/pages/my-services";
import UserProfile from "@/pages/user-profile";
import MyAlerts from "@/pages/my-alerts";
import MyRecommendations from "@/pages/my-recommendations";
import SapphireWellnessCoachPage from "@/pages/sapphire-wellness-coach";
import Home from "@/pages/home";
import FindPartner from "@/pages/find-partner";
import Callback from "@/pages/callback";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import {
  initAnalytics,
  identifyUser,
  trackEvent,
  trackPage,
  AnalyticsEvents
} from "@/lib/analytics";

// TypeScript declaration for Amplitude global
declare global {
  interface Window {
    amplitude?: any;
  }
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Track user login and identify user
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      const existingLoggedInUser = sessionStorage.getItem('alreadyLoggedInUser');
      
      if (!existingLoggedInUser) {
        console.log("New logged in user, tracking analytics for:", user.email);
        
        // Initialize Amplitude with user identification
        if (window.amplitude) {
          window.amplitude.init('3223c2afca3dead1d7a40ed4ad48eb92', user.email, {
            defaultTracking: true
          });
          console.log('Amplitude initialized for user:', user.email);
        }
        
        // Identify the user in Segment
        identifyUser(user.email, {
          email: user.email,
          name: user.name,
          given_name: user.given_name,
          family_name: user.family_name,
        });

        // Track login event
        trackEvent(AnalyticsEvents.USER_LOGGED_IN, {
          email: user.email,
          timestamp: new Date().toISOString(),
        });

        sessionStorage.setItem('alreadyLoggedInUser', user.email);
        console.log('User login telemetry sent to Segment:', user.email);
      }
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? Dashboard : Home} />
      <Route path="/callback" component={Callback} />
      <Route path="/dashboard" component={isAuthenticated ? Dashboard : Home} />
      <Route path="/user-profile" component={isAuthenticated ? UserProfile : Home} />
      <Route path="/my-alerts" component={isAuthenticated ? MyAlerts : Home} />
      <Route path="/my-recommendations" component={isAuthenticated ? MyRecommendations : Home} />
      <Route path="/wellness-coach" component={isAuthenticated ? SapphireWellnessCoachPage : Home} />
      <Route path="/registered-partners" component={isAuthenticated ? RegisteredPartners : Home} />
      <Route path="/partner-services" component={isAuthenticated ? PartnerServices : Home} />
      <Route path="/my-services" component={isAuthenticated ? MyServices : Home} />
      <Route path="/find-partner" component={isAuthenticated ? FindPartner : Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize analytics on app mount
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ApolloProvider>
  );
}

export default App;

// Made with Bob
