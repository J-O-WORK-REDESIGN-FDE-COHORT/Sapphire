# Keycloak OIDC Authentication Implementation

## Overview

This document describes the Keycloak OIDC authentication implementation for the Sapphire Healthcare application. The implementation replaces the previous username/password authentication with a secure OIDC flow using Keycloak as the identity provider.

## What Has Been Implemented

### 1. Backend Changes

#### Database Schema Updates (`shared/schema.ts`)
- Added `keycloakId` field (unique identifier from Keycloak)
- Added `keycloakUsername` field (username from Keycloak)
- Made `password` field nullable (for OIDC-only users)

#### OIDC Service (`server/auth/keycloak.ts`)
A comprehensive Keycloak service that handles:
- OIDC discovery and client initialization
- Authorization URL generation with PKCE (Proof Key for Code Exchange)
- Authorization code exchange for tokens
- User info retrieval from Keycloak
- Token validation and refresh
- Logout URL generation

Key features:
- Uses `openid-client` v6 library
- Implements PKCE for public client security
- Supports HTTP for development (configurable)
- Handles token refresh for long-lived sessions

#### Storage Layer Updates (`server/storage.ts`)
New methods added:
- `getUserByKeycloakId()` - Find user by Keycloak ID
- `createOrUpdateUserFromKeycloak()` - Create new user or update existing user from Keycloak data
- Automatic account linking by email for existing users

#### Route Updates (`server/routes.ts`)
New OIDC endpoints:
- `GET /api/auth/login` - Redirects to Keycloak login page
- `GET /api/auth/callback` - Handles OIDC callback with authorization code
- `POST /api/auth/logout` - Logs out from both app and Keycloak

Authentication flow:
1. User clicks "Sign In with Keycloak"
2. Server generates authorization URL with PKCE parameters
3. User is redirected to Keycloak
4. User authenticates with Keycloak
5. Keycloak redirects back to callback URL with authorization code
6. Server exchanges code for tokens
7. Server retrieves user info from Keycloak
8. Server creates/updates user in database
9. Server creates session and redirects to dashboard

### 2. Frontend Changes

#### Home Page (`client/src/pages/home.tsx`)
- Removed custom login form
- All login buttons now redirect to `/api/auth/login`
- Simplified UI with "Sign In with Keycloak" buttons

#### Auth Hook (`client/src/hooks/useAuth.ts`)
- Updated logout to handle Keycloak logout URL
- Redirects to Keycloak logout endpoint to end SSO session
- Maintains existing session check functionality

### 3. Configuration Files

#### Environment Variables (`.env.example`)
```env
KEYCLOAK_URL=http://localhost:8090
KEYCLOAK_REALM=sapphire-ui
KEYCLOAK_CLIENT_ID=sapphire-ui
KEYCLOAK_REDIRECT_URI=http://localhost:5000/api/auth/callback
SESSION_SECRET=your-secure-session-secret
```

## Setup Instructions

### Step 1: Configure Keycloak

Follow the detailed instructions in `KEYCLOAK_SETUP_GUIDE.md`:

1. Access Keycloak Admin Console at `http://localhost:8090`
2. Create or verify realm `sapphire-ui`
3. Configure client `sapphire-ui`:
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Standard Flow Enabled: `ON`
   - Valid Redirect URIs: `http://localhost:5000/api/auth/callback`, `http://localhost:5000/*`
   - Web Origins: `http://localhost:5000`, `+`
4. Create test users in Keycloak

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env`:
   ```env
   KEYCLOAK_URL=http://localhost:8090
   KEYCLOAK_REALM=sapphire-ui
   KEYCLOAK_CLIENT_ID=sapphire-ui
   KEYCLOAK_REDIRECT_URI=http://localhost:5000/api/auth/callback
   SESSION_SECRET=generate-a-secure-random-string-here
   ```

### Step 3: Start the Application

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:5000`

### Step 4: Test the Authentication Flow

1. Click "Sign In with Keycloak" button
2. You should be redirected to Keycloak login page
3. Enter credentials for a test user
4. After successful authentication, you should be redirected back to the dashboard
5. Test logout functionality

## Authentication Flow Diagram

```
┌─────────┐                ┌─────────────┐                ┌──────────┐
│ Browser │                │   App       │                │ Keycloak │
└────┬────┘                └──────┬──────┘                └────┬─────┘
     │                            │                            │
     │  1. Click "Sign In"        │                            │
     ├───────────────────────────>│                            │
     │                            │                            │
     │  2. Redirect to /api/auth/login                        │
     │<───────────────────────────┤                            │
     │                            │                            │
     │  3. Generate auth URL      │                            │
     │    with PKCE               │                            │
     │                            │                            │
     │  4. Redirect to Keycloak   │                            │
     ├────────────────────────────┼───────────────────────────>│
     │                            │                            │
     │  5. Show login form        │                            │
     │<───────────────────────────┼────────────────────────────┤
     │                            │                            │
     │  6. Submit credentials     │                            │
     ├────────────────────────────┼───────────────────────────>│
     │                            │                            │
     │  7. Redirect to callback   │                            │
     │    with auth code          │                            │
     │<───────────────────────────┼────────────────────────────┤
     │                            │                            │
     │  8. GET /api/auth/callback?code=xxx                     │
     ├───────────────────────────>│                            │
     │                            │                            │
     │                            │  9. Exchange code for      │
     │                            │     tokens (with PKCE)     │
     │                            ├───────────────────────────>│
     │                            │                            │
     │                            │  10. Return tokens         │
     │                            │<───────────────────────────┤
     │                            │                            │
     │                            │  11. Get user info         │
     │                            ├───────────────────────────>│
     │                            │                            │
     │                            │  12. Return user data      │
     │                            │<───────────────────────────┤
     │                            │                            │
     │  13. Create session &      │                            │
     │      redirect to dashboard │                            │
     │<───────────────────────────┤                            │
     │                            │                            │
```

