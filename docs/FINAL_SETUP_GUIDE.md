# Final Setup Guide - Notification System with Keycloak

## ✅ What's Been Done

1. **Spring Boot Notification API** - Configured to run on port 8084
2. **CORS Fixed** - Added port 5000 to allowed origins
3. **Sapphire Backend** - Added endpoint to provide Keycloak access token
4. **React Frontend** - Integrated notification bell with Keycloak authentication

## 🚀 Setup Steps

### 1. Restart Sapphire Backend

```bash
cd C:/Work/Offering/Sapphire
# Stop current instance (Ctrl+C)
npm run dev
```

This will:
- Start Sapphire on port 5000
- Expose `/api/notifications/token` endpoint
- Provide Keycloak access token to frontend

### 2. Restart Spring Boot Notification API

```bash
cd c:/Work/Offering/sapphire-notification-api
# Stop current instance (Ctrl+C)
mvn spring-boot:run
```

This will:
- Start notification API on port 8084
- Accept connections from port 5000 (CORS configured)
- Use Keycloak tokens for authentication

### 3. Ensure Kafka is Running

```bash
cd c:/Work/Offering/sapphire-notification-api
docker-compose ps

# If not running:
docker-compose up -d
```

### 4. Login to Sapphire

1. Open browser: `http://localhost:5000`
2. Login as Sarah Johnson (or any user)
3. You should see the bell icon in top-right corner
4. Check browser console for: `✅ Connected to notification service for user: sarah.johnson@sapphirewellness.com`

### 5. Send Test Alert

```bash
curl -X POST http://localhost:8084/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Health Alert",
    "message": "Your blood pressure reading is ready",
    "type": "INFO",
    "priority": "HIGH",
    "targetUserIds": ["sarah.johnson@sapphirewellness.com"]
  }'
```

## ✅ Success Indicators

### Browser Console
```
✅ Connected to notification service for user: sarah.johnson@sapphirewellness.com
```

### Spring Boot Logs
```
WebSocket connected - User: sarah.johnson@sapphirewellness.com, Session: abc-123
Alert alert-001 sent to 1 users, 0 users skipped
```

### UI
- Bell icon visible in top-right
- "🟢 Live" indicator (desktop)
- Badge shows "1" when alert received
- Toast notification appears
- Browser notification (if permitted)

## 🔧 How It Works

### Authentication Flow

```
1. User logs in to Sapphire via Keycloak
   ↓
2. Sapphire stores Keycloak access_token in session
   ↓
3. Frontend calls /api/notifications/token
   ↓
4. Sapphire backend returns { token, userId: email }
   ↓
5. Frontend connects to WebSocket with Keycloak token
   ↓
6. Spring Boot validates token and extracts userId (email)
   ↓
7. User is connected and can receive alerts
```

### Alert Flow

```
Kafka Topic → Spring Boot → WebSocket → Sapphire → User
    ↓              ↓             ↓           ↓        ↓
  alert      Filter by      Route to    Display    Sees
  message    email          user's      in bell    alert
                            session     icon
```

## 📝 Key Changes Made

### 1. Sapphire Backend (`server/routes-notification.ts`)
```typescript
// New endpoint to provide Keycloak token
app.get("/api/notifications/token", requireAuth, async (req, res) => {
  const accessToken = req.session.accessToken;
  const user = await storage.getUser(req.session.userId);
  res.json({
    token: accessToken,  // Keycloak access token
    userId: user.email   // Use email as userId
  });
});
```

### 2. React Hook (`client/src/hooks/useNotifications.ts`)
```typescript
// Get token from Sapphire backend (not notification API)
const tokenData = await fetch('/api/notifications/token', {
  credentials: 'include'
}).then(r => r.json());

// Connect with Keycloak token
notificationService.connect(
  tokenData.userId,  // sarah.johnson@sapphirewellness.com
  tokenData.token,   // Keycloak access token
  handleAlertReceived,
  'http://localhost:8084/ws'
);
```

### 3. Spring Boot CORS (`SecurityConfig.java`)
```java
configuration.setAllowedOrigins(List.of(
    "http://localhost:3000",
    "http://localhost:5000",  // Added for Sapphire
    "http://localhost:5173",
    "http://localhost:4200"
));
```

## 🧪 Testing

### Test 1: Check Connection
```bash
# Check Sapphire backend
curl http://localhost:5000/api/auth/me

# Check notification API
curl http://localhost:8084/api/notifications/health

# Check stats (should show Sarah if connected)
curl http://localhost:8084/api/notifications/stats
```

### Test 2: Send Alert
```bash
curl -X POST http://localhost:8084/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "message": "Hello Sarah!",
    "type": "SUCCESS",
    "priority": "MEDIUM",
    "targetUserIds": ["sarah.johnson@sapphirewellness.com"]
  }'
```

### Test 3: Via Kafka
```bash
docker exec -it kafka kafka-console-producer \
  --topic alert \
  --bootstrap-server localhost:9092

# Paste this JSON:
{"id":"kafka-1","title":"Kafka Alert","message":"From Kafka!","type":"INFO","priority":"HIGH","targetUserIds":["sarah.johnson@sapphirewellness.com"],"timestamp":"2024-01-15T10:30:00"}
```

## 🐛 Troubleshooting

### Issue: User Not Connected

**Check browser console:**
```javascript
// Should see:
✅ Connected to notification service for user: sarah.johnson@sapphirewellness.com
```

**If not connected:**
1. Check `/api/notifications/token` returns token:
   ```bash
   # In browser console:
   fetch('/api/notifications/token', {credentials: 'include'})
     .then(r => r.json())
     .then(console.log)
   ```

2. Check Spring Boot logs for connection attempt

3. Verify CORS is working (no errors in console)

### Issue: Alert Not Received

**Check targetUserIds matches exactly:**
```json
{
  "targetUserIds": ["sarah.johnson@sapphirewellness.com"]
}
```

**Not:**
- `"user123"`
- `"sarah"`
- `"1"`

**Check Spring Boot logs:**
```
Alert alert-001 sent to 1 users, 0 users skipped  ✅ Good
Alert alert-001 sent to 0 users, 1 users skipped  ❌ User not connected
```

### Issue: CORS Error

**Restart Spring Boot** after CORS changes:
```bash
cd c:/Work/Offering/sapphire-notification-api
mvn spring-boot:run
```

## 📚 Files Modified

### Sapphire
- ✅ `server/routes-notification.ts` - New file
- ✅ `server/routes.ts` - Added notification routes
- ✅ `client/src/hooks/useNotifications.ts` - Updated to use Keycloak token
- ✅ `client/src/components/notification-bell.tsx` - New component
- ✅ `client/src/services/notificationService.ts` - New service
- ✅ `client/src/pages/dashboard.tsx` - Added bell icon
- ✅ `.env.example` - Added VITE_NOTIFICATION_API_URL

### Notification API
- ✅ `src/main/java/.../config/SecurityConfig.java` - Added port 5000 to CORS
- ✅ `src/main/resources/application.yml` - Port 8084

## 🎉 You're Done!

The notification system is now fully integrated with Sapphire's Keycloak authentication!

**Next Steps:**
1. Integrate with health monitoring logic
2. Send alerts when thresholds are exceeded
3. Add notification preferences
4. Implement notification history

Happy coding! 🚀