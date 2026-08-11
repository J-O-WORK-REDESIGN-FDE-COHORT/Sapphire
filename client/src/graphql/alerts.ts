import { gql } from "@apollo/client";

export const GET_USER_ALERTS = gql`
  query GetUserAlerts($userEmail: String!) {
    userAlerts(userEmail: $userEmail) {
      alertMessage
      metricName
      metadata {
        alertTimestamp
      }
    }
  }
`;

// Made with Bob
