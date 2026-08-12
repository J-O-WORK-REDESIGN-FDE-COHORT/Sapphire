// TEST123PUB-127 / T027 — TypeScript types for the temperature feature

/**
 * Unit of measurement for body temperature readings.
 */
export enum TemperatureUnit {
  CELSIUS = "CELSIUS",
  FAHRENHEIT = "FAHRENHEIT",
}

/**
 * A single aggregated temperature trend bucket returned from the
 * temperatureData GraphQL query.
 * All statistical values use the unit indicated by the `unit` field.
 */
export interface TemperatureTrendData {
  /** Lowest temperature observed in this bucket. */
  minValue: number;
  /** Highest temperature observed in this bucket. */
  maxValue: number;
  /** Mean temperature for this bucket. */
  avgValue: number;
  /** Unit of measurement: CELSIUS or FAHRENHEIT. */
  unit: string;
  /** Aggregation granularity: day | week | month. */
  granularity: string;
  /** ISO-8601 start of this aggregation bucket. */
  periodStart: string;
  /** ISO-8601 end of this aggregation bucket. */
  periodEnd: string;
}

/**
 * Props accepted by the TemperatureChart component.
 */
export interface TemperatureChartProps {
  /** User identifier (email). Passed to the GraphQL query. */
  userId: string;
}
