import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { AuthService } from '@/services/authService';

const httpUrl = (window as any).__ENV__?.VITE_BFF_API_URL || import.meta.env.VITE_BFF_API_URL || 'http://localhost:4000/graphql';
const wsUrl = (window as any).__ENV__?.VITE_BFF_WS_URL || import.meta.env.VITE_BFF_WS_URL || 'ws://localhost:4000/graphql';

console.log('🔧 Apollo Client Configuration:');
console.log('  HTTP URL:', httpUrl);
console.log('  WebSocket URL:', wsUrl);

const httpLink = createHttpLink({
  uri: httpUrl,
});

const wsClient = createClient({
  url: wsUrl,
  connectionParams: async () => {
    try {
      const token = await AuthService.getAccessToken();
      console.log('🔐 WebSocket connectionParams called');
      console.log('  Token exists:', !!token);
      console.log('  Token preview:', token ? `${token.substring(0, 20)}...` : 'none');

      return token ? { authorization: `Bearer ${token}` } : {};
    } catch (error) {
      console.error('❌ Failed to resolve WebSocket auth token:', error);
      return {};
    }
  },
  retryAttempts: 10,
  keepAlive: 30000,
  on: {
    connected: () => console.log('✅ WebSocket connected'),
    closed: (event) => {
      const closeEvent = event as { code?: number; reason?: string };
      console.log('❌ WebSocket closed', { code: closeEvent.code, reason: closeEvent.reason });
    },
    error: (error) => console.error('❌ WebSocket error:', error),
    connecting: () => console.log('🔄 WebSocket connecting...'),
  },
});

const wsLink = new GraphQLWsLink(wsClient);

const authLink = setContext(async (_, { headers }) => {
  const token = await AuthService.getAccessToken();
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

const errorLink = onError((errorContext: any) => {
  const { graphQLErrors, networkError, operation } = errorContext;
  console.log('🔍 Error Link triggered for operation:', operation.operationName);
  
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }: any) => {
      console.error(`❌ [GraphQL error]: ${message}`);
      console.error('  Operation:', operation.operationName);
      console.error('  Extensions:', extensions);
      
      if (extensions?.code === 'UNAUTHENTICATED') {
        console.log('🔒 Token expired or invalid, redirecting to login...');
        AuthService.removeUser();
        window.location.href = '/';
      }
    });
  }
  
  if (networkError) {
    console.error(`❌ [Network error]:`, networkError);
    console.error('  Operation:', operation.operationName);
  }
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    const isSubscription = definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
    console.log('🔀 Split Link Decision:');
    console.log('  Operation:', definition.kind === 'OperationDefinition' ? definition.operation : 'unknown');
    console.log('  Is Subscription:', isSubscription);
    console.log('  Will use:', isSubscription ? 'WebSocket' : 'HTTP');
    return isSubscription;
  },
  wsLink,
  from([errorLink, authLink, httpLink])
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          dashboard: {
            merge: false, // Don't merge, always replace with fresh data
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only', // Always fetch fresh data from network
    },
  },
});
