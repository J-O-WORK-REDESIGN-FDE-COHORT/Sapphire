import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle } from 'lucide-react';
import { Alert } from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface NotificationBellProps {
  alerts: Alert[];
  onMarkAsRead: (alertId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export default function NotificationBell({
  alerts,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = alerts.filter((alert) => !alert.read).length;

  console.log('🔔 NotificationBell render:');
  console.log('  Total alerts:', alerts.length);
  console.log('  Unread count:', unreadCount);
  console.log('  Alerts:', alerts);

  const handleAlertClick = (alert: Alert) => {
    const alertId = `${alert.userId}-${alert.alertTimestamp}`;
    console.log('👆 Alert clicked:', alertId, 'read:', alert.read);
    
    // Track notification click
    trackEvent(AnalyticsEvents.NOTIFICATION_CLICKED, {
      alertId,
      alertMessage: alert.alertMessage,
      totalSteps: alert.totalSteps,
      timestamp: new Date().toISOString(),
    });
    
    if (!alert.read) {
      onMarkAsRead(alertId);
    }
  };

  useEffect(() => {
    console.log('🔔 NotificationBell alerts updated:', alerts.length);
  }, [alerts]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Activity Alerts</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            {alerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-xs text-red-600 hover:text-red-700"
              >
                <X className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No alerts</p>
              <p className="text-gray-400 text-xs mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => {
                const alertId = `${alert.userId}-${alert.alertTimestamp}`;
                return (
                  <div
                    key={alertId}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !alert.read ? 'bg-blue-50/30' : ''
                    }`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 mb-2">
                          {alert.alertMessage}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(alert.alertTimestamp), {
                              addSuffix: true,
                            })}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {alert.totalSteps} steps
                          </span>
                        </div>
                      </div>
                      {!alert.read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Made with Bob
