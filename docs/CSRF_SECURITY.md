# CSRF Protection Documentation

## Overview

This application implements industry-standard CSRF (Cross-Site Request Forgery) protection using the **Double Submit Cookie** pattern, following OWASP (Open Web Application Security Project) guidelines.

## How It Works

### 1. Token Generation
- When the application loads, it requests a CSRF token from `/api/csrf-token`
- The server generates a random token and:
  - Sets it in a secure HTTP-only cookie
  - Returns it in the response body

### 2. Token Validation
- For state-changing requests (POST, PUT, PATCH, DELETE):
  - The client includes the token in the `x-csrf-token` header
  - The server validates that the token in the cookie matches the header token
- GET, HEAD, and OPTIONS requests are exempt (as they should be idempotent)

### 3. Token Lifecycle
- Tokens are valid for 24 hours
- Tokens are tied to the user session (or IP address for unauthenticated requests)
- If validation fails, the client automatically fetches a new token and retries the request

## Security Features

### Industry Standards Compliance

✅ **OWASP Recommended Pattern**: Uses Double Submit Cookie pattern
✅ **Secure Cookies**: HTTP-only, Secure (in production), SameSite=Strict
✅ **Session Binding**: Tokens are bound to user sessions to prevent reuse
✅ **Automatic Retry**: Transparent token refresh on validation failures
✅ **Comprehensive Logging**: All CSRF failures are logged with context
✅ **Exempt Paths**: Public endpoints are properly exempted

### Cookie Configuration

**Development:**
```javascript
{
  name: 'csrf-token',
  httpOnly: true,
  secure: false,
  sameSite: 'strict',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}
```

**Production:**
```javascript
{
  name: '__Host-csrf-token', // __Host- prefix for enhanced security
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}
```

## Implementation Details

### Backend (server.js)

```javascript
const { csrfProtection, generateToken } = require('./src/middleware/csrfProtection');

// CSRF token endpoint
app.get('/api/csrf-token', generateToken);

// Apply CSRF protection
app.use(csrfProtection);
```

### Frontend (utils/api.js)

```javascript
// Fetch token on app load
fetchCsrfToken();

// Include token in requests
API.interceptors.request.use((config) => {
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['x-csrf-token'] = csrfToken;
  }
  return config;
});

// Auto-retry on CSRF failures
API.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 403 && isCSRFError) {
    await fetchCsrfToken();
    return API(originalRequest);
  }
});
```

## Exempt Paths

The following paths are exempt from CSRF protection:

- `/health` - Health check endpoint
- `/` - Root endpoint
- `/api/csrf-token` - Token generation endpoint
- `/api/auth/login` - Login endpoint (uses credentials)
- `/api/auth/register` - Registration endpoint
- `/api/auth/refresh` - Token refresh endpoint
- `/api/organizations/signup` - Public signup
- `/api/organizations/check-slug/*` - Public slug validation
- `/files/*` - Static file serving

## Testing CSRF Protection

### 1. Test Token Generation

```bash
curl -c cookies.txt http://localhost:5000/api/csrf-token
```

Expected response:
```json
{
  "csrfToken": "...",
  "message": "CSRF token generated successfully"
}
```

### 2. Test Protected Endpoint Without Token

```bash
curl -b cookies.txt -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Client"}'
```

Expected response (403):
```json
{
  "success": false,
  "message": "CSRF validation failed. Please refresh the page and try again.",
  "code": "CSRF_VALIDATION_FAILED"
}
```

### 3. Test Protected Endpoint With Valid Token

```bash
# First, get the token
TOKEN=$(curl -s -c cookies.txt http://localhost:5000/api/csrf-token | jq -r '.csrfToken')

# Then make the request
curl -b cookies.txt -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $TOKEN" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "Test Client"}'
```

Expected response (200):
```json
{
  "success": true,
  "data": { ... },
  "message": "Client created successfully"
}
```

### 4. Test GET Request (Should Work Without Token)

```bash
curl -X GET http://localhost:5000/api/clients \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

GET requests should work without CSRF token.

### 5. Test Exempt Path

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

Login endpoint should work without CSRF token.

## Browser Testing

### 1. Check Cookie in Browser DevTools

1. Open Application/Storage tab
2. Navigate to Cookies
3. Verify `csrf-token` cookie exists with:
   - HttpOnly: ✓
   - Secure: ✓ (in production)
   - SameSite: Strict
   - Path: /

### 2. Check Network Requests

1. Open Network tab
2. Make a POST/PUT/DELETE request
3. Check Request Headers for `x-csrf-token`
4. Verify the token value matches the cookie

### 3. Test Auto-Retry

1. Clear cookies manually
2. Make a POST request
3. Observe:
   - First request fails with 403
   - Token is automatically fetched
   - Request is automatically retried
   - Second attempt succeeds

## Troubleshooting

### Issue: All POST requests fail with 403

**Cause**: Frontend not sending credentials
**Solution**: Verify `withCredentials: true` is set in axios config

```javascript
const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required!
});
```

### Issue: Token cookie not being set

**Cause**: CORS not configured to allow credentials
**Solution**: Verify CORS config in server.js

```javascript
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true // Required!
};
app.use(cors(corsOptions));
```

### Issue: Token validation fails after login

**Cause**: Session identifier changed
**Solution**: This is expected behavior. The token is automatically refreshed.

### Issue: CSRF errors in production

**Cause**: Mixed HTTP/HTTPS or cookie configuration
**Solution**:
1. Ensure `CSRF_SECRET` is set in production .env
2. Verify `NODE_ENV=production`
3. Ensure using HTTPS
4. Check that `__Host-` prefix cookies work (HTTPS only)

## Environment Variables

```bash
# Required for production
CSRF_SECRET=your-random-64-character-secret-key-here

# Set to production for enhanced security
NODE_ENV=production
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Considerations

### ✅ What This Protects Against

- **CSRF Attacks**: Prevents unauthorized state-changing requests from malicious sites
- **Session Riding**: Tokens are bound to sessions
- **Cookie Theft**: HTTP-only cookies prevent JavaScript access
- **Man-in-the-Middle**: Secure flag in production (HTTPS only)

### ⚠️ What This Does NOT Protect Against

- **XSS (Cross-Site Scripting)**: Use Content Security Policy and input sanitization
- **SQL Injection**: Use parameterized queries (Prisma handles this)
- **Authentication Bypass**: Use strong authentication mechanisms
- **Authorization Issues**: Implement proper role-based access control

## Best Practices

1. **Always use HTTPS in production**
2. **Set CSRF_SECRET in environment variables**
3. **Don't disable CSRF protection** (even for development)
4. **Keep exempt paths to a minimum**
5. **Monitor CSRF failure logs**
6. **Rotate CSRF_SECRET periodically**
7. **Use SameSite=Strict cookies**
8. **Combine with other security measures** (authentication, authorization, rate limiting)

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
