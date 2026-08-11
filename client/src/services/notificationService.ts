import SockJS from 'sockjs-client';
import { Client, StompSubscription } from '@stomp/stompjs';

export interface Alert {
  userId: string;
  deviceId?: string | null;
  windowStartTime: number;
  windowEndTime: number;
  totalSteps: number;
  alertTimestamp: number;
  alertMessage: string;
  read?: boolean;
}

// Backend alert format (from notification API)
interface BackendAlert {
  userId: string;
  deviceId?: string | null;
  totalSteps?: number;
  windowStartTime?: number;
  windowEndTime?: number;
  alertMessage: string;
  alertTimestamp: number;
  [key: string]: any; // Allow other fields
}

class NotificationService {
  // No transformation needed - alerts come from GraphQL subscription
  private client: Client | null = null;
  private connected: boolean = false;
  private subscriptions: StompSubscription[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  // Deprecated - use GraphQL subscription instead
  connect(
    userId: string,
    token: string,
    onMessageReceived: (alert: Alert) => void,
    serverUrl: string = 'http://localhost:8080/ws'
  ): void {
    console.warn('WebSocket connection is deprecated. Use GraphQL subscription instead.');
  }

  disconnect(): void {
    if (this.client) {
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions = [];
      this.client.deactivate();
      this.connected = false;
      console.log('Disconnected from notification service');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  send(destination: string, body: any): void {
    if (this.client && this.connected) {
      this.client.publish({
        destination: destination,
        body: JSON.stringify(body),
      });
    } else {
      console.error('Cannot send message: Not connected');
    }
  }
}

export default new NotificationService();

// Made with Bob
