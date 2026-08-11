# Frontend-Only OIDC Implementation Guide for Sapphire UI

## Overview

This guide implements **Keycloak OIDC authentication directly in the React frontend** using the Authorization Code Flow with PKCE. The frontend will obtain access tokens and send them as Bearer tokens to the BFF GraphQL API.

---

## Architecture

```
┌─────────────────┐
│   React App     │
│   (Frontend)    │
└────────┬────────┘
         │
         │ 1. Redirect to Keycloak
         ▼
┌─────────────────┐
│   Keycloak      │
│   (Auth Server) │
└────────┬────────┘
         │
         │ 2. Return auth code
         ▼
┌─────────────────┐
│   React App     │
│   (Callback)    │
└────────┬────────┘
         │
         │ 3. Exchange code for tokens (PKCE)
         ▼
┌─────────────────┐
│   Keycloak      │
│   (Token)       │
└────────┬────────┘
         │
         │ 4. Return access_token
         ▼
┌─────────────────┐
│   React App     │
│   (Store token) │
└────────┬────────┘
         │
         │ 5. GraphQL with Bearer token
         ▼
┌─────────────────┐
│   BFF API       │
│   (GraphQL)     │
└─────────────────┘
```

---

## Step 1: Install Dependencies

```bash
npm install oidc-client-ts
npm install jwt-decode
```

---

## Step 2: Configure Keycloak Client (Public Client)

### Keycloak Admin Console Configuration

1. **Create/Update Client**:
   - Client ID: `sapphire-ui-public`
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Standard Flow Enabled: `ON`
   - Direct Access Grants Enabled: `OFF`
   - Implicit Flow Enabled: `OFF`

2. **Valid Redirect URIs**:
   ```
   http://localhost:5173/*
   http://localhost:5173/callback
   ```

3. **Valid Post Logout Redirect URIs**:
   ```
   http://localhost:5173/*
   ```

4. **Web Origins**:
   ```
   http://localhost:5173
   ```

5. **Advanced Settings**:
   - Proof Key for Code Exchange Code Challenge Method: `S256`
   - Access Token Lifespan: `15 minutes` (recommended)
   - Client Session Idle: `30 minutes`
   - Client Session Max: `8 hours`

---

## Step 3: Create Authentication Service

Create `client/src/services/authService.ts`:

```typescript
import { UserManager, User, WebStorageStateStore } from 'oidc-client-ts';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8090';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'sapphire-ui';
const CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'sapphire-ui-public';
const REDIRECT_URI = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || 'http://localhost:5173/callback';
const POST_LOGOUT_REDIRECT_URI = import.meta.env.VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI || 'http://localhost:5173';

const authority = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

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
   */
  static async handleCallback(): Promise<User> {
    try {
      const user = await userManager.signinRedirectCallback();
      console.log('Authentication successful:', user.profile);
      
      // Redirect to original URL or dashboard
      const returnUrl = user.state?.returnUrl || '/dashboard';
      window.history.replaceState({}, document.title, returnUrl);
      
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
      await userManager.signoutRedirect();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Silent token renewal
   */
  static async renewToken(): Promise<User> {
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
```

---

## Step 4: Create Callback Page

Create `client/src/pages/callback.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AuthService } from '@/services/authService';

export default function CallbackPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await AuthService.handleCallback();
        // Redirect happens in handleCallback
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        
        // Redirect to home after error
        setTimeout(() => {
          setLocation('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
```

---

## Step 5: Create Silent Renew Page

Create `client/public/silent-renew.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Silent Renew</title>
</head>
<body>
    <script src="https://unpkg.com/oidc-client-ts@2.4.0/dist/browser/oidc-client-ts.min.js"></script>
    <script>
        new oidc.UserManager({
            response_mode: "query"
        }).signinSilentCallback();
    </script>
</body>
</html>
```

---

## Step 6: Update Apollo Client with Bearer Token

Update `client/src/lib/apolloClient.ts`:

```typescript
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { AuthService } from '@/services/authService';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_BFF_API_URL || 'http://localhost:4000/graphql',
});

// Auth link - adds Bearer token to requests
const authLink = setContext(async (_, { headers }) => {
  const token = await AuthService.getAccessToken();
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Error link - handle auth errors
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }) => {
      console.error(`[GraphQL error]: ${message}`);
      
      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        console.log('Token expired or invalid, redirecting to login...');
        AuthService.removeUser();
        window.location.href = '/';
      }
    });
  }
  
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
```

---

## Step 7: Update useAuth Hook

Update `client/src/hooks/useAuth.ts`:

```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { AuthService } from '@/services/authService';
import { GET_CURRENT_USER } from '@/graphql/auth';
import type { User } from 'oidc-client-ts';
import analytics from '@/components/ui/analytics';

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

  // Fetch user data from GraphQL (optional - for additional user info)
  const { data: userData } = useQuery(GET_CURRENT_USER, {
    skip: !oidcUser,
    errorPolicy: 'all',
  });

  const login = async () => {
    try {
      await AuthService.login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      analytics.track('Sapphire User Logout', {
        CTA: 'Complete',
        elementId: 'Sapphire User Logout',
        action: 'clicked',
        userId: oidcUser?.profile?.email,
      });

      await AuthService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    // OIDC user info
    user: oidcUser?.profile,
    // Additional user data from GraphQL
    userData: userData?.me,
    isLoading,
    isAuthenticated: !!oidcUser && !oidcUser.expired,
    login,
    logout,
    accessToken: oidcUser?.access_token,
  };
}
```

