# Keycloak Authentication Options for Pure Frontend Apps

## Question: Can Keycloak OIDC be handled in a pure UI app, or MUST it go through BFF?

**Short Answer**: It depends on your security requirements and architecture, but **BFF is strongly recommended** for production applications.

---

## Option 1: Pure Frontend OIDC (Public Client) ⚠️

### How It Works
The frontend directly implements the OIDC Authorization Code Flow with PKCE (Proof Key for Code Exchange).

### Implementation
```typescript
// Using a library like oidc-client-ts or @react-keycloak/web
import { UserManager } from 'oidc-client-ts';

const userManager = new UserManager({
  authority: 'http://localhost:8090/realms/sapphire-ui',
  client_id: 'sapphire-ui-public',
  redirect_uri: 'http://localhost:5173/callback',
  response_type: 'code',
  scope: 'openid profile email',
  // PKCE is automatically enabled
});

// Login
await userManager.signinRedirect();

// Handle callback
const user = await userManager.signinRedirectCallback();

// Access token
const accessToken = user.access_token;
```

### Keycloak Configuration
```json
{
  "clientId": "sapphire-ui-public",
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": false,
  "redirectUris": ["http://localhost:5173/*"],
  "webOrigins": ["http://localhost:5173"],
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

### Pros ✅
- **Simpler architecture**: No BFF needed for auth
- **Faster development**: Direct integration
- **Standard OIDC flow**: Well-documented pattern
- **PKCE protection**: Mitigates authorization code interception

### Cons ❌
- **Token exposure**: Access tokens visible in browser (localStorage/sessionStorage)
- **XSS vulnerability**: Malicious scripts can steal tokens
- **No client secret**: Public clients can't authenticate themselves
- **Token refresh complexity**: Refresh tokens in browser are risky
- **CORS issues**: Direct calls to Keycloak may require CORS configuration
- **Limited backend validation**: GraphQL API must validate every token
- **Token storage debate**: No truly secure storage in browser

### Security Risks
1. **XSS Attacks**: If attacker injects JavaScript, they can steal tokens
2. **Token Leakage**: Tokens in localStorage persist across sessions
3. **No Secure Storage**: Browser has no equivalent to HTTP-only cookies
4. **Refresh Token Exposure**: Long-lived tokens in browser are dangerous

---

## Option 2: BFF-Managed OIDC (Confidential Client) ✅ RECOMMENDED

### How It Works
The BFF acts as a confidential OIDC client, handling the entire authentication flow server-side.

### Architecture Flow
```
1. User clicks "Login" 
   → Frontend redirects to BFF: /auth/login

2. BFF generates PKCE params, stores in server session
   → BFF redirects to Keycloak authorization endpoint

3. User authenticates with Keycloak
   → Keycloak redirects to BFF: /auth/callback?code=...

4. BFF exchanges code for tokens (using client secret + PKCE)
   → BFF validates tokens
   → BFF creates user session (HTTP-only cookie)
   → BFF redirects to Frontend: /dashboard

5. Frontend makes GraphQL requests with session cookie
   → BFF validates session
   → BFF uses stored access token to call other APIs
   → BFF returns data to frontend
```

### Implementation

#### BFF Endpoints
```typescript
// BFF handles OIDC flow
app.get('/auth/login', async (req, res) => {
  const { url, codeVerifier, state } = await generateAuthUrl();
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const { codeVerifier } = req.session;
  
  // Exchange code for tokens using client secret
  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  
  // Store tokens server-side
  req.session.accessToken = tokens.access_token;
  req.session.refreshToken = tokens.refresh_token;
  req.session.userId = tokens.sub;
  
  res.redirect('/dashboard');
});
```

#### Frontend
```typescript
// Frontend just redirects
const handleLogin = () => {
  window.location.href = `${BFF_URL}/auth/login`;
};

