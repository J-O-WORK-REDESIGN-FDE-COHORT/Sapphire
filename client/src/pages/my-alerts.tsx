import { useQuery } from "@apollo/client/react";
import { Bell, AlertCircle, Activity, Clock } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notification-bell";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect } from "react";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { GET_USER_ALERTS } from "@/graphql/alerts";

interface AlertMetadata {
  alertTimestamp: number;
}

interface UserAlert {
  alertMessage: string;
  metricName: string;
  metadata: AlertMetadata;
}

interface UserAlertsData {
  userAlerts: UserAlert[];
}

export default function MyAlerts() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll, isConnected } = useNotifications();

  // Track page view
  useEffect(() => {
    trackPage('My Alerts', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.ALERTS_VIEWED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);

  // Fetch user alerts
  const { data, loading, error } = useQuery<UserAlertsData>(GET_USER_ALERTS, {
    variables: { userEmail: user?.email },
    skip: !user?.email,
  });

  if (!user) return null;

  const userName = user?.given_name || user?.name || 'User';
  const userAlerts = data?.userAlerts || [];

  const getAlertIcon = (metricName: string) => {
    if (metricName.includes('activity')) {
      return Activity;
    }
    return AlertCircle;
  };

  const getAlertColor = (metricName: string) => {
    if (metricName.includes('activity')) {
      return {
        iconColor: "text-blue-600",
        iconBgColor: "bg-blue-100",
        borderColor: "border-blue-200",
      };
    }
    return {
      iconColor: "text-orange-600",
      iconBgColor: "bg-orange-100",
      borderColor: "border-orange-200",
    };
  };

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
            <h1 className="text-lg font-semibold text-slate-900">My Alerts</h1>
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
              <h1 className="text-xl font-semibold text-slate-900">My Alerts</h1>
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
                Your Health Alerts
              </h1>
              <p className="text-slate-600">Stay informed about your health metrics and activities</p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading alerts...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Error Loading Alerts</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {error.message || "Unable to load your alerts. Please try again later."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && userAlerts.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Alerts</h3>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Great news! You don't have any health alerts at the moment. Keep up the good work with your wellness routine.
                  </p>
                </div>
              </div>
            )}

            {!loading && !error && userAlerts.length > 0 && (
              <div className="space-y-4">
                {userAlerts.map((alert, index) => {
                  const AlertIcon = getAlertIcon(alert.metricName);
                  const colors = getAlertColor(alert.metricName);
                  const alertDate = new Date(alert.metadata.alertTimestamp);

                  return (
                    <div
                      key={index}
                      className={`bg-white rounded-xl shadow-sm border ${colors.borderColor} p-6 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${colors.iconBgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <AlertIcon className={`w-6 h-6 ${colors.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {alert.metricName.split('.').pop()?.toUpperCase()} Alert
                            </h3>
                            <div className="flex items-center text-xs text-slate-500 flex-shrink-0">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(alertDate, 'MMM d, h:mm a')}
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {alert.alertMessage}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {alert.metricName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && userAlerts.length > 0 && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Stay on Track</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      These alerts help you maintain your health goals. Review them regularly and take action when needed.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Made with Bob
