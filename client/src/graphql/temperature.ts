// TEST123PUB-127 / T030 — GraphQL query for temperature trend data
import { gql } from "@apollo/client";

/**
 * Fetch aggregated body-temperature trend data for a user.
 *
 * Maps to the `temperatureData` Query field added in the BFF phase.
 * Returns an empty array when no data exists for the window (not null).
 */
export const GET_TEMPERATURE_DATA = gql`
  query GetTemperatureData(
    $userId: ID!
    $granularity: String!
    $dateFrom: String!
    $dateTo: String!
    $deviceSource: String
  ) {
    temperatureData(
      userId: $userId
      granularity: $granularity
      dateFrom: $dateFrom
      dateTo: $dateTo
      deviceSource: $deviceSource
    ) {
      minValue
      maxValue
      avgValue
      unit
      granularity
      periodStart
      periodEnd
    }
  }
`;
