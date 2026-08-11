# Sapphire Wellness UI

A modern healthcare dashboard built with React, TypeScript, and Vite. This is a pure frontend application that integrates with a Backend-for-Frontend (BFF) GraphQL API and uses Keycloak for authentication.

![Sapphire Wellness](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF?logo=vite)

## 🎯 Overview

Sapphire Wellness is a comprehensive health monitoring dashboard that allows users to:
- Track heart rate, blood pressure, activity, and sleep data
- View health trends with interactive charts (Recharts)
- Receive real-time notifications
- Upgrade to premium features
- Secure authentication via Keycloak OIDC

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend (Vite)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  OIDC Authentication (oidc-client-ts + PKCE)     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Apollo GraphQL Client (Bearer Token Auth)       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              BFF GraphQL API (Port 4000)                │
│  - Token Validation                                     │
│  - Business Logic                                       │
│  - Data Aggregation                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│         Keycloak (Port 8090) + Database + Services      │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Running BFF GraphQL API (see [sapphire-bff-api](../sapphire-bff-api))
- Keycloak server configured

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Sapphire

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the root directory:

```bash
# BFF GraphQL API
VITE_BFF_API_URL=http://localhost:4000/graphql

# Keycloak Configuration
VITE_KEYCLOAK_URL=http://localhost:8090
VITE_KEYCLOAK_REALM=sapphire-ui
VITE_KEYCLOAK_CLIENT_ID=sapphire-ui-public
VITE_KEYCLOAK_REDIRECT_URI=http://localhost:5173/callback
VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:5173

# Notification API (Optional)
VITE_NOTIFICATION_API_URL=http://localhost:8084

# Segment Analytics (Optional)
VITE_SEGMENT_WRITE_KEY=your-segment-key
```

## 📦 Tech Stack

### Core
- **React 18.3.1** - UI library
- **TypeScript 5.6.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server

### Authentication
- **oidc-client-ts 3.4.1** - OIDC/OAuth2 client with PKCE
- **jwt-decode 4.0.0** - JWT token decoding

### Data & API
- **@apollo/client 4.1.4** - GraphQL client
- **@tanstack/react-query 5.60.5** - Server state management
- **graphql 16.12.0** - GraphQL core

### UI Components
- **Radix UI** - Accessible component primitives
- **Tailwind CSS 3.4.17** - Utility-first CSS
- **Recharts 2.15.2** - Data visualization
- **Lucide React 0.453.0** - Icons
- **Framer Motion 11.13.1** - Animations

### Routing & Forms
- **Wouter 3.3.5** - Lightweight routing
- **React Hook Form 7.55.0** - Form management
- **Zod 3.24.2** - Schema validation

## 🔐 Authentication Flow

1. User clicks "Login" → Redirects to Keycloak
2. User authenticates with Keycloak
3. Keycloak redirects to `/callback` with authorization code
4. Frontend exchanges code for tokens using PKCE
5. Tokens stored in sessionStorage
6. Apollo Client adds Bearer token to GraphQL requests
7. BFF validates token and returns data
8. Silent renewal refreshes tokens automatically

## 📁 Project Structure

```
Sapphire/
├── client/                      # React application
│   ├── public/
│   │   └── silent-renew.html   # Token refresh iframe
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Root component
│   │   ├── services/
│   │   │   ├── authService.ts  # OIDC authentication
│   │   │   └── notificationService.ts
│   │   ├── lib/
│   │   │   ├── apolloClient.ts # GraphQL client
│   │   │   └── queryClient.ts
│   │   ├── graphql/
│   │   │   ├── auth.ts         # Auth queries
│   │   │   └── health.ts       # Health queries
│   │   ├── hooks/
│   │   │   ├── useAuth.ts      # Auth hook
│   │   │   └── useNotifications.ts
│   │   ├── pages/
│   │   │   ├── home.tsx        # Landing page
│   │   │   ├── callback.tsx    # OIDC callback
│   │   │   ├── dashboard.tsx   # Main dashboard
│   │   │   └── not-found.tsx
│   │   └── components/         # Reusable components
│
├── docs/                        # Documentation
│   ├── MIGRATION_COMPLETE.md
│   ├── ARCHITECTURE_MIGRATION_GUIDE.md
│   ├── KEYCLOAK_AUTHENTICATION_OPTIONS.md
│   └── FRONTEND_OIDC_IMPLEMENTATION_GUIDE.md
│
├── shared/                      # Shared types
│   └── schema.ts
│
├── tests/                       # E2E tests
│
├── .env.example                 # Environment template
├── package.json                 # Dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # Tailwind config
└── README.md                   # This file
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)

# Production
npm run build        # Build for production (output: dist/)
npm run preview      # Preview production build

# Type Checking
npm run check        # Run TypeScript type checking

# Testing
npm run test         # Run E2E tests with Playwright
```

