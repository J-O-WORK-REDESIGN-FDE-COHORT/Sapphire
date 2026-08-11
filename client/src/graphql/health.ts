import { gql } from '@apollo/client';

export const GET_HEART_RATE_READINGS = gql`
  query GetHeartRateReadings($userId: Int!, $limit: Int) {
    heartRateReadings(userId: $userId, limit: $limit) {
      id
      userId
      heartRate
      timestamp
    }
  }
`;

export const GET_BLOOD_PRESSURE_READINGS = gql`
  query GetBloodPressureReadings($userId: Int!, $limit: Int) {
    bloodPressureReadings(userId: $userId, limit: $limit) {
      id
      userId
      systolic
      diastolic
      timestamp
    }
  }
`;

export const GET_ACTIVITY_READINGS = gql`
  query GetActivityReadings($userId: Int!, $days: Int) {
    activityReadings(userId: $userId, days: $days) {
      id
      userId
      steps
      date
    }
  }
`;

export const GET_SLEEP_READINGS = gql`
  query GetSleepReadings($userId: Int!, $days: Int) {
    sleepReadings(userId: $userId, days: $days) {
      id
      userId
      hours
      date
    }
  }
`;

export const ADD_BLOOD_PRESSURE_READING = gql`
  mutation AddBloodPressureReading($input: BloodPressureInput!) {
    addBloodPressureReading(input: $input) {
      id
      systolic
      diastolic
      timestamp
    }
  }
`;

// Made with Bob
