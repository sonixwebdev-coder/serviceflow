# Security Fixes Checklist

**Date Created**: December 19, 2025
**Status**: 🔴 URGENT ACTION REQUIRED

---

## 🚨 CRITICAL - FIX IMMEDIATELY (Within 24 hours)

### 1. Rotate All Exposed Credentials
- [ ] Generate new database password in Neon dashboard
- [ ] Update DATABASE_URL in production environment
- [ ] Generate new JWT secrets: `openssl rand -base64 32`
- [ ] Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
- [ ] Generate new VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Update VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
- [ ] Remove `.env` from git history (see report for commands)
- [ ] Add `.env` to `.gitignore`
- [ ] Create `.env.example` with placeholders

### 2. Fix ANAF OAuth Encryption
- [ ] Generate dedicated encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Add `ENCRYPTION_KEY` to production environment
- [ ] Replace encryption functions in `anafOAuthService.js` (use AES-256-GCM)
- [ ] Create migration script to re-encrypt existing secrets
- [ ] Run migration on production database
- [ ] Verify all ANAF configs work after migration

### 3. Implement CSRF Protection
- [ ] Install package: `npm install csrf-csrf`
- [ ] Generate CSRF secret: `openssl rand -base64 32`
- [ ] Add `CSRF_SECRET` to environment
- [ ] Add CSRF middleware to `server.js`
- [ ] Create `/api/csrf-token` endpoint
- [ ] Update frontend to fetch CSRF token on load
- [ ] Add CSRF token to all POST/PUT/PATCH/DELETE requests
- [ ] Test all forms and API calls work

---

## ⚠️ HIGH PRIORITY - Fix This Week

### 4. Fix Organization Boundary Bypasses
- [ ] Identify all models that need organizationId
- [ ] Add missing models to `TENANT_MODELS` in `tenantPrisma.js`
- [ ] Replace `prisma` with `req.tenantPrisma` in `/api/anaf.js`
- [ ] Test ANAF endpoints return only org-scoped data
- [ ] Audit all other endpoints for similar issues

### 5. Add Database Verification to Socket.IO
- [ ] Update `realtime/index.js` authentication middleware
- [ ] Add database lookup for user verification
- [ ] Check user `isActive` status
- [ ] Check organization `status`
- [ ] Use database values instead of JWT payload
- [ ] Test WebSocket connections after user deactivation
- [ ] Test connections after org suspension

### 6. Update Vulnerable Dependencies
- [ ] Run `npm audit` in `/apps/backend`
- [ ] Run `npm audit fix --force`
- [ ] Manually update remaining vulnerabilities
- [ ] Test application after updates
- [ ] Update frontend dependencies
- [ ] Document any breaking changes

### 7. Add Vehicle Endpoint Validation
- [ ] Create `schemas/vehicleSchema.js`
- [ ] Define `createVehicleSchema` with Zod
- [ ] Define `updateVehicleSchema` with Zod
- [ ] Add validation middleware to create endpoint
- [ ] Add validation middleware to update endpoint
- [ ] Test vehicle creation with invalid data
- [ ] Test vehicle update with invalid data

### 8. Add Input Validation to Slug Check
- [ ] Create slug validation schema with Zod
- [ ] Add rate limiter (20 requests/minute)
- [ ] Add input validation to route
- [ ] Add random delay (50-100ms)
- [ ] Test rate limiting works
- [ ] Test invalid slugs are rejected

---

## 📋 MEDIUM PRIORITY - Fix This Month

### 9. Implement Rate Limiting on Signup
- [ ] Create signup rate limiter (3 per hour per IP)
- [ ] Add to `/api/organizations/signup` endpoint
- [ ] Test signup rate limiting
- [ ] Consider CAPTCHA for additional protection

### 10. Improve Error Handling
- [ ] Review error messages in production mode
- [ ] Ensure no stack traces in production
- [ ] Add server-side error logging
- [ ] Add error tracking service (Sentry, etc.)
- [ ] Test error responses in production mode

### 11. Invalidate Sessions on Password Change
- [ ] Update `changePassword` function
- [ ] Add transaction to update password + revoke tokens
- [ ] Test all sessions invalidated after password change
- [ ] Update user-facing message
- [ ] Document session invalidation behavior

### 12. Enhance CORS Configuration
- [ ] Create `ALLOWED_ORIGINS` environment variable
- [ ] Update CORS configuration to use env var
- [ ] Add origin validation function
- [ ] Test CORS with multiple origins
- [ ] Document allowed origins setup

### 13. Implement Audit Logging
- [ ] Create `utils/auditLog.js` utility
- [ ] Define audit actions enum
- [ ] Add audit logging to user operations
- [ ] Add audit logging to organization operations
- [ ] Add audit logging to critical business operations
- [ ] Create admin UI to view audit logs
- [ ] Test audit logs are created correctly

---

## 🔍 LOW PRIORITY - Improvements

### 14. Enhance File Upload Validation
- [ ] Add content validation for CSV files
- [ ] Implement CSV formula injection protection
- [ ] Add file size validation
- [ ] Test with malicious CSV files

### 15. Add Security Headers
- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Add `X-Frame-Options: SAMEORIGIN`
- [ ] Add `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Test headers are set correctly

---

## 🔧 INFRASTRUCTURE

### 16. Set Up Security Automation
- [ ] Create `.github/workflows/security.yml`
- [ ] Add `npm audit` to CI/CD
- [ ] Add dependency scanning (Snyk/Dependabot)
- [ ] Set up automated security notifications
- [ ] Configure security scanning thresholds

### 17. Environment Management
- [ ] Document environment variable setup
- [ ] Create environment variable checklist
- [ ] Set up secret rotation procedures
- [ ] Document incident response procedures
- [ ] Create security runbook

---

## 📊 TESTING & VALIDATION

### Post-Fix Verification
- [ ] Run security scan after fixes
- [ ] Test multi-tenant isolation
- [ ] Test authentication flows
- [ ] Test authorization boundaries
- [ ] Perform CSRF attack simulation
- [ ] Test rate limiting
- [ ] Review audit logs

### Penetration Testing
- [ ] Schedule external security audit
- [ ] Focus on multi-tenant isolation
- [ ] Test ANAF integration security
- [ ] Test authentication bypasses
- [ ] Review findings and remediate

---

## 📝 DOCUMENTATION

- [ ] Document all security fixes applied
- [ ] Update security documentation
- [ ] Create security best practices guide
- [ ] Document incident response procedures
- [ ] Train team on security practices

---

## 🎯 SUCCESS CRITERIA

### Week 1 (Critical Fixes)
✅ All secrets rotated
✅ CSRF protection implemented
✅ ANAF encryption fixed
✅ Organization boundaries secured

### Week 2 (High Priority)
✅ Dependencies updated
✅ Socket.IO authentication hardened
✅ Input validation complete
✅ Rate limiting implemented

### Month 1 (Complete Remediation)
✅ All audit logging in place
✅ Security automation configured
✅ Penetration testing completed
✅ Team trained on security

---

## 📞 ESCALATION

If you encounter issues during remediation:
1. Review the detailed report: `SECURITY_AUDIT_REPORT.md`
2. Test in development environment first
3. Document any breaking changes
4. Coordinate with team before production deployment

---

**Priority Legend**:
- 🔴 CRITICAL - Security breach risk, fix immediately
- ⚠️ HIGH - Significant vulnerability, fix within 1 week
- 📋 MEDIUM - Important security improvement, fix within 1 month
- 🔍 LOW - Minor security enhancement
- ℹ️ INFORMATIONAL - Best practice improvement
