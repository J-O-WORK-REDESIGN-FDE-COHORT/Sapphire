# Keycloak Setup Guide for Sapphire Healthcare Application

## Prerequisites

- Keycloak server running at `http://localhost:8090`
- Admin access to Keycloak Admin Console
- Realm name: `sapphire-ui`

## Step-by-Step Configuration

### 1. Access Keycloak Admin Console

1. Navigate to `http://localhost:8090`
2. Click on "Administration Console"
3. Login with admin credentials

### 2. Create or Verify Realm

1. In the top-left dropdown, check if `sapphire-ui` realm exists
2. If not, create it:
   - Click "Add realm"
   - Name: `sapphire-ui`
   - Click "Create"

### 3. Configure Client

#### Navigate to Client Settings
1. Click "Clients" in the left sidebar
2. Find or create `sapphire-ui` client
3. If creating new:
   - Click "Create"
   - Client ID: `sapphire-ui`
   - Client Protocol: `openid-connect`
   - Click "Save"

#### Configure Client Settings

**Settings Tab:**
```
Client ID: sapphire-ui
Name: Sapphire Healthcare UI
Description: Healthcare wellness application
Enabled: ON
Consent Required: OFF
Client Protocol: openid-connect
Access Type: public
Standard Flow Enabled: ON
Implicit Flow Enabled: OFF
Direct Access Grants Enabled: OFF
Service Accounts Enabled: OFF
Authorization Enabled: OFF
```

**Valid Redirect URIs:**
```
http://localhost:5000/api/auth/callback
http://localhost:5000/*
```

**Web Origins:**
```
http://localhost:5000
+
```
(The `+` allows all valid redirect URIs)

**Root URL:**
```
http://localhost:5000
```

**Base URL:**
```
/
```

**Admin URL:**
```
(leave empty)
```

Click "Save" at the bottom

#### Advanced Settings (Optional)

**Fine Grain OpenID Connect Configuration:**
```
Access Token Lifespan: 5 Minutes (default)
Client Session Idle: 30 Minutes
Client Session Max: 10 Hours
```

### 4. Configure Realm Settings

#### Login Tab
1. Click "Realm Settings" in left sidebar
2. Click "Login" tab
3. Configure as needed:
   ```
   User registration: ON/OFF (based on requirements)
   Forgot password: ON (recommended)
   Remember me: ON (recommended)
   Verify email: ON (recommended for production)
   Login with email: ON
   Duplicate emails: OFF
   Require SSL: none (for development), all requests (for production)
   ```

#### Tokens Tab
1. Click "Tokens" tab
2. Configure token lifespans:
   ```
   Access Token Lifespan: 5 Minutes
   Access Token Lifespan For Implicit Flow: 15 Minutes
   Client login timeout: 1 Minutes
   Login timeout: 30 Minutes
   Login action timeout: 5 Minutes
   ```

### 5. Create Test Users

1. Click "Users" in left sidebar
2. Click "Add user"
3. Fill in details:
   ```
   Username: testuser
   Email: testuser@example.com
   First Name: Test
   Last Name: User
   Email Verified: ON
   Enabled: ON
   ```
4. Click "Save"
5. Go to "Credentials" tab
6. Set password:
   - Password: (choose a password)
   - Password Confirmation: (same password)
   - Temporary: OFF
7. Click "Set Password"

Repeat for additional test users as needed.

### 6. Configure Client Scopes (Optional)

The default scopes should work, but you can customize:

1. Click "Client Scopes" in left sidebar
2. Verify these scopes exist:
   - `openid` (required)
   - `profile` (recommended)
   - `email` (recommended)

### 7. Verify OIDC Endpoints

1. Click "Realm Settings" in left sidebar
2. Click "General" tab
3. Click "OpenID Endpoint Configuration" link
4. Verify you can access the well-known configuration:
   ```
   http://localhost:8090/realms/sapphire-ui/.well-known/openid-configuration
   ```

