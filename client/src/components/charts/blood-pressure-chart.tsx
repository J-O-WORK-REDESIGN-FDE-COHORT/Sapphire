import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

interface BloodPressureData {
  day: string;
  systolic: number;
  diastolic: number;
}

interface BloodPressureChartProps {
  data: BloodPressureData[];
}

export default function BloodPressureChart({ data }: BloodPressureChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Blood Pressure History</h3>
        <button className="text-sm text-primary hover:text-blue-700 font-medium">
          + Add Reading
        </button>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              dataKey="day" 
              stroke="#64748B"
              fontSize={12}
            />
            <YAxis 
              domain={[60, 140]}
              stroke="#64748B"
              fontSize={12}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="systolic" 
              stroke="#DC2626" 
              strokeWidth={2}
              name="Systolic"
              dot={{ fill: '#DC2626', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="diastolic" 
              stroke="#059669" 
              strokeWidth={2}
              name="Diastolic"
              dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
