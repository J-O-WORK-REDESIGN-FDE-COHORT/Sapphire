# Keycloak CORS Configuration Fix

## Problem
CORS error when trying to authenticate:
```
Access to fetch at 'http://localhost:8090/realms/saphhire-ui/protocol/openid-connect/token' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

## Solution

### Step 1: Configure Keycloak Client Settings

1. **Login to Keycloak Admin Console**
   - URL: `http://localhost:8090`
   - Go to your realm: `saphhire-ui`

2. **Navigate to Client Settings**
   - Click on "Clients" in the left menu
   - Select your client: `sapphire-ui`

3. **Configure CORS Settings**

   **Settings Tab:**
   - **Access Type**: `public` (for frontend applications)
   - **Standard Flow Enabled**: `ON`
   - **Direct Access Grants Enabled**: `ON` (optional, for testing)
   - **Valid Redirect URIs**: 
     ```
     http://localhost:5173/callback
     http://localhost:5173/*
     ```
   - **Valid Post Logout Redirect URIs**:
     ```
     http://localhost:5173
     http://localhost:5173/*
     ```
   - **Web Origins**: 
     ```
     http://localhost:5173
     +
     ```
     Note: The `+` means "allow all valid redirect URIs"
   
   - **Admin URL**: Leave empty for public clients

4. **Advanced Settings (Important for PKCE)**
   - Scroll down to "Advanced Settings"
   - **Proof Key for Code Exchange Code Challenge Method**: `S256`
   - This enables PKCE which is required for public clients

5. **Click "Save"**

### Step 2: Verify Realm Settings

1. **Go to Realm Settings**
   - Click "Realm Settings" in the left menu
   - Go to "Security Defenses" tab

2. **CORS Settings**
   - Ensure CORS is not overly restrictive
   - The Web Origins setting in the client should handle CORS

### Step 3: Test the Configuration

1. **Restart your frontend dev server**
   ```bash
   npm run dev
   ```

2. **Open browser console** and try to login

3. **Expected behavior:**
   - No CORS errors
   - Redirect to Keycloak login page
   - After login, redirect back to `http://localhost:5173/callback`
   - Token exchange completes successfully

## Common Issues

### Issue 1: Still getting CORS errors
**Solution:** Make sure Web Origins includes `http://localhost:5173` or `+`

### Issue 2: Invalid redirect URI
**Solution:** Ensure Valid Redirect URIs includes `http://localhost:5173/callback`

### Issue 3: PKCE errors
**Solution:** Enable PKCE in Advanced Settings with S256 method

## Production Configuration

For production, update these settings:

```
Valid Redirect URIs:
  https://yourdomain.com/callback
  https://yourdomain.com/*

Valid Post Logout Redirect URIs:
  https://yourdomain.com
  https://yourdomain.com/*

Web Origins:
  https://yourdomain.com
```

## Keycloak Client Configuration Summary

| Setting | Value |
|---------|-------|
| Client ID | `sapphire-ui` |
| Access Type | `public` |
| Standard Flow | `ON` |
| Valid Redirect URIs | `http://localhost:5173/callback`, `http://localhost:5173/*` |
| Web Origins | `http://localhost:5173` or `+` |
| PKCE Method | `S256` |

## Alternative: Using Keycloak Admin CLI

You can also configure this via CLI:

```bash
# Get admin token
TOKEN=$(curl -X POST "http://localhost:8090/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

# Update client
curl -X PUT "http://localhost:8090/admin/realms/saphhire-ui/clients/{client-uuid}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "sapphire-ui",
    "publicClient": true,
    "redirectUris": ["http://localhost:5173/callback", "http://localhost:5173/*"],
    "webOrigins": ["http://localhost:5173"],
    "attributes": {
      "pkce.code.challenge.method": "S256"
    }
  }'
```

## Verification

After configuration, verify in browser console:
```javascript
// Should see successful authentication
🔐 Keycloak Configuration: {
  CLIENT_ID: "sapphire-ui",
  KEYCLOAK_URL: "http://localhost:8090",
  KEYCLOAK_REALM: "saphhire-ui"
}
```

No CORS errors should appear in the Network tab.