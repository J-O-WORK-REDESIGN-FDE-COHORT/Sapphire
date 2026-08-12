// TEST123PUB-127 / T038 — Health analytics export trigger component
import { useEffect, useRef } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { useTemperatureExport } from "./useTemperatureExport";

/** Props accepted by HealthExportButton. */
interface HealthExportButtonProps {
  /** User identifier (email) used as the export query's userId. */
  userId: string;
}

/**
 * Button that triggers a `temperatureExport` GraphQL query on click and
 * automatically downloads the result as a JSON file.
 *
 * Reads date-range and device-source filters from URL search params so the
 * exported window matches what is currently displayed in the chart
 * (Constitution gate F-5).
 *
 * The download is empty-safe: when the BFF returns an empty `records` array
 * a file is still generated so the user receives clear feedback (SC-007).
 */
export default function HealthExportButton({ userId }: HealthExportButtonProps) {
  const { triggerExport, loading, error, exportData } = useTemperatureExport();
  // Track whether we have already downloaded this result to avoid re-downloading
  // on re-renders that don't correspond to a new user action.
  const downloadedRef = useRef<boolean>(false);

  // Trigger file download whenever new export data arrives.
  useEffect(() => {
    if (!exportData || downloadedRef.current) return;

    downloadedRef.current = true;

    const payload = {
      exportedAt: new Date().toISOString(),
      userId,
      temperature: exportData.records,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `health-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [exportData, userId]);

  const handleClick = () => {
    downloadedRef.current = false;
    triggerExport(userId);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading || !userId}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {loading ? "Preparing export\u2026" : "Download Temperature Data"}
      </button>

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          Export failed. Please try again.
        </p>
      )}

      {exportData && exportData.records.length === 0 && (
        <p className="text-xs text-slate-500">
          No temperature records found for the selected date range.
        </p>
      )}
    </div>
  );
}
