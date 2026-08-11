# Sapphire Wellness UI - Agent Documentation

## Overview
Sapphire Wellness UI is a modern, React-based healthcare dashboard that provides users with comprehensive health monitoring capabilities. It's a pure frontend application built with React, TypeScript, and Vite that integrates with a Backend-for-Frontend (BFF) GraphQL API and uses Keycloak for authentication.

## Purpose & Role in Landscape
This is the **primary user interface** for the Sapphire Wellness platform. It serves as the entry point for end users to:
- Track and visualize health metrics (heart rate, blood pressure, activity, sleep)
- View health trends through interactive charts
- Receive real-time notifications
- Manage premium subscriptions
- Access personalized wellness recommendations

The UI acts as a **presentation layer** that communicates exclusively with the BFF GraphQL API, which handles all business logic, data aggregation, and backend service orchestration.

## Integration Points
- **Upstream**: End users via web browsers (port 5173)
- **Downstream Services**:
  - `sapphire-bff-api` (port 4000) - GraphQL API for all data operations
  - Keycloak (port 8090) - OIDC authentication provider
  - `sapphire-notification-api` (port 8084) - Real-time notifications (optional)
- **Authentication Flow**: OIDC with PKCE → Keycloak → Bearer token → BFF API

## Boundary Conditions

### Browser Requirements
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript**: Must be enabled
- **Session Storage**: Required for token management
- **HTTPS**: Recommended for production (required for secure cookies)

### Authentication Constraints
- **OIDC Flow**: Authorization Code Flow with PKCE
- **Token Storage**: Session storage (cleared on tab close)
- **Token Lifetime**: Managed by Keycloak configuration
- **Silent Renewal**: Automatic token refresh before expiration
- **Single Sign-On**: Supported via Keycloak

### API Integration Limits
- **GraphQL Endpoint**: Single endpoint at `/graphql`
- **Bearer Token**: Required in Authorization header for all authenticated requests
- **CORS**: BFF must allow frontend origin
- **WebSocket**: GraphQL subscriptions for real-time updates (optional)

### Performance Considerations
- **Bundle Size**: Optimized with Vite code splitting
- **Lazy Loading**: Routes and components loaded on demand
- **Caching**: Apollo Client cache for GraphQL responses
- **React Query**: Server state management with automatic refetching

### Security Boundaries
- **Frontend OIDC**: Tokens stored in browser (less secure than BFF-managed auth)
- **PKCE Protection**: Prevents authorization code interception
- **No Sensitive Logic**: All business logic in BFF
- **Token Validation**: Performed by BFF, not frontend
- **XSS Protection**: React's built-in escaping

### Known Limitations
- **Healthcare Compliance**: Frontend token storage not ideal for HIPAA/PHI data
- **Offline Support**: None - requires active internet connection
- **Mobile Optimization**: Responsive but not native mobile app
- **Browser Storage**: Limited to session storage (no persistence across sessions)

## Tech Stack

### Core Framework
- **React 18.3.1** - UI library with concurrent features
- **TypeScript 5.6.3** - Type-safe development
- **Vite 5.4.19** - Fast build tool and dev server with HMR

### Authentication & Security
- **oidc-client-ts 3.4.1** - OIDC/OAuth2 client with PKCE support
- **jwt-decode 4.0.0** - JWT token parsing (client-side only)

### Data Management
- **@apollo/client 4.1.4** - GraphQL client with caching
- **@tanstack/react-query 5.60.5** - Server state management
- **graphql 16.12.0** - GraphQL query language
- **graphql-ws 6.0.7** - GraphQL subscriptions over WebSocket
- **zustand 5.0.11** - Lightweight state management

### UI Components & Styling
- **Radix UI** - Accessible, unstyled component primitives
  - Dialog, Dropdown, Popover, Tabs, Toast, etc.
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Framer Motion 11.13.1** - Animation library
- **Lucide React 0.453.0** - Icon library
- **next-themes 0.4.6** - Dark mode support

### Data Visualization
- **Recharts 2.15.2** - React charting library
  - Line charts for trends (heart rate, blood pressure)
  - Bar charts for activity summaries

### Routing & Forms
- **Wouter 3.3.5** - Lightweight routing (< 2KB)
- **React Hook Form 7.55.0** - Performant form management
- **Zod 4.3.6** - Schema validation
- **@hookform/resolvers 3.10.0** - Form validation integration

### Real-time Communication
- **@stomp/stompjs 7.3.0** - STOMP protocol for WebSocket
- **sockjs-client 1.6.1** - WebSocket fallback
- **rxjs 7.8.2** - Reactive programming

### AI Assistant Integration
- **@assistant-ui/react 0.12.11** - AI chat interface components
- **@assistant-ui/react-markdown 0.12.4** - Markdown rendering
- **react-markdown 10.1.0** - Markdown parser

### Development & Testing
- **@playwright/test 1.55.0** - E2E testing framework
- **@vitejs/plugin-react 4.3.2** - React plugin for Vite
- **PostCSS 8.4.47** - CSS processing
- **Autoprefixer 10.4.20** - CSS vendor prefixing

### Build & Deployment
- **Node.js 20+** - Runtime environment
- **npm** - Package manager
- **Docker** - Containerization (Node 20 Alpine)
- **Port 5173** - Development and production server

## Architecture Pattern
- **Single Page Application (SPA)** - Client-side routing
- **Component-Based Architecture** - Reusable React components
- **BFF Pattern** - All backend communication through GraphQL BFF
- **OIDC Authentication** - Standard OAuth2/OIDC flow with PKCE
- **Optimistic UI Updates** - Apollo Client optimistic responses
- **Code Splitting** - Dynamic imports for route-based splitting
