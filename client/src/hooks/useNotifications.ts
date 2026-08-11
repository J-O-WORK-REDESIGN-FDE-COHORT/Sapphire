import { useState, useCallback } from 'react';
import { Alert } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAlertSubscription } from '@/hooks/useAlertSubscription';

export function useNotifications() {
  console.log('🔔 useNotifications hook initialized');
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { user, isLoading, isAuthenticated, accessToken } = useAuth();
  const { toast } = useToast();

  console.log('👤 Current user:', user?.email);

  const subscriptionUserId = !isLoading && isAuthenticated && accessToken ? user?.email : undefined;

  // Handle received alert from GraphQL subscription
  const handleAlertReceived = useCallback((alert: Alert) => {
    console.log('🚨 handleAlertReceived called with alert:', alert);
    
    try {
      setAlerts((prev) => {
        const newAlerts = [{ ...alert, read: false }, ...prev];
        console.log('📋 Updated alerts list, count:', newAlerts.length);
        return newAlerts;
      });

      // Show toast notification
      toast({
        title: 'Activity Alert',
        description: alert.alertMessage,
        variant: 'default',
      });
      console.log('✅ Toast notification shown');

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('Activity Alert', {
          body: alert.alertMessage,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        console.log('✅ Browser notification shown');
      } else {
        console.log('⚠️ Browser notifications not available or not permitted');
      }

      // Play sound for alerts
      playNotificationSound();
    } catch (error) {
      console.error('❌ Error handling received alert:', error, alert);
    }
  }, [toast]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch((err) => console.log('Could not play sound:', err));
    } catch (error) {
      console.log('Sound playback not supported');
    }
  };

  // Use GraphQL subscription for alerts
  const { error: subscriptionError, loading: subscriptionLoading } = useAlertSubscription(
    subscriptionUserId,
    handleAlertReceived
  );

  const isConnected = !subscriptionLoading && !subscriptionError;
  
  console.log('📊 Subscription status:');
  console.log('  loading:', subscriptionLoading);
  console.log('  error:', subscriptionError);
  console.log('  isConnected:', isConnected);

  // Mark alert as read
  const markAsRead = useCallback((alertId: string) => {
    console.log('📖 Marking alert as read:', alertId);
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.alertTimestamp.toString() === alertId ? { ...alert, read: true } : alert
      )
    );
  }, []);

  // Mark all alerts as read
  const markAllAsRead = useCallback(() => {
    console.log('📖 Marking all alerts as read');
    setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true })));
  }, []);

  // Clear all alerts
  const clearAll = useCallback(() => {
    console.log('🗑️ Clearing all alerts');
    setAlerts([]);
  }, []);

  // Remove specific alert
  const removeAlert = useCallback((alertId: string) => {
    console.log('🗑️ Removing alert:', alertId);
    setAlerts((prev) => prev.filter((alert) => alert.alertTimestamp.toString() !== alertId));
  }, []);

  return {
    alerts,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeAlert,
    unreadCount: alerts.filter((a) => !a.read).length,
  };
}

// Made with Bob
