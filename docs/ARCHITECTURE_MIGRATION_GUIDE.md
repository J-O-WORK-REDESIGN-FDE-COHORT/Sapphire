# Sapphire UI Architecture Migration Guide

## Overview
This document explains the architectural changes required to convert Sapphire UI from a full-stack Express application to a pure frontend React application that communicates with a BFF (Backend-for-Frontend) GraphQL API.

---

## 1. Architecture Changes

### Previous Architecture
```
┌─────────────────────────────────────────┐
│         Sapphire UI (Full Stack)       │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   React UI   │    │ Express API  │  │
│  │  (Frontend)  │◄───┤  (Backend)   │  │
│  └──────────────┘    └──────────────┘  │
│                            │            │
│                            ▼            │
│                      ┌──────────┐       │
│                      │ Database │       │
│                      └──────────┘       │
└─────────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  Keycloak    │
    │   (Auth)     │
    └──────────────┘
```

### New Architecture
```
┌──────────────────┐
│   Sapphire UI    │
│  (Pure Frontend) │
│   React + Vite   │
└────────┬─────────┘
         │
         │ GraphQL
         ▼
┌──────────────────┐
│   Sapphire BFF   │
│   GraphQL API    │
│  (Backend for    │
│    Frontend)     │
└────────┬─────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────┐    ┌──────────────┐
│  Microservices│    │  Databases   │
│  (Event API,  │    │              │
│   Notification│    │              │
│   API, etc.)  │    │              │
└──────────────┘    └──────────────┘
         │
         ▼
    ┌──────────────┐
    │  Keycloak    │
    │   (Auth)     │
    └──────────────┘
```

---

## 2. Key Changes Made

### 2.1 Backend Removal
**What was removed:**
- ✅ `server/` directory (Express backend)
- ✅ `server/index.ts` - Express server setup
- ✅ `server/routes.ts` - REST API routes
- ✅ `server/routes-notification.ts` - Notification routes
- ✅ `server/db.ts` - Database connection
- ✅ `server/storage.ts` - File storage
- ✅ `server/auth/keycloak.ts` - Backend Keycloak integration
- ✅ `shared/schema.ts` - Database schema (Drizzle ORM)

**Why removed:**
- All data operations now handled by BFF GraphQL API
- No direct database access from UI
- Authentication moved to frontend OIDC flow

### 2.2 Frontend Authentication Changes

#### Previous: Backend Session-Based Auth
```typescript
// Backend handled auth with express-session
app.use(session({
  secret: process.env.SESSION_SECRET,
  // ...
}));

// Routes protected by middleware
app.get('/api/protected', requireAuth, (req, res) => {
  // Access user from session
});
```

#### New: Frontend OIDC with PKCE
```typescript
// Frontend handles auth with oidc-client-ts
import { UserManager } from 'oidc-client-ts';

const userManager = new UserManager({
  authority: VITE_KEYCLOAK_URL + '/realms/' + VITE_KEYCLOAK_REALM,
  client_id: VITE_KEYCLOAK_CLIENT_ID,
  redirect_uri: VITE_KEYCLOAK_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid profile email',
  // PKCE enabled by default
});

// Login
await userManager.signinRedirect();

// Get token for API calls
const user = await userManager.getUser();
const token = user?.access_token;
```

**Key Differences:**
1. **Token Storage**: Session storage (browser) instead of server session
2. **Flow**: Authorization Code Flow with PKCE (more secure for SPAs)
3. **Token Management**: Frontend manages token refresh
4. **API Authentication**: Bearer token in Authorization header

### 2.3 API Communication Changes

#### Previous: REST API Calls
```typescript
// Direct fetch to Express backend
const response = await fetch('/api/health-data', {
  credentials: 'include' // Send session cookie
});
```

#### New: GraphQL API Calls
```typescript
// Apollo Client with Bearer token
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const authLink = setContext(async (_, { headers }) => {
  const user = await userManager.getUser();
  return {
    headers: {
      ...headers,
      authorization: user?.access_token ? `Bearer ${user.access_token}` : '',
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// Query data
const { data } = useQuery(GET_HEALTH_DATA);
```

---

## 3. Keycloak Configuration Changes

### 3.1 Client Configuration

#### Previous Configuration (Backend Client)
```
Client ID: sapphire-ui
Access Type: confidential
Valid Redirect URIs: http://localhost:5000/api/auth/callback
Web Origins: http://localhost:5000
```

**For Docker Deployment (port 5173):**
```
Valid Redirect URIs:
  - http://localhost:5173/callback
  - http://localhost:5173/silent-renew.html
Post Logout Redirect URIs:
  - http://localhost:5173
Web Origins:
  - http://localhost:5173
```

