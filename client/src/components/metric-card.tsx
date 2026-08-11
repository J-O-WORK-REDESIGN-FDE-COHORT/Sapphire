import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  status: string;
  statusColor: string;
  statusBgColor: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export default function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  iconColor,
  iconBgColor,
  status,
  statusColor,
  statusBgColor,
  trend,
  className
}: MetricCardProps) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200 p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", iconBgColor)}>
          <Icon className={cn("w-6 h-6", iconColor, title === "Heart Rate" ? "animate-pulse" : "")} />
        </div>
        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", statusColor, statusBgColor)}>
          {status}
        </span>
      </div>
      <div className="mb-2">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-600">{unit}</div>
      </div>
      {trend && (
        <div className="flex items-center text-xs">
          <svg 
            className={cn("w-3 h-3 mr-1", trend.isPositive ? "text-green-600" : "text-red-600")}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d={trend.isPositive ? "M7 11l3-3 3 3 7-7" : "M17 13l-3 3-3-3-7 7"}
            />
          </svg>
          <span className={cn("font-medium", trend.isPositive ? "text-green-600" : "text-red-600")}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
