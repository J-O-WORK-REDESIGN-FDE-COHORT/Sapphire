import { useState, useEffect } from 'react';
import { AuthService } from '@/services/authService';
import type { User } from 'oidc-client-ts';
import { trackEvent, resetAnalytics, AnalyticsEvents } from '@/lib/analytics';

export function useAuth() {
  const [oidcUser, setOidcUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get OIDC user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await AuthService.getUser();
        setOidcUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async () => {
    try {
      await AuthService.login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      trackEvent(AnalyticsEvents.USER_LOGGED_OUT, {
        CTA: 'Complete',
        elementId: 'Sapphire User Logout',
        action: 'clicked',
        userId: oidcUser?.profile?.email,
        timestamp: new Date().toISOString(),
      });

      sessionStorage.removeItem('alreadyLoggedInUser');
      console.log('Due to logout - removed sessionStorage');

      // Reset Segment analytics to clear user identity and anonymous ID
      resetAnalytics();

      await AuthService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    // OIDC user info from Keycloak
    user: oidcUser?.profile,
    isLoading,
    isAuthenticated: !!oidcUser && !oidcUser.expired,
    login,
    logout,
    accessToken: oidcUser?.access_token,
    isLoggingOut: false,
  };
}

// Made with Bob