### 3.2 CORS Configuration

**Critical for Frontend OIDC:**

1. **Keycloak Admin Console** → Realm Settings → General:
   - Frontend URL: `http://localhost:8090`

2. **Client Settings** → Advanced Settings:
   - Web Origins: Add all frontend URLs
   - Enable CORS

3. **Realm Settings** → Security Defenses:
   - Ensure CORS is not blocked

### 3.3 Token Settings

**Recommended Settings:**
- Access Token Lifespan: 5 minutes
- SSO Session Idle: 30 minutes
- SSO Session Max: 10 hours
- Client Session Idle: 30 minutes
- Client Session Max: 10 hours

---

## 4. Docker Configuration Changes

### 4.1 Dockerfile Changes

#### Previous Dockerfile (Full Stack)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

#### New Dockerfile (Frontend Only)
```dockerfile
# Use Node.js Alpine image
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
```

**Key Changes:**
- Single-stage build (simpler)
- Vite preview server serves built files
- Port 5173 (same as dev)
- Node.js runtime for Vite preview

### 4.2 Vite Preview Configuration

**Purpose:** Serve built files using Vite's preview server

The Vite preview server is configured via command line arguments in the Dockerfile:
```bash
npm run preview -- --host 0.0.0.0 --port 5173
```

- `--host 0.0.0.0`: Allows external connections (required for Docker)
- `--port 5173`: Uses port 5173 (same as development)

**Note:** nginx.conf is not needed with this approach, but is kept for reference if you want to use nginx instead.

### 4.3 Podman Compose Changes

#### Previous Service Configuration
```yaml
sapphire-fitconnect:
  image: manisha3101/sapphire-fitconnect:1.0.11
  container_name: sapphire-fitconnect
  depends_on:
    postgres:
      condition: service_healthy
    keycloak:
      condition: service_healthy
  env_file:
    - ./config/sapphire.env
  ports:
    - "5000:5000"
  networks:
    - backend
```

#### New Service Configuration
```yaml
sapphire-ui:
  image: manisha3101/sapphire-ui:2.0.0  # New image
  container_name: sapphire-ui
  depends_on:
    keycloak:
      condition: service_healthy
    # Remove postgres dependency - UI doesn't need direct DB access
  env_file:
    - ./config/sapphire-ui.env  # New env file
  ports:
    - "5173:5173"  # Vite preview port
  networks:
    - backend
```

**Key Changes:**
1. **Image name**: `sapphire-fitconnect` → `sapphire-ui`
2. **Port**: `5000:5000` → `5173:5173`
3. **Dependencies**: Removed `postgres`, kept `keycloak`
4. **Environment file**: New file with VITE_ prefixed variables

### 4.4 Environment File Changes

#### Previous: sapphire.env (Backend Variables)
```env
# Backend configuration
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=saphhire-ui
KEYCLOAK_CLIENT_ID=sapphire-ui
KEYCLOAK_REDIRECT_URI=http://localhost:5000/api/auth/callback
SESSION_SECRET=change-this-secret
DATABASE_URL=postgresql://admin:admin123@postgres:5432/myapp_db
NODE_ENV=development
PORT=5000
```

#### New: sapphire-ui.env (Frontend Variables)
```env
# Frontend configuration (VITE_ prefix required)
VITE_BFF_API_URL=http://sapphire-bff-api:4000/graphql
VITE_KEYCLOAK_URL=http://localhost:8090
VITE_KEYCLOAK_REALM=saphhire-ui
VITE_KEYCLOAK_CLIENT_ID=sapphire-ui
VITE_KEYCLOAK_REDIRECT_URI=http://localhost:5173/callback
VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
VITE_NOTIFICATION_API_URL=http://sapphire-notification-api:8084
```

**Critical Changes:**
1. **VITE_ prefix**: Required for Vite to expose variables to frontend
2. **BFF API URL**: Points to GraphQL API container
3. **Redirect URIs**: Updated for port 5173 (Vite preview)
4. **Removed**: DATABASE_URL, SESSION_SECRET, PORT (backend-only)
5. **Container names**: Use internal container names for container-to-container communication

---

## 5. Package.json Changes

### Dependencies Removed
```json
{
  "dependencies": {
    // Backend dependencies removed:
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "passport": "^0.6.0",
    "passport-oauth2": "^1.7.0",
    "drizzle-orm": "^0.28.6",
    "postgres": "^3.3.5",
    "@types/express": "^4.17.17",
    "@types/express-session": "^1.17.7",
    "@types/passport": "^1.0.12"
  }
}
```

