import { useQuery } from "@apollo/client/react";
import { Heart, Activity, BarChart3, Moon, Info, CheckCircle } from "lucide-react";
import Sidebar from "@/components/sidebar";
import MetricCard from "@/components/metric-card";
import HeartRateChart from "@/components/charts/heart-rate-chart";
import ActivityChart from "@/components/charts/activity-chart";
import BloodPressureChart from "@/components/charts/blood-pressure-chart";
import NotificationBell from "@/components/notification-bell";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect } from "react";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";

import {
  GET_HEART_RATE_TRENDS,
  GET_ACTIVITY_SUMMARY,
  GET_BLOOD_PRESSURE_HISTORY,
  GET_HEALTH_INSIGHTS,
  GET_SLEEP_DATA
} from "@/graphql/dashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll, isConnected } = useNotifications();

  // Track page view
  useEffect(() => {
    trackPage('Dashboard', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.DASHBOARD_VIEWED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);

  // Call all hooks before any conditional returns
  const { data: heartRateTrendsData } = useQuery(GET_HEART_RATE_TRENDS);
  const { data: activitySummaryData } = useQuery(GET_ACTIVITY_SUMMARY);
  const { data: bpHistoryData } = useQuery(GET_BLOOD_PRESSURE_HISTORY);
  const { data: healthInsightsData } = useQuery(GET_HEALTH_INSIGHTS);
  const { data: sleepData } = useQuery(GET_SLEEP_DATA);

  // Now safe to do conditional returns
  if (!user) return null;

  const userName = user?.given_name || user?.name || 'User';

  const heartRateChartData = (heartRateTrendsData as any)?.dashboard?.heartRateTrends
    ?.slice(-12)
    .map((reading: { timestamp: string; value: number }) => ({
      time: format(new Date(reading.timestamp), "HH:mm"),
      heartRate: reading.value,
    })) || [];

  const activityChartData =
    (activitySummaryData as any)?.dashboard?.activitySummary
      ?.slice(-7)
      .map((reading: { day: string; steps: number }) => ({
        day: reading.day,
        steps: reading.steps,
      })) || [];

  const mergedBloodPressureData = (() => {
    if (!(bpHistoryData as any)?.dashboard?.bloodPressureHistory) return [];
    const { systolic, diastolic } = (bpHistoryData as any).dashboard.bloodPressureHistory;
    const map = new Map<string, { systolic?: number; diastolic?: number }>();

    systolic?.forEach((point: { timestamp: string; value: number }) => {
      const entry = map.get(point.timestamp) || {};
      entry.systolic = point.value;
      map.set(point.timestamp, entry);
    });

    diastolic?.forEach((point: { timestamp: string; value: number }) => {
      const entry = map.get(point.timestamp) || {};
      entry.diastolic = point.value;
      map.set(point.timestamp, entry);
    });

    return Array.from(map.entries())
      .map(([timestamp, values]) => ({
        day: format(new Date(timestamp), "EEE"),
        systolic: values.systolic ?? 0,
        diastolic: values.diastolic ?? 0,
        timestamp,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  })();

  const bloodPressureChartData = mergedBloodPressureData.slice(-7);

  const recentBloodPressureTable = [...mergedBloodPressureData]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((reading) => ({
      date: reading.timestamp,
      systolic: reading.systolic,
      diastolic: reading.diastolic,
    }));

  const insights = (healthInsightsData as any)?.dashboard?.insights || [];

  const currentHeartRate = (heartRateTrendsData as any)?.dashboard?.heartRateTrends?.[(heartRateTrendsData as any).dashboard.heartRateTrends.length - 1]?.value || 0;
  const todaySteps = (activitySummaryData as any)?.dashboard?.activitySummary?.[(activitySummaryData as any).dashboard.activitySummary.length - 1]?.steps || 0;
  const currentBP = recentBloodPressureTable[0] || null;
  const todaySleep = (sleepData as any)?.dashboard?.healthMetrics?.sleep?.hours;

  const stepGoal = 10000;
  const stepProgress = Math.round((todaySteps / stepGoal) * 100);

  const getHeartRateStatus = (hr: number) => {
    if (hr >= 60 && hr <= 100) return { text: "Normal", color: "text-green-800", bg: "bg-green-100" };
    return { text: "Monitor", color: "text-yellow-800", bg: "bg-yellow-100" };
  };

  const getBPStatus = (systolic: number, diastolic: number) => {
    if (systolic < 120 && diastolic < 80) return { text: "Optimal", color: "text-green-800", bg: "bg-green-100" };
    if (systolic < 130 && diastolic < 85) return { text: "Normal", color: "text-green-800", bg: "bg-green-100" };
    return { text: "Elevated", color: "text-yellow-800", bg: "bg-yellow-100" };
  };

  const hrStatus = getHeartRateStatus(currentHeartRate);
  const bpStatus = currentBP ? getBPStatus(currentBP.systolic, currentBP.diastolic) : { text: "No Data", color: "text-gray-600", bg: "bg-gray-100" };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Health Dashboard</h1>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        <header className="hidden lg:block bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-8">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-slate-900">Health Dashboard</h1>
              {isConnected && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  🟢 Live
                </span>
              )}
            </div>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                Good morning, {userName}!
              </h1>
              <p className="text-slate-600">Here's your health summary for today</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Heart Rate"
                value={currentHeartRate}
                unit="BPM"
                icon={Heart}
                iconColor="text-red-600"
                iconBgColor="bg-red-100"
                status={hrStatus.text}
                statusColor={hrStatus.color}
                statusBgColor={hrStatus.bg}
                trend={{
                  value: "+2 from yesterday",
                  isPositive: true
                }}
              />

              <MetricCard
                title="Steps"
                value={todaySteps.toLocaleString()}
                unit="Steps"
                icon={Activity}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-100"
                status={stepProgress >= 100 ? "Goal Met" : `${stepProgress}% of goal`}
                statusColor={stepProgress >= 100 ? "text-green-800" : "text-blue-800"}
                statusBgColor={stepProgress >= 100 ? "bg-green-100" : "bg-blue-100"}
                trend={{
                  value: `${stepProgress}% of goal`,
                  isPositive: stepProgress >= 85
                }}
              />

              <MetricCard
                title="Blood Pressure"
                value={currentBP ? `${currentBP.systolic}/${currentBP.diastolic}` : "No Data"}
                unit="mmHg"
                icon={BarChart3}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
                status={bpStatus.text}
                statusColor={bpStatus.color}
                statusBgColor={bpStatus.bg}
                trend={{
                  value: "Within normal range",
                  isPositive: true
                }}
              />

              <MetricCard
                title="Sleep"
                value={`${todaySleep}h`}
                unit="Sleep"
                icon={Moon}
                iconColor="text-purple-600"
                iconBgColor="bg-purple-100"
                status="Fair"
                statusColor="text-yellow-800"
                statusBgColor="bg-yellow-100"
                trend={{
                  value: "15min less than goal",
                  isPositive: false
                }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <HeartRateChart data={heartRateChartData} />
              <ActivityChart data={activityChartData} />
            </div>

            <BloodPressureChart data={bloodPressureChartData} />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h4 className="text-sm font-medium text-slate-900 mb-3">Recent Blood Pressure Readings</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Systolic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Diastolic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {recentBloodPressureTable.map((reading: any, index: number) => {
                      const status = getBPStatus(reading.systolic, reading.diastolic);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {format(new Date(reading.date), 'MMM d, h:mm a')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{reading.systolic}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{reading.diastolic}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.color}`}>
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Health Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Activity Goal</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        You're {stepGoal - todaySteps} steps away from your daily goal. A 15-minute walk should get you there!
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Blood Pressure</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Your blood pressure has been consistently in the optimal range this week. Keep up the great work!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