---

## Step 8: Update App Routes

Update `client/src/App.tsx`:

```typescript
import { Route, Switch, Redirect } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import HomePage from '@/pages/home';
import DashboardPage from '@/pages/dashboard';
import CallbackPage from '@/pages/callback';
import NotFoundPage from '@/pages/not-found';

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <Component {...rest} /> : <Redirect to="/" />;
}

function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/callback" component={CallbackPage} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}

export default App;
```

---

## Step 9: Update Home Page with Login Button

Update `client/src/pages/home.tsx`:

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Sapphire Wellness
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Your personal health dashboard
        </p>
        <Button onClick={login} size="lg">
          Sign In with Keycloak
        </Button>
      </div>
    </div>
  );
}
```

---

## Step 10: Update Environment Variables

Update `.env.example`:

```bash
# BFF GraphQL API
VITE_BFF_API_URL=http://localhost:4000/graphql

# Keycloak Configuration
VITE_KEYCLOAK_URL=http://localhost:8090
VITE_KEYCLOAK_REALM=sapphire-ui
VITE_KEYCLOAK_CLIENT_ID=sapphire-ui-public
VITE_KEYCLOAK_REDIRECT_URI=http://localhost:5173/callback
VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:5173

# Notification API
VITE_NOTIFICATION_API_URL=http://localhost:8084

# Segment Analytics
VITE_SEGMENT_WRITE_KEY=your-segment-key
```

---

## Step 11: BFF API Token Validation

The BFF GraphQL API must validate the Bearer token. Example implementation:

```typescript
// BFF: src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function validateToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.KEYCLOAK_CLIENT_ID,
        issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

// BFF: GraphQL context
export const context = async ({ req }: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null };
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = await validateToken(token);
    return {
      user: {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
      },
      token,
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return { user: null };
  }
};
```

---

## Step 12: Remove Server Components

Now you can safely remove:

```bash
# Delete server directory
rm -rf server/

# Delete database config
rm drizzle.config.ts

# Update package.json - remove backend dependencies
# (See ARCHITECTURE_MIGRATION_GUIDE.md for full list)
```

---

## Security Considerations

### ⚠️ Important Security Notes

1. **Token Storage**: Tokens are stored in sessionStorage (cleared on tab close)
2. **Token Lifetime**: Keep access tokens short-lived (15 minutes recommended)
3. **PKCE**: Always enabled for public clients
4. **HTTPS**: Use HTTPS in production (tokens in transit)
5. **CSP Headers**: Implement Content Security Policy
6. **XSS Protection**: Sanitize all user inputs
7. **Token Refresh**: Automatic silent renewal configured

### Token Storage Options

```typescript
// Option 1: sessionStorage (current - cleared on tab close)
userStore: new WebStorageStateStore({ store: window.sessionStorage })

// Option 2: localStorage (persists across sessions - less secure)
userStore: new WebStorageStateStore({ store: window.localStorage })

// Option 3: Memory only (most secure - lost on refresh)
// Don't set userStore, tokens only in memory
```

---

## Testing the Implementation

### 1. Start Keycloak
```bash
docker run -p 8090:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

### 2. Configure Keycloak Realm and Client
- Create realm: `sapphire-ui`
- Create client: `sapphire-ui-public` (public client)
- Configure redirect URIs

### 3. Start BFF API
```bash
cd ../sapphire-bff-api
npm run dev
```

### 4. Start Frontend
```bash
npm run dev
```

### 5. Test Flow
1. Navigate to `http://localhost:5173`
2. Click "Sign In with Keycloak"
3. Authenticate with Keycloak
4. Redirected to `/callback`
5. Redirected to `/dashboard`
6. GraphQL requests include Bearer token

---

## Troubleshooting

### Issue: CORS errors
**Solution**: Configure CORS in BFF to allow frontend origin

### Issue: Token validation fails
**Solution**: Check BFF has correct Keycloak JWKS URI and realm

### Issue: Redirect loop
**Solution**: Check redirect URIs match exactly in Keycloak

### Issue: Silent renew fails
**Solution**: Ensure `silent-renew.html` is accessible and CORS allows iframe

---

## Migration Checklist

- [ ] Install oidc-client-ts and jwt-decode
- [ ] Configure Keycloak public client
- [ ] Create authService.ts
- [ ] Create callback page
- [ ] Create silent-renew.html
- [ ] Update Apollo Client with auth link
- [ ] Update useAuth hook
- [ ] Update App routes with ProtectedRoute
- [ ] Update home page with login button
- [ ] Update environment variables
- [ ] Configure BFF token validation
- [ ] Remove server directory
- [ ] Test authentication flow
- [ ] Test token refresh
- [ ] Test logout flow

---

## Next Steps

1. **Implement this frontend OIDC solution**
2. **Test thoroughly in development**
3. **Monitor for security issues**
4. **Plan migration to BFF-managed auth** (recommended for production)

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-09  
**Implementation**: Frontend-Only OIDC with Bearer Tokens