### Dependencies Added
```json
{
  "dependencies": {
    // Frontend auth
    "oidc-client-ts": "^3.0.1",
    "jwt-decode": "^4.0.0",
    
    // GraphQL client
    "@apollo/client": "^3.8.8",
    "graphql": "^16.8.1"
  }
}
```

### Scripts Updated
```json
{
  "scripts": {
    // Removed backend scripts
    "dev": "vite",  // Was: tsx watch server/index.ts
    "build": "vite build",  // Was: tsc && vite build
    "preview": "vite preview"  // Was: node dist/index.js
  }
}
```

---

## 6. File Structure Changes

### Before (Full Stack)
```
sapphire/
├── client/              # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       └── hooks/
├── server/              # Express backend ❌ REMOVED
│   ├── index.ts
│   ├── routes.ts
│   ├── db.ts
│   └── auth/
├── shared/              # Shared types ❌ REMOVED
│   └── schema.ts
├── package.json
└── vite.config.ts
```

### After (Frontend Only)
```
sapphire/
├── client/              # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       │   ├── callback.tsx      # ✅ NEW: OIDC callback
│       │   └── dashboard.tsx
│       ├── hooks/
│       │   └── useAuth.ts        # ✅ UPDATED: OIDC auth
│       ├── services/
│       │   └── authService.ts    # ✅ NEW: OIDC service
│       └── lib/
│           └── queryClient.ts    # ✅ UPDATED: Apollo Client
├── public/
│   └── silent-renew.html         # ✅ NEW: Token refresh
├── nginx.conf                     # ✅ NEW: Nginx config
├── Dockerfile                     # ✅ UPDATED: Multi-stage
├── package.json                   # ✅ UPDATED: Dependencies
└── vite.config.ts                # ✅ UPDATED: Env config
```

---

## 7. Implementation Checklist

### ✅ Completed Changes

#### Frontend Authentication
- [x] Install `oidc-client-ts` and `jwt-decode`
- [x] Create `authService.ts` with UserManager
- [x] Create `/callback` page for OIDC redirect
- [x] Create `silent-renew.html` for token refresh
- [x] Update `useAuth` hook for OIDC
- [x] Update home page with login button
- [x] Update App.tsx with protected routes

#### GraphQL Integration
- [x] Install `@apollo/client` and `graphql`
- [x] Create Apollo Client with auth link
- [x] Update `queryClient.ts` with Bearer token
- [x] Wrap app with ApolloProvider
- [x] Create GraphQL queries/mutations

#### Backend Removal
- [x] Remove `server/` directory
- [x] Remove `shared/schema.ts`
- [x] Update package.json (remove backend deps)
- [x] Update scripts (remove backend commands)

#### Configuration
- [x] Update `.env` with VITE_ prefixed variables
- [x] Update `vite.config.ts` for env loading
- [x] Create nginx.conf
- [x] Update Dockerfile for multi-stage build

#### Documentation
- [x] Create Keycloak setup guide
- [x] Create CORS fix documentation
- [x] Create migration summary

### 🔄 Pending Changes (Deployment)

#### Docker & Compose
- [ ] Build new Docker image
  ```bash
  docker build -t manisha3101/sapphire-ui:2.0.0 .
  docker push manisha3101/sapphire-ui:2.0.0
  ```

- [ ] Create `sapphire-ui.env` in compose config directory
  ```bash
  # Location: C:\Work\Offering\digital-product-delivery-workshop\setup\podman\compose\config\sapphire-ui.env
  ```

- [ ] Update `podman-compose.yml`:
  - Replace `sapphire-fitconnect` service with `sapphire-ui`
  - Update image name and version
  - Change port mapping to `5173:5173`
  - Remove postgres dependency
  - Update env_file reference

#### Keycloak Configuration
- [ ] Update Keycloak client settings:
  - Change Access Type to `public`
  - Add new redirect URIs for port 5173
  - Add web origins for CORS
  - Configure token lifespans

- [ ] Test OIDC flow:
  - Login redirect
  - Token acquisition
  - Token refresh
  - Logout

#### BFF API Integration
- [ ] Verify BFF API is running
- [ ] Test GraphQL endpoint connectivity
- [ ] Verify authentication with Bearer tokens
- [ ] Test all queries and mutations

---

## 8. Testing Strategy

