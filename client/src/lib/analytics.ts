/**
 * Analytics module – all Segment calls are proxied through the BFF API via GraphQL mutations.
 *
 * The Segment write key is kept server-side only; the frontend never loads
 * the Segment browser SDK. Instead it sends GraphQL mutations to the BFF:
 *
 *   trackAnalyticsEvent(userId, event, properties?)
 *   identifyAnalyticsUser(userId, traits?)
 *   trackAnalyticsPage(userId, name?, properties?)
 */

import { apolloClient } from './apolloClient';
import {
  TRACK_ANALYTICS_EVENT,
  IDENTIFY_ANALYTICS_USER,
  TRACK_ANALYTICS_PAGE,
} from '@/graphql/analytics';

// ── Queue support (fire-and-forget before userId is known) ────────────────────

type QueuedCall =
  | { type: 'track'; event: string; properties?: Record<string, any> }
  | { type: 'identify'; userId: string; traits?: Record<string, any> }
  | { type: 'page'; name?: string; properties?: Record<string, any> };

const queue: QueuedCall[] = [];
let currentUserId: string | null = null;

/** Flush queued calls once we have a userId. */
const flushQueue = (): void => {
  while (queue.length > 0) {
    const call = queue.shift()!;
    if (call.type === 'track') {
      trackEvent(call.event, call.properties);
    } else if (call.type === 'identify') {
      identifyUser(call.userId, call.traits);
    }
    // COMMENTED OUT: Page events disabled
    // else if (call.type === 'page') {
    //   trackPage(call.name, call.properties);
    // }
  }
};

// ── Internal GraphQL helper ───────────────────────────────────────────────────

async function executeMutation(
  mutation: any,
  variables: Record<string, any>
): Promise<void> {
  try {
    await apolloClient.mutate({
      mutation,
      variables,
    });
  } catch (error) {
    console.error('[Analytics] GraphQL mutation failed:', error);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * No-op kept for backwards compatibility.
 * The BFF initialises Segment on the server; nothing to do in the browser.
 */
export const initAnalytics = async (): Promise<void> => {
  // intentionally empty – initialisation happens in the BFF
};

/**
 * Identify a user. Stores the userId locally so subsequent track/page calls
 * can include it automatically.
 */
export const identifyUser = (userId: string, traits?: Record<string, any>): void => {
  currentUserId = userId;
  executeMutation(IDENTIFY_ANALYTICS_USER, {
    userId,
    traits: traits ?? {},
  });
  // Flush any calls that were queued before we had a userId
  flushQueue();
};

/**
 * Track a custom event.
 * If no userId is known yet the call is queued until identifyUser() is called.
 */
export const trackEvent = (event: string, properties?: Record<string, any>): void => {
  if (!currentUserId) {
    // Try to extract userId from properties as a fallback
    const userId = properties?.userId || properties?.email;
    if (userId) {
      executeMutation(TRACK_ANALYTICS_EVENT, {
        userId,
        event,
        properties: properties ?? {},
      });
      return;
    }
    console.debug(`[Analytics] No userId yet – queuing event: ${event}`);
    queue.push({ type: 'track', event, properties });
    return;
  }
  executeMutation(TRACK_ANALYTICS_EVENT, {
    userId: currentUserId,
    event,
    properties: properties ?? {},
  });
};

/**
 * Track a page view.
 * If no userId is known yet the call is queued until identifyUser() is called.
 *
 * COMMENTED OUT: Page events are creating confusion in Amplitude
 */
// export const trackPage = (name?: string, properties?: Record<string, any>): void => {
//   if (!currentUserId) {
//     const userId = properties?.userId || properties?.email;
//     if (userId) {
//       executeMutation(TRACK_ANALYTICS_PAGE, {
//         userId,
//         name,
//         properties: properties ?? {},
//       });
//       return;
//     }
//     console.debug(`[Analytics] No userId yet – queuing page view: ${name}`);
//     queue.push({ type: 'page', name, properties });
//     return;
//   }
//   executeMutation(TRACK_ANALYTICS_PAGE, {
//     userId: currentUserId,
//     name,
//     properties: properties ?? {},
//   });
// };

// Temporary no-op function to prevent breaking existing code
export const trackPage = (name?: string, properties?: Record<string, any>): void => {
  console.debug(`[Analytics] Page tracking disabled: ${name}`);
};

/**
 * Reset analytics state (e.g. on logout).
 * Clears the locally cached userId.
 */
export const resetAnalytics = (): void => {
  currentUserId = null;
  queue.length = 0;
};

/** Kept for backwards compatibility – returns null (no browser SDK instance). */
export const getAnalytics = (): null => null;

// ── Common event names ────────────────────────────────────────────────────────

export const AnalyticsEvents = {
  // Authentication
  USER_LOGGED_IN: 'User Logged In',
  USER_LOGGED_OUT: 'User Logged Out',
  USER_REGISTERED: 'User Registered',
  USER_UPGRADED: 'Sapphire User Upgraded',

  // Navigation
  PAGE_VIEWED: 'Page Viewed',

  // Dashboard
  DASHBOARD_VIEWED: 'Dashboard Viewed',
  METRIC_CARD_CLICKED: 'Metric Card Clicked',

  // Partners
  PARTNER_VIEWED: 'Partner Viewed',
  PARTNER_ONBOARDED: 'Partner Onboarded',
  PARTNER_SERVICE_CLICKED: 'Partner Service Clicked',
  PARTNER_SERVICE_VIEWED: 'Partner Service Viewed',

  // Notifications
  NOTIFICATION_RECEIVED: 'Notification Received',
  NOTIFICATION_CLICKED: 'Notification Clicked',
  NOTIFICATION_DISMISSED: 'Notification Dismissed',

  // Health Data
  HEALTH_DATA_VIEWED: 'Health Data Viewed',
  CHART_INTERACTED: 'Chart Interacted',

  // Recommendations
  RECOMMENDATION_VIEWED: 'Recommendation Viewed',
  RECOMMENDATION_CLICKED: 'Recommendation Clicked',
  RECOMMENDATIONS_GENERATED: 'Recommendations Generated',

  // Services
  SERVICE_VIEWED: 'Service Viewed',
  SERVICE_SUBSCRIBED: 'Service Subscribed',
  SERVICE_UNSUBSCRIBED: 'Service Unsubscribed',

  // Alerts
  ALERTS_VIEWED: 'Alerts Viewed',

  // User Profile
  PROFILE_VIEWED: 'Profile Viewed',

  // Wellness Coach
  WELLNESS_COACH_VIEWED: 'Wellness Coach Viewed',
  WELLNESS_COACH_MESSAGE_SENT: 'Wellness Coach Message Sent',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

// Made with Bob
