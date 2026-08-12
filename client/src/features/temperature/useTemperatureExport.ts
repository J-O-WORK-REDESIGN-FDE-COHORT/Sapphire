// TEST123PUB-127 / T038 — On-demand hook for temperature export data
import { useLazyQuery } from "@apollo/client/react";
import { useSearch } from "wouter";
import { GET_TEMPERATURE_EXPORT } from "@/graphql/temperature";
import { DEFAULT_DATE_RANGE_DAYS } from "./temperature.constants";

/** A single raw temperature record returned by the export query. */
export interface TemperatureExportRecord {
  /** Temperature reading value in the stored unit. */
  value: number;
  /** Unit of measurement: CELSIUS or FAHRENHEIT. */
  unit: string;
  /** ISO-8601 timestamp of the reading. */
  timestamp: string;
  /** Source device identifier. */
  deviceSource: string;
}

/** Shape of the `temperatureExport` field returned by the BFF. */
export interface TemperatureExportData {
  records: TemperatureExportRecord[];
}

/**
 * Return value of useTemperatureExport.
 */
export interface UseTemperatureExportResult {
  /** Call this to fire the export query. */
  triggerExport: (userId: string) => void;
  /** True while the query is in flight. */
  loading: boolean;
  /** Set when the query returns an error. */
  error: Error | undefined;
  /** Resolved export payload, or null before first call. */
  exportData: TemperatureExportData | null;
}

/**
 * Lazy Apollo hook for the `temperatureExport` query.
 *
 * Reads `dateFrom`, `dateTo`, and `deviceSource` filter values from the
 * current URL search string (params: tempFrom, tempTo, tempDevice) so that
 * the export respects the same filters the chart displays (Constitution F-5).
 *
 * Cache policy is `no-cache` for export queries (Constitution gate 12).
 */
export function useTemperatureExport(): UseTemperatureExportResult {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);

  const now = new Date();
  const defaultDateTo = now.toISOString();
  const defaultDateFrom = new Date(
    now.getTime() - DEFAULT_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const dateFrom = params.get("tempFrom") ?? defaultDateFrom;
  const dateTo = params.get("tempTo") ?? defaultDateTo;
  const deviceSource = params.get("tempDevice") ?? undefined;

  const [executeQuery, { loading, error, data }] = useLazyQuery<{
    temperatureExport: TemperatureExportData;
  }>(GET_TEMPERATURE_EXPORT, {
    fetchPolicy: "no-cache",
  });

  const triggerExport = (userId: string): void => {
    executeQuery({
      variables: { userId, dateFrom, dateTo, deviceSource },
    });
  };

  return {
    triggerExport,
    loading,
    error: error as Error | undefined,
    exportData: data?.temperatureExport ?? null,
  };
}