### Local Development Testing
1. **Start Keycloak**: Ensure running on port 8090
2. **Start BFF API**: Ensure running on port 4000
3. **Start UI**: `npm run dev` (port 5173)
4. **Test Flow**:
   - Login → Should redirect to Keycloak
   - Authenticate → Should redirect back to /callback
   - Dashboard → Should load with user data
   - Logout → Should clear session

### Docker Testing
1. **Build Image**: `docker build -t sapphire-ui:test .`
2. **Run Container**:
   ```bash
   docker run -p 5173:5173 \
     -e VITE_BFF_API_URL=http://localhost:4000/graphql \
     -e VITE_KEYCLOAK_URL=http://localhost:8090 \
     sapphire-ui:test
   ```
3. **Test**: Access http://localhost:5173

### Compose Testing
1. **Update compose file**
2. **Start services**: `podman-compose up -d`
3. **Check logs**: `podman-compose logs -f sapphire-ui`
4. **Test**: Access http://localhost

---

## 9. Troubleshooting

### Common Issues

#### 1. CORS Errors
**Symptom**: "Access to fetch blocked by CORS policy"

**Solutions**:
- Check Keycloak Web Origins includes frontend URL
- Verify BFF API has CORS enabled
- Check nginx proxy headers if using proxy

#### 2. Redirect Loop
**Symptom**: Continuous redirects between app and Keycloak

**Solutions**:
- Verify redirect URIs match exactly (including trailing slash)
- Check callback page is handling auth correctly
- Ensure token is being stored in session storage

#### 3. Token Not Sent to API
**Symptom**: API returns 401 Unauthorized

**Solutions**:
- Check Apollo Client auth link is configured
- Verify token exists in session storage
- Check Authorization header format: `Bearer <token>`

#### 4. Environment Variables Not Loading
**Symptom**: `undefined` for VITE_ variables

**Solutions**:
- Ensure variables have `VITE_` prefix
- Check `vite.config.ts` has `envDir` configured
- Restart dev server after .env changes
- For Docker: Pass as build args or runtime env vars

---

## 10. Security Considerations

### Frontend Security
1. **Token Storage**: Session storage (cleared on tab close)
2. **PKCE**: Enabled by default in oidc-client-ts
3. **Token Refresh**: Silent refresh using iframe
4. **XSS Protection**: React escapes by default
5. **HTTPS**: Required in production

### API Security
1. **Bearer Tokens**: All API calls include access token
2. **Token Validation**: BFF validates tokens with Keycloak
3. **Short-lived Tokens**: 5-minute access token lifespan
4. **Refresh Tokens**: Automatic silent refresh

### Keycloak Security
1. **Public Client**: No client secret (SPA pattern)
2. **PKCE**: Prevents authorization code interception
3. **Token Binding**: Tokens bound to client
4. **Session Management**: Keycloak manages SSO sessions

---

## 11. Migration Benefits

### Performance
- ✅ Faster initial load (static files from nginx)
- ✅ Better caching (CDN-friendly)
- ✅ Reduced server load (no session management)

### Scalability
- ✅ Horizontal scaling (stateless frontend)
- ✅ CDN distribution (static assets)
- ✅ Independent deployment (UI vs BFF)

### Security
- ✅ No session hijacking (token-based)
- ✅ PKCE protection (authorization code flow)
- ✅ Reduced attack surface (no backend in UI)

### Development
- ✅ Faster builds (no backend compilation)
- ✅ Better separation of concerns
- ✅ Easier testing (mock GraphQL)

---

## 12. Next Steps

1. **Build and Push Docker Image**
   ```bash
   cd c:/Work/Offering/Sapphire
   docker build -t manisha3101/sapphire-ui:2.0.0 .
   docker push manisha3101/sapphire-ui:2.0.0
   ```

2. **Create Environment File**
   - Create `sapphire-ui.env` in compose config directory
   - Copy variables from this guide
   - Update URLs for your environment

3. **Update Compose File**
   - Replace `sapphire-fitconnect` service
   - Update dependencies and ports
   - Reference new env file

4. **Update Keycloak**
   - Change client to public
   - Add new redirect URIs
   - Configure CORS

5. **Deploy and Test**
   - Start compose services
   - Test authentication flow
   - Verify API connectivity
   - Check all features

---

## 13. Support and Resources

### Documentation
- [Keycloak OIDC Setup Guide](./KEYCLOAK_SETUP_GUIDE.md)
- [CORS Fix Documentation](./docs/KEYCLOAK_CORS_FIX.md)
- [Notification Integration](./NOTIFICATION_INTEGRATION_GUIDE.md)

### External Resources
- [oidc-client-ts Documentation](https://github.com/authts/oidc-client-ts)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-09  
**Author**: Bob (AI Assistant)