## 🔧 Development

### Adding New GraphQL Queries

1. Define query in `client/src/graphql/`:
```typescript
export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: Int!) {
    user(id: $userId) {
      id
      email
      firstName
      lastName
    }
  }
`;
```

2. Use in component:
```typescript
import { useQuery } from '@apollo/client';
import { GET_USER_PROFILE } from '@/graphql/user';

function UserProfile({ userId }) {
  const { data, loading, error } = useQuery(GET_USER_PROFILE, {
    variables: { userId }
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data.user.firstName}</div>;
}
```

### Protected Routes

Routes are automatically protected by the authentication check in `App.tsx`. Unauthenticated users are redirected to the home page.

## 📊 Data Visualization

The app uses **Recharts** for data visualization. Example charts include:
- Heart Rate Trends (Line Chart)
- Blood Pressure History (Line Chart)
- Activity Summary (Bar Chart)

## 🔒 Security

- **PKCE (Proof Key for Code Exchange)** - Prevents authorization code interception
- **Bearer Token Authentication** - Tokens sent in Authorization header
- **Session Storage** - Tokens cleared on tab close
- **Automatic Token Renewal** - Silent refresh before expiration
- **HTTPS Ready** - Secure in production environments

### Security Considerations

⚠️ **Important**: This implementation uses frontend OIDC authentication, which stores tokens in the browser. While PKCE provides protection, this approach is less secure than BFF-managed authentication. Consider migrating to BFF-managed auth for production healthcare applications.

## 🧪 Testing

```bash
# Run E2E tests
npm run test

# Run specific test
npx playwright test tests/example.spec.ts
```

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[MIGRATION_COMPLETE.md](docs/MIGRATION_COMPLETE.md)** - Migration summary and setup guide
- **[ARCHITECTURE_MIGRATION_GUIDE.md](docs/ARCHITECTURE_MIGRATION_GUIDE.md)** - Detailed architecture documentation
- **[KEYCLOAK_AUTHENTICATION_OPTIONS.md](docs/KEYCLOAK_AUTHENTICATION_OPTIONS.md)** - Authentication approaches
- **[FRONTEND_OIDC_IMPLEMENTATION_GUIDE.md](docs/FRONTEND_OIDC_IMPLEMENTATION_GUIDE.md)** - Implementation details

## 🤝 Integration Requirements

### BFF GraphQL API

The frontend expects a GraphQL API with the following capabilities:

**Required Queries:**
- `me` - Get current user
- `heartRateReadings` - Get heart rate data
- `bloodPressureReadings` - Get blood pressure data
- `activityReadings` - Get activity data
- `sleepReadings` - Get sleep data

**Required Mutations:**
- `logout` - Logout user
- `upgradeUserToPremium` - Upgrade user account
- `addBloodPressureReading` - Add new reading

**Authentication:**
- Must validate Bearer tokens from Keycloak
- Must implement CORS for frontend origin
- Must handle token expiration gracefully

### Keycloak Configuration

Create a public client in Keycloak:

```json
{
  "clientId": "sapphire-ui-public",
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": false,
  "redirectUris": ["http://localhost:5173/callback"],
  "webOrigins": ["http://localhost:5173"],
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```
