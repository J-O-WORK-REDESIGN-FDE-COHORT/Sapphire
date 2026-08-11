# Notification System Integration Guide for Sapphire

This guide explains how to integrate the real-time notification system into the Sapphire healthcare application.

## 🎯 What's Been Added

### 1. **Notification Service** (`client/src/services/notificationService.ts`)
- WebSocket connection manager using STOMP protocol
- Handles connection, reconnection, and message routing
- Subscribes to user-specific and broadcast channels

### 2. **Notification Hook** (`client/src/hooks/useNotifications.ts`)
- React hook for managing notifications
- Automatically connects when user logs in
- Handles browser notifications and toast messages
- Manages alert state (read/unread, clear, etc.)

### 3. **Notification Bell Component** (`client/src/components/notification-bell.tsx`)
- Beautiful UI component with bell icon
- Shows unread count badge
- Dropdown with scrollable alert list
- Mark as read, mark all as read, clear all functionality

### 4. **Dashboard Integration** (`client/src/pages/dashboard.tsx`)
- Notification bell added to both mobile and desktop headers
- Shows connection status (🟢 Live indicator)
- Fully integrated with existing dashboard

## 📦 Dependencies Added

The following packages have been installed:
```json
{
  "sockjs-client": "^1.6.1",
  "@stomp/stompjs": "^7.0.0"
}
```

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:
```env
VITE_NOTIFICATION_API_URL=http://localhost:8080
```

This points to your Spring Boot notification API backend.

## 🚀 How It Works

### Connection Flow

1. **User logs in** to Sapphire app
2. **useNotifications hook** automatically:
   - Gets JWT token from notification API
   - Connects to WebSocket at `/ws` endpoint
   - Subscribes to `/user/queue/alerts` (user-specific)
   - Subscribes to `/topic/alerts` (broadcast)
3. **When alert arrives**:
   - Shows toast notification
   - Shows browser notification (if permitted)
   - Plays sound for high-priority alerts
   - Updates bell icon with unread count
   - Adds to notification list

### Alert Flow

```
Kafka Topic → Spring Boot → WebSocket → Sapphire App → User
    ↓              ↓             ↓            ↓          ↓
  alert      Process &      Route to     Display in   Sees
  message    filter by      user's       bell icon    alert
             targetUserIds  session
```

## 🎨 UI Features

### Notification Bell
- **Badge**: Shows unread count (e.g., "3")
- **Animated**: Pulses when there are unread notifications
- **Dropdown**: Click to see all notifications
- **Actions**:
  - Mark individual alert as read
  - Mark all as read
  - Clear all notifications
  - Click alert to navigate (if actionUrl provided)

### Alert Types & Colors
- **INFO**: Blue - Informational messages
- **SUCCESS**: Green - Success confirmations
- **WARNING**: Yellow - Warning messages
- **ERROR**: Red - Error notifications
- **CRITICAL**: Red with pulse - Critical alerts

### Priority Levels
- **LOW**: Gray badge
- **MEDIUM**: Blue badge
- **HIGH**: Orange badge
- **URGENT**: Red badge + sound notification

## 📱 Browser Notifications

The system requests browser notification permission on first load. When granted:
- Notifications appear even when tab is not focused
- Click notification to focus app and navigate
- URGENT priority alerts require user interaction

## 🧪 Testing the Integration

### 1. Start the Notification API

```bash
cd sapphire-notification-api
docker-compose up -d  # Start Kafka
mvn spring-boot:run   # Start Spring Boot
```

### 2. Start Sapphire App

```bash
cd Sapphire
npm run dev
```

### 3. Send Test Alert

```bash
# Get user ID from Sapphire (check browser console or database)
USER_ID="1"  # Replace with actual user ID

# Send test alert
curl -X POST http://localhost:8080/api/notifications/send \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Health Alert\",
    \"message\": \"Your blood pressure reading is ready\",
    \"type\": \"INFO\",
    \"priority\": \"HIGH\",
    \"targetUserIds\": [\"$USER_ID\"],
    \"category\": \"health\",
    \"actionUrl\": \"/dashboard\"
  }"
```

### 4. Verify

- ✅ Bell icon shows badge with "1"
- ✅ Toast notification appears
- ✅ Browser notification shows (if permitted)
- ✅ Click bell to see alert in dropdown
- ✅ Click alert to mark as read

## 🔗 Integration with Existing Features

### Health Monitoring Alerts

You can now send alerts for:

**Blood Pressure Alerts**:
```javascript
{
  "title": "Blood Pressure Alert",
  "message": "Your blood pressure is elevated (140/90)",
  "type": "WARNING",
  "priority": "HIGH",
  "targetUserIds": ["userId"],
  "category": "blood-pressure",
  "actionUrl": "/dashboard"
}
```

**Activity Goals**:
```javascript
{
  "title": "Daily Goal Achieved! 🎉",
  "message": "Congratulations! You've reached your 10,000 step goal",
  "type": "SUCCESS",
  "priority": "MEDIUM",
  "targetUserIds": ["userId"],
  "category": "activity"
}
```

