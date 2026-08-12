// TEST123PUB-127 / T031 — Body temperature trend chart component
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useSearch, useLocation } from "wouter";
import { format } from "date-fns";
import { useTemperatureData } from "./useTemperatureData";
import {
  DEFAULT_UNIT,
  SUPPORTED_GRANULARITIES,
  CHART_COLOR_MIN,
  CHART_COLOR_MAX,
  CHART_COLOR_AVG,
} from "./temperature.constants";
import { TemperatureUnit } from "./temperature.types";
import { celsiusToFahrenheit, fahrenheitToCelsius } from "@/utils/temperature-conversion";
import type { TemperatureChartProps } from "./temperature.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a raw °C value to the display unit.
 * Applied at render time — raw data from the API is always in the unit
 * returned by the server (typically CELSIUS).
 */
function toDisplayValue(value: number, sourceUnit: string, displayUnit: TemperatureUnit): number {
  if (sourceUnit === "CELSIUS" && displayUnit === TemperatureUnit.FAHRENHEIT) {
    return celsiusToFahrenheit(value);
  }
  if (sourceUnit === "FAHRENHEIT" && displayUnit === TemperatureUnit.CELSIUS) {
    return fahrenheitToCelsius(value);
  }
  return value;
}

/**
 * Format a period-start ISO-8601 string as a short date label for the X axis.
 */
function formatPeriodLabel(isoString: string): string {
  try {
    return format(new Date(isoString), "MMM d");
  } catch {
    return isoString;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TemperatureChart renders the body temperature min/max/avg trend.
 *
 * - Unit toggle (C / F) reads from and writes to URL search params via wouter
 *   (Constitution gate F-5).
 * - Granularity selector also syncs to the URL so the view is shareable.
 * - Shows a loading skeleton while data is fetching.
 * - Shows an inline empty state when the API returns zero records.
 * - Shows an inline error message when the query fails.
 */
export default function TemperatureChart({ userId }: TemperatureChartProps) {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchString);

  // Read display unit from URL; fall back to default.
  const rawUnit = params.get("tempUnit") ?? DEFAULT_UNIT;
  const displayUnit: TemperatureUnit =
    rawUnit === TemperatureUnit.FAHRENHEIT ? TemperatureUnit.FAHRENHEIT : TemperatureUnit.CELSIUS;

  // Read granularity from URL; fall back to default.
  const rawGranularity = params.get("tempGranularity") ?? "day";
  const granularity = (SUPPORTED_GRANULARITIES as readonly string[]).includes(rawGranularity)
    ? rawGranularity
    : "day";

  // Helper to update a single URL param while preserving others.
  function updateParam(key: string, value: string): void {
    const next = new URLSearchParams(searchString);
    next.set(key, value);
    setLocation("?" + next.toString(), { replace: true });
  }

  const { data, loading, error } = useTemperatureData(userId);

  // Transform raw data into recharts-friendly shape, applying unit conversion.
  const chartData = data.map((bucket) => ({
    label: formatPeriodLabel(bucket.periodStart),
    min: toDisplayValue(bucket.minValue, bucket.unit, displayUnit),
    max: toDisplayValue(bucket.maxValue, bucket.unit, displayUnit),
    avg: toDisplayValue(bucket.avgValue, bucket.unit, displayUnit),
  }));

  const unitLabel = displayUnit === TemperatureUnit.FAHRENHEIT ? "°F" : "°C";

  // ---------------------------
  // Loading state
  // ---------------------------
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Body Temperature</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading temperature data…</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Error state
  // ---------------------------
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Body Temperature</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-600 font-medium">Unable to load temperature data.</p>
            <p className="text-xs text-slate-500 mt-1">Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Empty state
  // ---------------------------
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Body Temperature</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-slate-500 font-medium">No temperature readings found.</p>
            <p className="text-xs text-slate-400 mt-1">Sync your device to see temperature trends.</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Chart
  // ---------------------------
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Body Temperature</h3>

        <div className="flex items-center gap-3">
          {/* Granularity selector */}
          <Select
            value={granularity}
            onValueChange={(v) => updateParam("tempGranularity", v)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_GRANULARITIES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Unit toggle */}
          <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm">
            <button
              type="button"
              aria-pressed={displayUnit === TemperatureUnit.CELSIUS}
              className={`px-3 py-1.5 font-medium transition-colors ${
                displayUnit === TemperatureUnit.CELSIUS
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => updateParam("tempUnit", TemperatureUnit.CELSIUS)}
            >
              °C
            </button>
            <button
              type="button"
              aria-pressed={displayUnit === TemperatureUnit.FAHRENHEIT}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${
                displayUnit === TemperatureUnit.FAHRENHEIT
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => updateParam("tempUnit", TemperatureUnit.FAHRENHEIT)}
            >
              °F
            </button>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="label" stroke="#64748B" fontSize={12} />
            <YAxis
              stroke="#64748B"
              fontSize={12}
              tickFormatter={(v: number) => `${v}${unitLabel}`}
            />
            <Tooltip formatter={(value: number) => [`${value}${unitLabel}`, ""]} />
            <Legend />
            <Line
              type="monotone"
              dataKey="min"
              name="Min"
              stroke={CHART_COLOR_MIN}
              strokeWidth={2}
              dot={{ fill: CHART_COLOR_MIN, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="avg"
              name="Avg"
              stroke={CHART_COLOR_AVG}
              strokeWidth={2}
              dot={{ fill: CHART_COLOR_AVG, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="max"
              name="Max"
              stroke={CHART_COLOR_MAX}
              strokeWidth={2}
              dot={{ fill: CHART_COLOR_MAX, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
