// TEST123PUB-127 / T029 — Named constants for the temperature feature
import { TemperatureUnit } from "./temperature.types";

/** Default display unit when no URL param is present. */
export const DEFAULT_UNIT: TemperatureUnit = TemperatureUnit.CELSIUS;

/** Allowed granularity values accepted by the temperatureData query. */
export const SUPPORTED_GRANULARITIES = ["day", "week", "month"] as const;

/** Default granularity when none is specified in the URL. */
export const DEFAULT_GRANULARITY: (typeof SUPPORTED_GRANULARITIES)[number] = "day";

/** Number of days to look back when no explicit date range is set. */
export const DEFAULT_DATE_RANGE_DAYS = 30;

/** Recharts stroke colour for the minimum temperature series. */
export const CHART_COLOR_MIN = "#3B82F6"; // blue-500

/** Recharts stroke colour for the maximum temperature series. */
export const CHART_COLOR_MAX = "#EF4444"; // red-500

/** Recharts stroke colour for the average temperature series. */
export const CHART_COLOR_AVG = "#10B981"; // emerald-500