## Security Features

### PKCE (Proof Key for Code Exchange)
- Protects against authorization code interception attacks
- Required for public clients (no client secret)
- Code verifier stored in session, code challenge sent to Keycloak

### Session Management
- Server-side sessions with express-session
- Stores user ID, access token, ID token, and refresh token
- 24-hour session timeout (configurable)

### Token Storage
- Tokens stored server-side in session (not exposed to client)
- Access token used for API calls to Keycloak
- Refresh token can be used to obtain new access tokens

### State Parameter
- Prevents CSRF attacks
- Generated randomly and stored in session
- Validated on callback

## User Migration

The implementation supports seamless migration of existing users:

1. **First Keycloak Login**: When a user logs in with Keycloak for the first time:
   - System checks if user exists by Keycloak ID
   - If not found, checks if user exists by email
   - If found by email, links the existing account to Keycloak
   - If not found, creates a new user account

2. **Account Linking**: Existing users are automatically linked to their Keycloak accounts based on email address

3. **Data Preservation**: All existing health data is preserved during migration

## Troubleshooting

### Common Issues

#### 1. "Keycloak initialization failed"
- **Cause**: Cannot connect to Keycloak server
- **Solution**: 
  - Verify Keycloak is running at the configured URL
  - Check `KEYCLOAK_URL` in `.env`
  - Ensure realm name is correct

#### 2. "Invalid redirect URI"
- **Cause**: Redirect URI mismatch between app and Keycloak
- **Solution**:
  - Verify redirect URI in Keycloak client settings
  - Check `KEYCLOAK_REDIRECT_URI` in `.env`
  - Ensure exact match (including protocol and trailing slashes)

#### 3. "State mismatch"
- **Cause**: CSRF protection triggered or session expired
- **Solution**:
  - Clear browser cookies and try again
  - Check session configuration
  - Ensure cookies are enabled

#### 4. "Failed to exchange authorization code"
- **Cause**: PKCE verification failed or code expired
- **Solution**:
  - Check that code verifier is stored in session
  - Verify PKCE is enabled in Keycloak client
  - Authorization codes expire quickly (usually 60 seconds)

### Debug Mode

Enable debug logging:
1. Check server console for detailed error messages
2. Keycloak service logs initialization and errors
3. Route handlers log authentication flow steps

## Production Considerations

### Before Deploying to Production

1. **Enable HTTPS**:
   - Update all URLs to use HTTPS
   - Set `secure: true` in session cookie configuration
   - Update Keycloak client redirect URIs

2. **Update Keycloak Settings**:
   - Remove wildcard redirect URIs
   - Use specific production URLs only
   - Enable "Require SSL" in realm settings

3. **Secure Session Secret**:
   - Generate a strong, random session secret
   - Store in environment variables
   - Never commit to version control

4. **Configure CORS**:
   - Set specific allowed origins
   - Remove development wildcards

5. **Enable Email Verification**:
   - Configure SMTP in Keycloak
   - Enable email verification in realm settings

6. **Set Up Monitoring**:
   - Monitor authentication failures
   - Track token refresh rates
   - Set up alerts for errors

7. **Database Migration**:
   - Run database migrations to add new fields
   - Back up existing data
   - Test migration with production data copy

## Files Modified

### Backend
- `shared/schema.ts` - Database schema updates
- `server/auth/keycloak.ts` - New OIDC service
- `server/storage.ts` - Storage layer updates
- `server/routes.ts` - Authentication routes

### Frontend
- `client/src/pages/home.tsx` - Login UI updates
- `client/src/hooks/useAuth.ts` - Logout handling

### Configuration
- `.env.example` - Environment variable template
- `KEYCLOAK_SETUP_GUIDE.md` - Keycloak configuration guide
- `KEYCLOAK_OIDC_IMPLEMENTATION_PLAN.md` - Implementation plan

## Testing

### Manual Testing Checklist

- [ ] User can click "Sign In with Keycloak"
- [ ] User is redirected to Keycloak login page
- [ ] User can log in with Keycloak credentials
- [ ] User is redirected back to dashboard after login
- [ ] User session persists across page refreshes
- [ ] User can access protected routes
- [ ] User can log out successfully
- [ ] User is logged out from Keycloak (SSO logout)
- [ ] New users are created automatically
- [ ] Existing users are linked by email
- [ ] Error messages are displayed appropriately

### Automated Testing

Update Playwright tests to handle OIDC flow:
- Mock Keycloak responses for unit tests
- Use test Keycloak instance for integration tests
- Test error scenarios (invalid tokens, expired sessions, etc.)

## Support

For issues or questions:
1. Check `KEYCLOAK_SETUP_GUIDE.md` for configuration help
2. Review `KEYCLOAK_OIDC_IMPLEMENTATION_PLAN.md` for architecture details
3. Check Keycloak logs for authentication errors
4. Review server console for detailed error messages

## References

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [openid-client Library](https://github.com/panva/node-openid-client)