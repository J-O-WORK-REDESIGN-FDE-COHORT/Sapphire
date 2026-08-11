import { gql } from '@apollo/client';

export const TRACK_ANALYTICS_EVENT = gql`
  mutation TrackAnalyticsEvent($userId: String!, $event: String!, $properties: JSON) {
    trackAnalyticsEvent(userId: $userId, event: $event, properties: $properties) {
      success
      message
    }
  }
`;

export const IDENTIFY_ANALYTICS_USER = gql`
  mutation IdentifyAnalyticsUser($userId: String!, $traits: JSON) {
    identifyAnalyticsUser(userId: $userId, traits: $traits) {
      success
      message
    }
  }
`;

export const TRACK_ANALYTICS_PAGE = gql`
  mutation TrackAnalyticsPage($userId: String!, $name: String, $properties: JSON) {
    trackAnalyticsPage(userId: $userId, name: $name, properties: $properties) {
      success
      message
    }
  }
`;

// Made with Bob