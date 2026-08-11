import { gql } from '@apollo/client';

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      firstName
      lastName
      userType
      keycloakId
      keycloakUsername
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

export const UPGRADE_USER_MUTATION = gql`
  mutation UpgradeUser {
    upgradeUserToPremium {
      user {
        id
        userType
      }
      message
    }
  }
`;

export const UPGRADE_USER_TO_PREMIUM = gql`
  mutation UpgradeUserToPremium($email: String!) {
    upgradeUserToPremium(email: $email) {
      name
      email
      userTier
    }
  }
`;

export const ACTIVITY_SUMMARY = gql`
  query ActivitySummary($email: String!) {
    fetchUser(email: $email) {
      name
      email
      address {
        city
        state
        country
        zip
      }
      physicalAttributes {
        gender
        heightCm
        weightKg
      }
      userTier
    }
  }
`;

export const LATEST_WELLNESS_SUMMARY = gql`
  query LatestWellnessSummary($email: String!) {
    latestWellnessSummary(email: $email) {
      id
      userId
      profileSummary
      dataSummary
      createdAt
      updatedAt
    }
  }
`;

// Made with Bob
