// TEST123PUB-127 / T030 — Apollo hook for temperature trend data
import { useQuery } from "@apollo/client/react";
import { useSearch } from "wouter";
import { GET_TEMPERATURE_DATA } from "@/graphql/temperature";
import {
  DEFAULT_GRANULARITY,
  DEFAULT_DATE_RANGE_DAYS,
  SUPPORTED_GRANULARITIES,
} from "./temperature.constants";
import type { TemperatureTrendData } from "./temperature.types";

/**
 * Return value of useTemperatureData.
 */
export interface UseTemperatureDataResult {
  data: TemperatureTrendData[];
  loading: boolean;
  error: Error | undefined;
}

/**
 * Apollo hook that fetches temperature trend data for `userId`.
 *
 * Reads `granularity`, `dateFrom`, `dateTo`, and `deviceSource` from the
 * current URL search string via wouter's `useSearch` so that filters are
 * shareable and bookmarkable (Constitution gate F-5).
 *
 * Cache policy is `network-only` to ensure mutable health data is always
 * fresh (Constitution gate 12).
 *
 * @param userId - User identifier (email) passed as the `userId` query variable.
 */
export function useTemperatureData(userId: string): UseTemperatureDataResult {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);

  // Read filter values from URL, falling back to sensible defaults.
  const rawGranularity = params.get("tempGranularity") ?? DEFAULT_GRANULARITY;
  const granularity = (SUPPORTED_GRANULARITIES as readonly string[]).includes(rawGranularity)
    ? rawGranularity
    : DEFAULT_GRANULARITY;

  const now = new Date();
  const defaultDateTo = now.toISOString();
  const defaultDateFrom = new Date(
    now.getTime() - DEFAULT_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const dateFrom = params.get("tempFrom") ?? defaultDateFrom;
  const dateTo = params.get("tempTo") ?? defaultDateTo;
  const deviceSource = params.get("tempDevice") ?? undefined;

  const { data, loading, error } = useQuery<{
    temperatureData: TemperatureTrendData[];
  }>(GET_TEMPERATURE_DATA, {
    variables: { userId, granularity, dateFrom, dateTo, deviceSource },
    fetchPolicy: "network-only",
    skip: !userId,
  });

  return {
    data: data?.temperatureData ?? [],
    loading,
    error: error as Error | undefined,
  };
}
