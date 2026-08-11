import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HeartRateData {
  time: string;
  heartRate: number;
}

interface HeartRateChartProps {
  data: HeartRateData[];
}

export default function HeartRateChart({ data }: HeartRateChartProps) {
  const [timeframe, setTimeframe] = useState("today");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Heart Rate Trends</h3>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748B"
              fontSize={12}
            />
            <YAxis 
              domain={[60, 90]}
              stroke="#64748B"
              fontSize={12}
            />
            <Line 
              type="monotone" 
              dataKey="heartRate" 
              stroke="#DC2626" 
              strokeWidth={2}
              dot={{ fill: '#DC2626', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