// GraphQL requests automatically include session cookie
const { data } = useQuery(GET_USER, {
  // Cookie sent automatically with credentials: 'include'
});
```

### Keycloak Configuration
```json
{
  "clientId": "sapphire-bff",
  "publicClient": false,
  "clientAuthenticatorType": "client-secret",
  "secret": "your-client-secret-here",
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": false,
  "redirectUris": ["http://bff-api:4000/auth/callback"],
  "webOrigins": ["http://localhost:5173"],
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

### Pros ✅
- **Secure token storage**: Tokens never exposed to browser
- **HTTP-only cookies**: Protected from XSS attacks
- **Client secret**: BFF can authenticate itself to Keycloak
- **Centralized validation**: BFF validates tokens once
- **Token refresh**: Handled server-side transparently
- **Session management**: Proper server-side sessions
- **CORS control**: BFF manages all external API calls
- **Audit trail**: All auth events logged server-side

### Cons ❌
- **Additional complexity**: Requires BFF infrastructure
- **Session management**: Need Redis/database for distributed sessions
- **Latency**: Extra hop through BFF
- **Scaling**: BFF becomes critical path

### Security Benefits
1. **XSS Protection**: Tokens never in JavaScript scope
2. **CSRF Protection**: Can implement CSRF tokens
3. **Token Rotation**: Refresh tokens handled securely
4. **Centralized Auth**: Single point for security policies
5. **Audit Logging**: All auth events tracked

---

## Option 3: Hybrid Approach (Token Exchange)

### How It Works
Frontend gets ID token from Keycloak, exchanges it with BFF for session cookie.

### Flow
```
1. Frontend performs OIDC flow with public client
2. Frontend receives ID token
3. Frontend sends ID token to BFF: POST /auth/exchange
4. BFF validates ID token with Keycloak
5. BFF creates session, returns HTTP-only cookie
6. Frontend uses cookie for subsequent requests
```

### Pros ✅
- **Flexible**: Frontend can handle initial auth
- **Secure storage**: Tokens moved to HTTP-only cookies
- **Progressive enhancement**: Can add BFF features gradually

### Cons ❌
- **Complex**: Two auth flows to maintain
- **Token exposure**: ID token briefly in browser
- **Coordination**: Frontend and BFF must stay in sync

---

## Comparison Table

| Feature | Pure Frontend | BFF-Managed | Hybrid |
|---------|--------------|-------------|--------|
| **Token Security** | ⚠️ Low | ✅ High | ⚠️ Medium |
| **XSS Protection** | ❌ No | ✅ Yes | ⚠️ Partial |
| **Implementation Complexity** | ✅ Simple | ⚠️ Complex | ❌ Very Complex |
| **Scalability** | ✅ High | ⚠️ Medium | ⚠️ Medium |
| **CORS Issues** | ⚠️ Possible | ✅ None | ⚠️ Possible |
| **Client Secret** | ❌ No | ✅ Yes | ✅ Yes |
| **Token Refresh** | ⚠️ Risky | ✅ Secure | ✅ Secure |
| **Audit Trail** | ⚠️ Limited | ✅ Complete | ✅ Complete |
| **Production Ready** | ⚠️ Depends | ✅ Yes | ⚠️ Depends |

---

## Recommendation for Sapphire UI

### ✅ Use BFF-Managed OIDC (Option 2)

**Reasons:**
1. **You already have a BFF**: The sapphire-bff-api exists
2. **Healthcare data**: Requires highest security standards
3. **Compliance**: HIPAA/GDPR may require secure token handling
4. **Token exposure risk**: Health data access tokens should never be in browser
5. **Centralized security**: Easier to audit and maintain
6. **Future-proof**: Can add features like token introspection, MFA, etc.

### Implementation Steps

#### 1. Configure Keycloak Client (Confidential)
```bash
# In Keycloak Admin Console
Client ID: sapphire-bff
Client Protocol: openid-connect
Access Type: confidential
Standard Flow: Enabled
Direct Access Grants: Disabled
Valid Redirect URIs: http://localhost:4000/auth/callback
Web Origins: http://localhost:5173
```

#### 2. BFF Implementation
```typescript
// BFF handles all OIDC logic
import { Issuer, generators } from 'openid-client';

const keycloakIssuer = await Issuer.discover(
  'http://localhost:8090/realms/sapphire-ui'
);

const client = new keycloakIssuer.Client({
  client_id: 'sapphire-bff',
  client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
  redirect_uris: ['http://localhost:4000/auth/callback'],
  response_types: ['code'],
});

// Login endpoint
app.get('/auth/login', (req, res) => {
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;
  
  const authUrl = client.authorizationUrl({
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
  });
  
  res.redirect(authUrl);
});

// Callback endpoint
app.get('/auth/callback', async (req, res) => {
  const params = client.callbackParams(req);
  const { codeVerifier, state } = req.session;
  
  const tokenSet = await client.callback(
    'http://localhost:4000/auth/callback',
    params,
    { code_verifier: codeVerifier, state }
  );
  
  // Store tokens in session (server-side)
  req.session.accessToken = tokenSet.access_token;
  req.session.refreshToken = tokenSet.refresh_token;
  req.session.idToken = tokenSet.id_token;
  req.session.userId = tokenSet.claims().sub;
  
  res.redirect('http://localhost:5173/dashboard');
});

// GraphQL context includes user from session
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    userId: req.session.userId,
    accessToken: req.session.accessToken,
  }),
});
```

#### 3. Frontend Implementation
```typescript
// Simple redirect for login
const handleLogin = () => {
  window.location.href = 'http://localhost:4000/auth/login';
};

// GraphQL client with credentials
const apolloClient = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  credentials: 'include', // Send cookies
  cache: new InMemoryCache(),
});

// Logout
const [logout] = useMutation(LOGOUT_MUTATION, {
  onCompleted: () => {
    window.location.href = '/';
  },
});
```

#### 4. Session Configuration
```typescript
// BFF session setup
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only in production
    httpOnly: true, // Prevent JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // CSRF protection
  },
}));
```

---

## When Pure Frontend OIDC Might Be Acceptable

### Low-Risk Scenarios
- **Internal tools**: Not exposed to internet
- **Read-only data**: No sensitive information
- **Short-lived sessions**: Tokens expire quickly
- **Prototype/Demo**: Not production application
- **Public data**: No authentication actually needed

### Additional Mitigations
If you must use pure frontend OIDC:
1. **Use PKCE**: Always enable PKCE
2. **Short token lifetime**: 5-15 minutes max
3. **Refresh token rotation**: New refresh token with each use
4. **Token binding**: Bind tokens to browser fingerprint
5. **Content Security Policy**: Strict CSP headers
6. **Subresource Integrity**: Verify all scripts
7. **Regular security audits**: Penetration testing

---

## Conclusion

### For Sapphire UI: **BFF-Managed OIDC is REQUIRED**

**Why:**
- Healthcare application with sensitive data
- Compliance requirements (HIPAA, GDPR)
- BFF already exists in architecture
- Security best practices mandate server-side token handling
- Future scalability and feature additions

**The pure frontend approach is NOT recommended** for production healthcare applications due to:
- Token exposure risks
- XSS vulnerability
- Compliance violations
- Audit trail limitations

---

## Additional Resources

- [OAuth 2.0 for Browser-Based Apps (BCP)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Keycloak Securing Applications Guide](https://www.keycloak.org/docs/latest/securing_apps/)
- [Why JWTs in LocalStorage is a Bad Idea](https://dev.to/rdegges/please-stop-using-local-storage-1i04)

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-09  
**Recommendation**: Use BFF-Managed OIDC for Sapphire UI