**Heart Rate Alerts**:
```javascript
{
  "title": "Heart Rate Alert",
  "message": "Unusual heart rate detected (120 BPM at rest)",
  "type": "CRITICAL",
  "priority": "URGENT",
  "targetUserIds": ["userId"],
  "category": "heart-rate",
  "actionUrl": "/dashboard"
}
```

**Sleep Reminders**:
```javascript
{
  "title": "Sleep Reminder",
  "message": "Time to wind down for better sleep quality",
  "type": "INFO",
  "priority": "LOW",
  "targetUserIds": ["userId"],
  "category": "sleep"
}
```

## 🔌 Backend Integration Points

### Where to Publish Alerts

In your Sapphire backend, publish alerts to Kafka when:

1. **Health metrics exceed thresholds**
2. **Daily goals are achieved**
3. **Appointments are scheduled/upcoming**
4. **Lab results are available**
5. **Medication reminders**
6. **System maintenance notifications**

### Example: Publishing from Node.js Backend

```javascript
// server/services/notificationService.js
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'sapphire-backend',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

export async function sendHealthAlert(userId, title, message, type = 'INFO', priority = 'MEDIUM') {
  await producer.connect();
  
  const alert = {
    id: `alert-${Date.now()}`,
    title,
    message,
    type,
    priority,
    timestamp: new Date().toISOString(),
    targetUserIds: [userId.toString()],
    category: 'health'
  };
  
  await producer.send({
    topic: 'alert',
    messages: [
      { value: JSON.stringify(alert) }
    ]
  });
  
  console.log(`Alert sent to user ${userId}`);
}

// Usage in your health monitoring code
if (bloodPressure.systolic > 140) {
  await sendHealthAlert(
    userId,
    'Blood Pressure Alert',
    `Your blood pressure is elevated (${bloodPressure.systolic}/${bloodPressure.diastolic})`,
    'WARNING',
    'HIGH'
  );
}
```

## 🎯 Customization

### Changing Notification Sound

Add your sound file to `public/notification-sound.mp3` or update the path in `useNotifications.ts`:

```typescript
const audio = new Audio('/your-custom-sound.mp3');
```

### Styling the Bell Icon

Modify `notification-bell.tsx` to match your design system:

```tsx
<Bell className="h-5 w-5 text-your-color" />
```

### Custom Alert Actions

Add custom actions to alerts:

```typescript
<Button onClick={() => handleCustomAction(alert)}>
  Custom Action
</Button>
```

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Bell icon doesn't show "🟢 Live"

**Solutions**:
1. Check notification API is running: `curl http://localhost:8080/api/notifications/health`
2. Check browser console for WebSocket errors
3. Verify CORS settings in Spring Boot SecurityConfig
4. Check `.env` has correct `VITE_NOTIFICATION_API_URL`

### No Notifications Received

**Problem**: Alerts sent but not appearing

**Solutions**:
1. Check user ID matches: `console.log(user.id)` in dashboard
2. Verify alert has correct `targetUserIds`
3. Check Kafka topic has messages: `docker exec -it kafka kafka-console-consumer --topic alert --from-beginning --bootstrap-server localhost:9092`
4. Check Spring Boot logs for errors

### Browser Notifications Not Working

**Problem**: No browser notifications appear

**Solutions**:
1. Check browser notification permission: Settings → Site Settings → Notifications
2. Grant permission when prompted
3. Check browser console for permission errors

## 📊 Monitoring

### Check Connection Status

```javascript
// In browser console
console.log('Connected:', notificationService.isConnected());
```

### View Active Sessions

```bash
curl http://localhost:8080/api/notifications/stats
```

Response:
```json
{
  "connectedUsers": 5,
  "activeSessions": 7,
  "userList": ["1", "2", "3", "4", "5"]
}
```

## 🚀 Production Deployment

### Environment Variables

```env
# Production
VITE_NOTIFICATION_API_URL=https://notifications.sapphire.com

# Staging
VITE_NOTIFICATION_API_URL=https://notifications-staging.sapphire.com
```

### Security Considerations

1. **Use HTTPS/WSS** in production
2. **Implement proper JWT** authentication
3. **Configure CORS** for your domain only
4. **Rate limit** notification API endpoints
5. **Monitor** WebSocket connections

## 📚 Additional Resources

- [Spring WebSocket Documentation](https://docs.spring.io/spring-framework/reference/web/websocket.html)
- [STOMP Protocol](https://stomp.github.io/)
- [Notification API README](../sapphire-notification-api/README.md)
- [WebSocket Subscription Explained](../sapphire-notification-api/WEBSOCKET_SUBSCRIPTION_EXPLAINED.md)

## ✅ Summary

You now have a fully integrated real-time notification system in Sapphire! 

**Features**:
- ✅ Real-time WebSocket notifications
- ✅ Beautiful bell icon UI
- ✅ Browser notifications
- ✅ Toast messages
- ✅ Sound alerts for urgent notifications
- ✅ Read/unread tracking
- ✅ Multi-device support
- ✅ Automatic reconnection

**Next Steps**:
1. Integrate with your health monitoring logic
2. Customize alert types for your use cases
3. Add more notification categories
4. Implement notification preferences
5. Add notification history page

Happy coding! 🎉