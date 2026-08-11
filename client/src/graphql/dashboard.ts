import { gql } from "@apollo/client";

export const GET_USER_RECOMMENDATIONS = gql`
  query GetUserRecommendations($userEmail: String!) {
    userRecommendations(userEmail: $userEmail) {
      id
      createdAt
      updatedAt
      metadata {
        labels {
          priority
          difficulty
        }
        tags
        annotations {
          lastUpdatedBy
          matchAlgorithm
          telemetrySource
          partnerServiceCode
          recommendationEngineVersion
        }
      }
      spec {
        recommendation {
          relevanceScore
          generatedAt
        }
        partnerService {
          serviceId
          serviceCode
          name
          category
          serviceType
          description
          status
          labels {
            duration
            ageGroup
            difficulty
          }
          annotations {
            sla
            contentOwner
          }
          tags
          links {
            rel
            href
          }
        }
      }
    }
  }
`;

export const GENERATE_RECOMMENDATION = gql`
  mutation GenerateRecommendation($userId: String!) {
    generateRecommendation(userId: $userId) {
      success
      message
      workflowId
    }
  }
`;

export const GET_HEART_RATE_TRENDS = gql`
  query GetHeartRateTrends {
    dashboard {
      heartRateTrends {
        timestamp
        value
      }
    }
  }
`;

export const GET_ACTIVITY_SUMMARY = gql`
  query GetActivitySummary {
    dashboard {
      activitySummary {
        date
        day
        steps
      }
    }
  }
`;

export const GET_BLOOD_PRESSURE_HISTORY = gql`
  query GetBloodPressureHistory {
    dashboard {
      bloodPressureHistory {
        systolic {
          timestamp
          value
        }
        diastolic {
          timestamp
          value
        }
      }
    }
  }
`;

export const GET_RECENT_BLOOD_PRESSURE = gql`
  query GetRecentBloodPressure {
    dashboard {
      recentReadings {
        date
        systolic
        diastolic
        status
      }
    }
  }
`;

export const GET_HEALTH_INSIGHTS = gql`
  query GetHealthInsights {
    dashboard {
      insights {
        id
        type
        title
        message
        icon
      }
    }
  }
`;

export const GET_SLEEP_DATA = gql`
  query GetSleepData {
    dashboard {
      healthMetrics {
        sleep {
          goal
          hours
          status
          statusMessage
        }
      }
    }
  }
`;