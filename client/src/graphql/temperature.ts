// TEST123PUB-127 / T030+T038 — GraphQL queries for the temperature feature
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

/**
 * Export flat temperature records for a user within a date range.
 *
 * Maps to the `temperatureExport` Query field added in the BFF Phase 5.
 * Returns an empty `records` array (not null) when no data matches (SC-007).
 * Use as a lazy query — fires on user action, not on mount.
 * Cache policy must be `no-cache` for export queries (Constitution gate 12).
 */
export const GET_TEMPERATURE_EXPORT = gql`
  query GetTemperatureExport(
    $userId: ID!
    $dateFrom: String!
    $dateTo: String!
    $deviceSource: String
  ) {
    temperatureExport(
      userId: $userId
      dateFrom: $dateFrom
      dateTo: $dateTo
      deviceSource: $deviceSource
    ) {
      records {
        value
        unit
        timestamp
        deviceSource
      }
    }
  }
`;
