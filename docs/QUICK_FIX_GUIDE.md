# Quick Fix Guide - Notification System

## Issue
CORS error when connecting from Sapphire (port 5000) to Notification API (port 8084).

## ✅ Fixes Applied

### 1. Updated CORS Configuration
Added `http://localhost:5000` to allowed origins in Spring Boot SecurityConfig.

### 2. Updated Environment Variables
Set correct port in `.env.example`:
```env
VITE_NOTIFICATION_API_URL=http://localhost:8084
```

## 🚀 Steps to Fix

### 1. Restart Spring Boot Application
```bash
cd c:/Work/Offering/sapphire-notification-api
# Stop the current running instance (Ctrl+C)
mvn spring-boot:run
```

### 2. Update Sapphire .env File
```bash
cd C:/Work/Offering/Sapphire
```

Create or update `.env` file:
```env
VITE_NOTIFICATION_API_URL=http://localhost:8084
```

### 3. Restart Sapphire App
```bash
# Stop the current instance (Ctrl+C)
npm run dev
```

### 4. Test Connection

1. **Login to Sapphire** as Sarah Johnson
2. **Check browser console** - should see:
   ```
   ✅ Connected to notification service
   ```
3. **Look for bell icon** in top-right corner
4. **Check for "🟢 Live" indicator** (desktop only)

### 5. Send Test Alert

Use Sarah's email as the userId:

```bash
curl -X POST http://localhost:8084/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "message": "Hello Sarah! This is a test notification",
    "type": "INFO",
    "priority": "HIGH",
    "targetUserIds": ["sarah.johnson@sapphirewellness.com"]
  }'
```

### 6. Verify

You should see:
- ✅ Toast notification appears
- ✅ Bell icon shows badge "1"
- ✅ Browser notification (if permitted)
- ✅ Alert in dropdown when clicking bell

## 🔍 Troubleshooting

### Still Getting CORS Error?

1. **Check Spring Boot is running on 8084**:
   ```bash
   curl http://localhost:8084/api/notifications/health
   ```
   Should return: `{"status":"UP","service":"notification-api"}`

2. **Check Sapphire .env file**:
   ```bash
   cat .env | grep NOTIFICATION
   ```
   Should show: `VITE_NOTIFICATION_API_URL=http://localhost:8084`

3. **Clear browser cache** and reload

### User Not Connected?

Check the userId being used. In browser console:
```javascript
// Check what userId is being sent
console.log('User:', user);
```

The userId should match what you use in the alert's `targetUserIds` array.

### Check Connection Status

In browser console:
```javascript
// Check if connected
console.log('Connected:', notificationService.isConnected());
```

Or check the backend:
```bash
curl http://localhost:8084/api/notifications/stats
```

Should show Sarah in the `userList` if connected.

## 📝 Important Notes

### User Identification

Sapphire uses **email addresses** as user identifiers, so:
- ✅ Use: `"sarah.johnson@sapphirewellness.com"`
- ❌ Don't use: `"user123"` or numeric IDs

### Alert Format

Always use the full email in `targetUserIds`:
```json
{
  "targetUserIds": ["sarah.johnson@sapphirewellness.com"]
}
```

### Multiple Users

To send to multiple users:
```json
{
  "targetUserIds": [
    "sarah.johnson@sapphirewellness.com",
    "john.doe@sapphirewellness.com"
  ]
}
```

## ✅ Success Indicators

When everything is working:

1. **Browser Console**:
   ```
   ✅ Connected to notification service
   Connected to notification service
   ```

2. **Spring Boot Logs**:
   ```
   WebSocket connected - User: sarah.johnson@sapphirewellness.com, Session: abc-123
   ```

3. **UI**:
   - Bell icon visible in top-right
   - "🟢 Live" indicator (desktop)
   - No console errors

4. **Test Alert**:
   ```
   Alert alert-001 sent to 1 users, 0 users skipped
   ```

## 🎉 You're Done!

Once you see the success indicators, the notification system is fully working!