This should return JSON with endpoints like:
```json
{
  "issuer": "http://localhost:8090/realms/sapphire-ui",
  "authorization_endpoint": "http://localhost:8090/realms/sapphire-ui/protocol/openid-connect/auth",
  "token_endpoint": "http://localhost:8090/realms/sapphire-ui/protocol/openid-connect/token",
  "userinfo_endpoint": "http://localhost:8090/realms/sapphire-ui/protocol/openid-connect/userinfo",
  ...
}
```

### 8. Test Configuration

Before integrating with the application, test the configuration:

1. Navigate to the authorization endpoint in a browser:
   ```
   http://localhost:8090/realms/sapphire-ui/protocol/openid-connect/auth?client_id=sapphire-ui&redirect_uri=http://localhost:5000/api/auth/callback&response_type=code&scope=openid%20profile%20email
   ```

2. You should see the Keycloak login page
3. Login with test user credentials
4. You should be redirected to the callback URL (which will error until the app is configured)

## Environment Variables for Application

After completing the setup, configure these environment variables in your application:

```env
KEYCLOAK_URL=http://localhost:8090
KEYCLOAK_REALM=sapphire-ui
KEYCLOAK_CLIENT_ID=sapphire-ui
KEYCLOAK_REDIRECT_URI=http://localhost:5000/api/auth/callback
SESSION_SECRET=your-secure-random-secret-here
```

## Production Considerations

### Security Settings

1. **Enable SSL/TLS:**
   - Realm Settings → Login → Require SSL: "all requests"
   - Update all URLs to use HTTPS

2. **Update Redirect URIs:**
   - Remove wildcard URIs
   - Use specific production URLs only
   - Example: `https://app.example.com/api/auth/callback`

3. **Enable Email Verification:**
   - Realm Settings → Login → Verify email: ON
   - Configure SMTP settings in Realm Settings → Email

4. **Configure Session Timeouts:**
   - Reduce token lifespans for production
   - Enable "Revoke Refresh Token" in Realm Settings → Tokens

5. **Enable Security Features:**
   - Realm Settings → Security Defenses
   - Enable "Brute Force Detection"
   - Configure headers and CORS policies

### High Availability

1. **Database:**
   - Configure Keycloak to use PostgreSQL instead of H2
   - Set up database replication

2. **Clustering:**
   - Deploy multiple Keycloak instances
   - Configure load balancer
   - Enable distributed caching

3. **Monitoring:**
   - Enable Keycloak metrics
   - Set up health check endpoints
   - Configure logging and alerting

## Troubleshooting

### Common Issues

**Issue: "Invalid redirect URI"**
- Solution: Verify redirect URI in client settings matches exactly
- Check for trailing slashes
- Ensure protocol (http/https) matches

**Issue: "Client not found"**
- Solution: Verify client ID is exactly `sapphire-ui`
- Check that client is enabled
- Verify you're in the correct realm

**Issue: "Invalid token"**
- Solution: Check token expiration settings
- Verify system clocks are synchronized
- Check issuer URL matches

**Issue: "CORS error"**
- Solution: Add application URL to Web Origins in client settings
- Use `+` to allow all valid redirect URIs

### Debug Mode

Enable debug logging in Keycloak:
1. Navigate to `standalone/configuration/standalone.xml`
2. Find the logging subsystem
3. Add logger for OIDC:
   ```xml
   <logger category="org.keycloak.protocol.oidc">
       <level name="DEBUG"/>
   </logger>
   ```

## Testing Checklist

- [ ] Can access Keycloak admin console
- [ ] Realm `sapphire-ui` exists and is active
- [ ] Client `sapphire-ui` is configured correctly
- [ ] Test user can login to Keycloak
- [ ] OIDC endpoints are accessible
- [ ] Redirect URIs are configured
- [ ] Web origins are configured
- [ ] Token lifespans are appropriate
- [ ] Email settings configured (if using email verification)

## Next Steps

After completing this setup:
1. Note down the configuration details
2. Proceed with application integration
3. Test the complete authentication flow
4. Configure production settings before deployment

## Support Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OIDC Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)