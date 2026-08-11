import { UserManager, User, WebStorageStateStore } from 'oidc-client-ts';
import { resetAnalytics, trackEvent, AnalyticsEvents } from '@/lib/analytics';

// Runtime environment configuration support
// Check window.__ENV__ first (injected at runtime), then fall back to import.meta.env (build time)
declare global {
  interface Window {
    __ENV__?: {
      VITE_KEYCLOAK_URL?: string;
      VITE_KEYCLOAK_REALM?: string;
      VITE_KEYCLOAK_CLIENT_ID?: string;
      VITE_KEYCLOAK_REDIRECT_URI?: string;
      VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI?: string;
      VITE_BFF_API_URL?: string;
      VITE_NOTIFICATION_API_URL?: string;
    };
  }
}

const KEYCLOAK_URL = window.__ENV__?.VITE_KEYCLOAK_URL || import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8090';
const KEYCLOAK_REALM = window.__ENV__?.VITE_KEYCLOAK_REALM || import.meta.env.VITE_KEYCLOAK_REALM || 'sapphire-ui';
const CLIENT_ID = window.__ENV__?.VITE_KEYCLOAK_CLIENT_ID || import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sapphire-ui';
const REDIRECT_URI = window.__ENV__?.VITE_KEYCLOAK_REDIRECT_URI || import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || 'http://localhost:5173/callback';
const POST_LOGOUT_REDIRECT_URI = window.__ENV__?.VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI || import.meta.env.VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI || 'http://localhost:5173';

const authority = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

// Debug: Log configuration values (remove in production)
console.log('🔐 Keycloak Configuration:', {
  KEYCLOAK_URL,
  KEYCLOAK_REALM,
  CLIENT_ID,
  REDIRECT_URI,
  POST_LOGOUT_REDIRECT_URI,
  authority,
  runtimeEnv: window.__ENV__,
  buildTimeEnv: {
    VITE_KEYCLOAK_URL: import.meta.env.VITE_KEYCLOAK_URL,
    VITE_KEYCLOAK_REALM: import.meta.env.VITE_KEYCLOAK_REALM,
    VITE_KEYCLOAK_CLIENT_ID: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    VITE_KEYCLOAK_REDIRECT_URI: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI,
  }
});

// Configure OIDC User Manager
const userManager = new UserManager({
  authority,
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  post_logout_redirect_uri: POST_LOGOUT_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid profile email',
  
  // PKCE is enabled by default in oidc-client-ts
  
  // Store state in sessionStorage (more secure than localStorage)
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  
  // Automatic silent renew
  automaticSilentRenew: true,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
  
  // Token validation
  loadUserInfo: true,
  
  // Metadata
  metadata: {
    issuer: authority,
    authorization_endpoint: `${authority}/protocol/openid-connect/auth`,
    token_endpoint: `${authority}/protocol/openid-connect/token`,
    userinfo_endpoint: `${authority}/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${authority}/protocol/openid-connect/logout`,
    jwks_uri: `${authority}/protocol/openid-connect/certs`,
  },
});

// Event handlers
userManager.events.addUserLoaded((user) => {
  console.log('User loaded:', user.profile);
});

userManager.events.addUserUnloaded(() => {
  console.log('User unloaded');
});

userManager.events.addAccessTokenExpiring(() => {
  console.log('Access token expiring...');
});

userManager.events.addAccessTokenExpired(() => {
  console.log('Access token expired');
  // Optionally redirect to login
});

userManager.events.addSilentRenewError((error) => {
  console.error('Silent renew error:', error);
});

export class AuthService {
  /**
   * Initiate login flow - redirects to Keycloak
   */
  static async login(): Promise<void> {
    try {
      await userManager.signinRedirect({
        state: { returnUrl: window.location.pathname },
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Handle callback after Keycloak redirect
   * Returns the user object - navigation should be handled by the calling component
   */
  static async handleCallback(): Promise<User> {
    try {
      const user = await userManager.signinRedirectCallback();
      console.log('Authentication successful:', user.profile);
      
      return user;
    } catch (error) {
      console.error('Callback error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  static async getUser(): Promise<User | null> {
    try {
      return await userManager.getUser();
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Get access token
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      const user = await userManager.getUser();
      return user?.access_token || null;
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const user = await userManager.getUser();
      return user !== null && !user.expired;
    } catch (error) {
      return false;
    }
  }

  /**
   * Logout - redirects to Keycloak logout
   */
  static async logout(): Promise<void> {
    try {
      // Track logout event before clearing session
      trackEvent(AnalyticsEvents.USER_LOGGED_OUT, {
        timestamp: new Date().toISOString(),
      });
      
      // Reset analytics (clears user identity)
      resetAnalytics();
      
      // Clear session storage
      sessionStorage.removeItem('alreadyLoggedInUser');
      
      await userManager.signoutRedirect();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Silent token renewal
   */
  static async renewToken(): Promise<User | null> {
    try {
      return await userManager.signinSilent();
    } catch (error) {
      console.error('Token renewal error:', error);
      throw error;
    }
  }

  /**
   * Remove user session (local only, doesn't call Keycloak)
   */
  static async removeUser(): Promise<void> {
    try {
      await userManager.removeUser();
    } catch (error) {
      console.error('Remove user error:', error);
    }
  }
}

export { userManager };

// Made with Bob
