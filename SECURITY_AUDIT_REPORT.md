# Security Audit Report - ServiceFlow Application
**Date**: December 19, 2025
**Auditor**: Security Analysis
**Application**: ServiceFlow Multi-tenant SaaS Platform

---

## Executive Summary

This comprehensive security audit identified **16 security findings** across the ServiceFlow application, ranging from CRITICAL to INFORMATIONAL severity. The application demonstrates strong authentication mechanisms and effective multi-tenant data isolation, but several critical vulnerabilities require immediate attention.

### Findings Summary
- **CRITICAL**: 3 findings
- **HIGH**: 5 findings
- **MEDIUM**: 5 findings
- **LOW**: 2 findings
- **INFORMATIONAL**: 1 finding

### Top Priority Issues
1. Missing CSRF protection on all state-changing endpoints
2. Weak encryption for ANAF OAuth secrets with static salt
3. Hardcoded production credentials in `.env` file committed to repository
4. Organization boundary bypasses in ANAF endpoints
5. JWT payload trusted without database verification in Socket.IO

---

## CRITICAL Severity Findings

### 🔴 CRITICAL-001: Missing CSRF Protection on State-Changing Endpoints

**Location**: All POST/PUT/PATCH/DELETE endpoints across `/apps/backend/src/api/`
**CVSS Score**: 8.8 (High)
**CWE**: CWE-352 (Cross-Site Request Forgery)

**Description**:
The application lacks CSRF token validation on state-changing endpoints. Attackers can craft malicious websites that, when visited by authenticated users, trigger unwanted actions such as:
- Creating/modifying/deleting clients, invoices, appointments
- Changing user account settings
- Modifying organization configurations
- Processing financial transactions

**Proof of Concept**:
```html
<!-- Malicious website -->
<form action="https://viperx.online/api/invoices" method="POST" id="csrf-form">
  <input type="hidden" name="clientId" value="attacker-controlled-id">
  <input type="hidden" name="total" value="99999">
</form>
<script>document.getElementById('csrf-form').submit();</script>
```

**Impact**:
- Unauthorized creation of invoices
- Data manipulation/deletion
- Financial fraud
- Account takeover vectors

**Evidence**:
```javascript
// server.js lines 15-45 - No CSRF middleware present
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
// ❌ Missing: CSRF protection middleware
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// ... all routes vulnerable
```

**Remediation**:

1. Install CSRF protection package:
```bash
npm install csrf-csrf
```

2. Add CSRF middleware in `server.js`:
```javascript
const { doubleCsrf } = require("csrf-csrf");

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: "__Host-psifi.x-csrf-token",
  cookieOptions: {
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

// Add before routes
app.use(doubleCsrfProtection);

// Add token endpoint
app.get('/api/csrf-token', (req, res) => {
  return res.json({ csrfToken: generateToken(req, res) });
});
```

3. Update frontend to fetch and include CSRF token:
```javascript
// Fetch token on app load
const { csrfToken } = await fetch('/api/csrf-token').then(r => r.json());

// Include in all requests
fetch('/api/invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(data)
});
```

**References**:
- OWASP CSRF Prevention Cheat Sheet
- CWE-352: Cross-Site Request Forgery (CSRF)

---

### 🔴 CRITICAL-002: Weak Encryption Key Derivation for ANAF OAuth Secrets

**Location**: `/apps/backend/src/services/anaf/anafOAuthService.js:21-30`
**CVSS Score**: 8.1 (High)
**CWE**: CWE-326 (Inadequate Encryption Strength)

**Description**:
The encryption protecting ANAF OAuth client secrets uses a weak key derivation with:
- Static salt (`'salt'`) instead of random per-record salt
- Reuse of JWT secret for encryption (security anti-pattern)
- Fallback to `'default-key'` if environment variable not set
- No authentication (AES-CBC instead of AES-GCM)

**Evidence**:
```javascript
// anafOAuthService.js:23
const key = crypto.scryptSync(
  process.env.JWT_ACCESS_SECRET || 'default-key',  // ❌ JWT secret reused
  'salt',                                           // ❌ Static salt
  32
);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv); // ❌ No auth
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}
```

**Attack Scenario**:
1. Attacker gains read access to database (SQL injection, backup leak, etc.)
2. Attacker knows or guesses JWT_ACCESS_SECRET (may be weak/default)
3. Attacker derives encryption key using static salt
4. Attacker decrypts all ANAF OAuth secrets
5. Attacker submits fraudulent invoices to ANAF on behalf of all organizations

**Impact**:
- Complete compromise of ANAF integration
- Ability to submit fraudulent tax documents
- Legal liability and regulatory violations
- Loss of customer trust

**Remediation**:

1. Generate dedicated encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Add to `.env`:
```
ENCRYPTION_KEY=<generated-64-char-hex-string>
```

3. Replace encryption functions:
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
}

function encrypt(text) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

4. Migrate existing encrypted data:
```javascript
// Migration script
const oldKey = crypto.scryptSync(process.env.JWT_ACCESS_SECRET, 'salt', 32);
const configs = await prisma.anafConfig.findMany();

for (const config of configs) {
  if (config.clientSecret) {
    // Decrypt with old key
    const decrypted = oldDecrypt(config.clientSecret, oldKey);
    // Re-encrypt with new key
    const newEncrypted = encrypt(decrypted);
    await prisma.anafConfig.update({
      where: { id: config.id },
      data: { clientSecret: newEncrypted }
    });
  }
}
```

**References**:
- NIST SP 800-38D (GCM Mode)
- OWASP Cryptographic Storage Cheat Sheet

---

### 🔴 CRITICAL-003: Production Secrets Committed to Repository

**Location**: `/apps/backend/.env` (entire file)
**CVSS Score**: 9.8 (Critical)
**CWE**: CWE-798 (Use of Hard-coded Credentials)

**Description**:
The `.env` file containing production database credentials, JWT secrets, and API keys is committed to the Git repository. This exposes:
- PostgreSQL production database connection string with credentials
- JWT signing secrets (allowing token forgery)
- VAPID keys for push notifications
- Potential for complete system compromise

**Evidence**:
```bash
# .env file committed to repository
DATABASE_URL="postgresql://neondb_owner:npg_QgCZxO3P2cdb@ep-billowing-hall-aditk7ie-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_ACCESS_SECRET=replace-with-access-secret
JWT_REFRESH_SECRET=replace-with-refresh-secret
VAPID_PRIVATE_KEY=pV0mbK3hOf5ALR-omJpe9RVN_elHhpsw1C08R2Jmb7c
VAPID_PUBLIC_KEY=BHxT...
```

**Impact**:
- Complete database access with read/write/delete permissions
- Ability to forge JWT tokens and impersonate any user
- Access to push notification system
- Potential lateral movement to other systems

**Immediate Actions Required**:

1. **ROTATE ALL CREDENTIALS IMMEDIATELY**:
   - Generate new database password in Neon dashboard
   - Generate new JWT secrets: `openssl rand -base64 32`
   - Generate new VAPID keys: `npx web-push generate-vapid-keys`

2. **Remove from Git history**:
```bash
# Remove .env from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch apps/backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (coordinate with team)
git push origin --force --all
```

3. **Update `.gitignore`**:
```
# Environment files
.env
.env.local
.env.*.local
apps/backend/.env
apps/frontend/.env
*.env
```

4. **Create `.env.example`**:
```bash
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# JWT
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# VAPID
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key

# Server
PORT=3000
NODE_ENV=development
```

5. **Implement secrets management**:
   - Use environment variables in production (Vercel, Railway, etc.)
   - Consider AWS Secrets Manager or HashiCorp Vault
   - Document secret rotation procedures

**References**:
- OWASP Top 10 2021: A07 - Identification and Authentication Failures
- GitHub Secret Scanning

---

## HIGH Severity Findings

### 🟠 HIGH-001: Organization Boundary Bypass in ANAF Endpoints

**Location**: `/apps/backend/src/api/anaf.js` lines 76, 192, 513, 586
**CVSS Score**: 7.5 (High)
**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)

**Description**:
Several ANAF endpoints use the global `prisma` instance instead of `req.tenantPrisma`, bypassing organization scoping. This allows users to access data from other organizations.

**Vulnerable Endpoints**:
1. `GET /api/anaf/companies` - Lists all companies across organizations
2. `GET /api/anaf/configs` - Lists all ANAF configs across organizations
3. Various other ANAF endpoints

**Evidence**:
```javascript
// anaf.js:76 - No organizationId filter
router.get('/companies', authenticate, authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const companies = await prisma.company.findMany({
      where: { isActive: true }, // ❌ Missing organizationId filter
      include: { anafConfig: { select: { id: true, cif: true } } }
    });
    return ok(res, companies);
  })
);

// anaf.js:192
const configs = await prisma.anafConfig.findMany({
  where: { isActive: true }, // ❌ Missing organizationId filter
});
```

**Proof of Concept**:
```bash
# User from Organization A can see Organization B's companies
curl -H "Authorization: Bearer <org-a-token>" \
  https://viperx.online/api/anaf/companies

# Response includes companies from ALL organizations
```

**Impact**:
- Cross-tenant information disclosure
- Exposure of CIF numbers (tax IDs)
- Potential regulatory violations (GDPR)
- Loss of multi-tenant isolation

**Remediation**:

**Option 1**: Add organizationId filters (if models have the field):
```javascript
router.get('/companies', authenticate, authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        organizationId: req.user.organizationId // ✅ Add this
      },
      include: { anafConfig: { select: { id: true, cif: true } } }
    });
    return ok(res, companies);
  })
);
```

**Option 2**: Use tenantPrisma (if Company is in TENANT_MODELS):
```javascript
// Add 'company' and 'anafConfig' to TENANT_MODELS in tenantPrisma.js
const TENANT_MODELS = [
  'user', 'client', 'vehicle', 'asset', 'resource',
  'appointment', 'serviceOrder', 'invoice', 'payment',
  'schedule', 'task', 'timeEntry', 'timeOffRequest',
  'notification', 'auditLog', 'registrationRequest',
  'company', 'anafConfig' // ✅ Add these
];

// Then use req.tenantPrisma in routes
router.get('/companies', authenticate, authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const companies = await req.tenantPrisma.company.findMany({
      where: { isActive: true }, // ✅ Automatic organizationId filter
      include: { anafConfig: { select: { id: true, cif: true } } }
    });
    return ok(res, companies);
  })
);
```

**Affected Files**:
- `/apps/backend/src/api/anaf.js` - Multiple endpoints
- Review all endpoints using global `prisma` instead of `req.tenantPrisma`

---

### 🟠 HIGH-002: JWT Payload Trusted Without Database Verification

**Location**: `/apps/backend/src/realtime/index.js:14-30`
**CVSS Score**: 7.3 (High)
**CWE**: CWE-287 (Improper Authentication)

**Description**:
Socket.IO authentication extracts user data directly from JWT payload without verifying the user still exists or is active in the database. This allows:
- Deactivated users to maintain WebSocket connections
- Users to access organization rooms after being removed
- Potential privilege escalation if roles change

**Evidence**:
```javascript
// realtime/index.js:14-30
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('AUTH_MISSING_TOKEN'));

  try {
    const payload = verifyAccessToken(token);
    socket.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles, // ❌ Trusted from JWT without DB check
      organizationId: payload.organizationId, // ❌ Could be stale
    };
    next();
  } catch (err) {
    next(new Error('AUTH_INVALID_TOKEN'));
  }
});
```

**Attack Scenario**:
1. Admin user gets compromised access token
2. Admin is deactivated by super admin
3. Deactivated admin can still connect via WebSocket
4. Deactivated admin receives real-time updates
5. Organization switches admin to different org
6. Admin still joins old organization's room

**Impact**:
- Unauthorized access to real-time data streams
- Potential data exfiltration
- Bypassing account deactivation
- Multi-tenant isolation bypass

**Remediation**:

```javascript
// realtime/index.js
const prisma = require('../../lib/prisma');

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('AUTH_MISSING_TOKEN'));

  try {
    const payload = verifyAccessToken(token);

    // ✅ CRITICAL: Verify user in database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    // ✅ Validate user exists and is active
    if (!user || !user.isActive) {
      return next(new Error('AUTH_USER_INACTIVE'));
    }

    // ✅ Validate organization is active
    if (!user.organization || user.organization.status === 'SUSPENDED') {
      return next(new Error('AUTH_ORG_SUSPENDED'));
    }

    // ✅ Use database values, not JWT payload
    socket.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId
    };

    next();
  } catch (err) {
    next(new Error('AUTH_INVALID_TOKEN'));
  }
});
```

**Additional Recommendations**:
- Implement periodic re-authentication for long-lived connections
- Add connection limits per user
- Log all WebSocket connections for audit

---

### 🟠 HIGH-003: SQL Injection Risk in Organization Slug Check

**Location**: `/apps/backend/src/api/organizations.js:172-186`
**CVSS Score**: 7.5 (High)
**CWE**: CWE-89 (SQL Injection)

**Description**:
The slug availability endpoint accepts user input without validation and uses it directly in a database query. While Prisma provides some protection, the lack of input validation could lead to injection or enumeration attacks.

**Evidence**:
```javascript
// organizations.js:172-186
router.get('/check-slug/:slug',
  asyncHandler(async (req, res) => {
    const prisma = require('../../lib/prisma');
    const { slug } = req.params; // ❌ No validation

    const existing = await prisma.organization.findUnique({
      where: { slug }, // ❌ Direct use of user input
    });

    return ok(res, {
      available: !existing,
      slug,
    });
  })
);
```

**Potential Attacks**:
1. **Enumeration**: Brute force to discover valid organization slugs
2. **Timing attacks**: Analyze response times to identify patterns
3. **Resource exhaustion**: Automated requests to slow down system

**Remediation**:

1. Add input validation:
```javascript
const { z } = require('zod');

const slugSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase alphanumeric with hyphens only"
    })
});
```

2. Add rate limiting:
```javascript
const rateLimit = require('express-rate-limit');

const slugCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/check-slug/:slug',
  slugCheckLimiter, // ✅ Add rate limiting
  asyncHandler(async (req, res) => {
    // ✅ Validate input
    const validation = slugSchema.safeParse({ slug: req.params.slug });

    if (!validation.success) {
      throw new AppError('Invalid slug format', 400);
    }

    const { slug } = validation.data;
    const prisma = require('../../lib/prisma');

    // Add small random delay to prevent timing attacks
    const delay = Math.floor(Math.random() * 50) + 50;
    await new Promise(resolve => setTimeout(resolve, delay));

    const existing = await prisma.organization.findUnique({
      where: { slug }
    });

    return ok(res, {
      available: !existing,
      slug,
    });
  })
);
```

---

### 🟠 HIGH-004: Missing Input Validation on Vehicle Endpoints

**Location**: `/apps/backend/src/api/clients.js:147-183`
**CVSS Score**: 6.5 (Medium-High)
**CWE**: CWE-20 (Improper Input Validation)

**Description**:
Vehicle creation and update endpoints lack Zod schema validation, directly accepting request body data. This could lead to type confusion, injection attacks, or database integrity issues.

**Evidence**:
```javascript
// clients.js:147-159
router.post('/:clientId/vehicles',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  // ❌ No validate() middleware
  asyncHandler(async (req, res) => {
    const vehicle = await req.tenantPrisma.vehicle.create({
      data: {
        clientId: req.params.clientId,
        make: req.body.make, // ❌ Unvalidated
        model: req.body.model, // ❌ Unvalidated
        year: req.body.year ? parseInt(req.body.year) : null, // ❌ Unsafe parsing
        vin: req.body.vin,
        plateNumber: req.body.plateNumber,
        color: req.body.color,
        odometerKm: req.body.odometerKm ? parseInt(req.body.odometerKm) : null,
        notes: req.body.notes,
      },
    });
```

**Potential Issues**:
1. Type confusion (passing objects instead of strings)
2. Integer overflow in year/odometer fields
3. Excessive string lengths
4. Special characters causing encoding issues

**Remediation**:

1. Create validation schema:
```javascript
// schemas/vehicleSchema.js
const { z } = require('zod');

const createVehicleSchema = z.object({
  make: z.string().min(1).max(100).trim(),
  model: z.string().min(1).max(100).trim(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  vin: z.string().max(17).trim().optional().nullable(),
  plateNumber: z.string().max(20).trim().optional().nullable(),
  color: z.string().max(50).trim().optional().nullable(),
  odometerKm: z.number().int().min(0).max(9999999).optional().nullable(),
  notes: z.string().max(1000).trim().optional().nullable(),
});

const updateVehicleSchema = createVehicleSchema.partial();

module.exports = { createVehicleSchema, updateVehicleSchema };
```

2. Apply to routes:
```javascript
const validate = require('../middleware/validate');
const { createVehicleSchema, updateVehicleSchema } = require('../schemas/vehicleSchema');

router.post('/:clientId/vehicles',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  validate(createVehicleSchema), // ✅ Add validation
  asyncHandler(async (req, res) => {
    // ... route logic
  })
);

router.put('/:clientId/vehicles/:vehicleId',
  authenticate,
  authorize({ roles: ['admin', 'manager', 'sales'] }),
  validate(updateVehicleSchema), // ✅ Add validation
  asyncHandler(async (req, res) => {
    // ... route logic
  })
);
```

---

### 🟠 HIGH-005: Vulnerable Dependencies with Known CVEs

**Location**: `/apps/backend/package.json`
**CVSS Score**: 7.5 (High)
**CWE**: CWE-1035 (Using Components with Known Vulnerabilities)

**Description**:
Multiple high-severity vulnerabilities detected in project dependencies.

**Identified Vulnerabilities**:

1. **glob** - Command Injection (GHSA-5j98-mcp5-4vw2)
   - CVSS: 7.5
   - Affected: Multiple packages via dependency chain
   - Impact: Arbitrary code execution via CLI arguments

2. **jws** - HMAC Signature Verification Bypass (GHSA-869p-cjfg-cm3x)
   - CVSS: 7.5
   - Affected: jsonwebtoken@9.0.2 dependency
   - Impact: JWT signature bypass, authentication bypass

3. **js-yaml** - Prototype Pollution (GHSA-mh29-5h37-fv8m)
   - CVSS: 5.3
   - Affected: Test dependencies
   - Impact: Prototype pollution, potential RCE

**Verification**:
```bash
npm audit
# Found 3 vulnerabilities (1 moderate, 2 high)
```

**Remediation**:

1. Update dependencies:
```bash
npm audit fix --force
npm update
```

2. Manual updates if auto-fix fails:
```bash
npm install jsonwebtoken@latest
npm install glob@latest
npm install js-yaml@latest
```

3. Add automated security scanning:
```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run test
```

4. Consider using Snyk or Dependabot:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/apps/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## MEDIUM Severity Findings

### 🟡 MEDIUM-001: Missing Rate Limiting on Organization Signup

**Location**: `/apps/backend/src/api/organizations.js:33-39`
**CVSS Score**: 5.3 (Medium)
**CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description**:
The public organization signup endpoint lacks rate limiting, enabling abuse.

**Evidence**:
```javascript
router.post('/signup',
  // ❌ No rate limiter
  asyncHandler(async (req, res) => {
    const result = await createOrganization(req.body);
    return created(res, result, 'Organization created successfully');
  })
);
```

**Remediation**:
```javascript
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 signups per IP per hour
  message: 'Too many signup attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

router.post('/signup',
  signupLimiter, // ✅ Add this
  asyncHandler(async (req, res) => {
    const result = await createOrganization(req.body);
    return created(res, result, 'Organization created successfully');
  })
);
```

---

### 🟡 MEDIUM-002: Information Disclosure in Error Messages

**Location**: `/apps/backend/src/middleware/errorHandler.js:15-16`
**CVSS Score**: 5.3 (Medium)
**CWE**: CWE-209 (Information Exposure Through Error Message)

**Description**:
Stack traces exposed in development mode. If NODE_ENV is misconfigured, this leaks internal details.

**Evidence**:
```javascript
...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
```

**Remediation**:
```javascript
const errorHandler = (err, req, res, next) => {
  const status = err instanceof AppError ? err.status : 500;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isInternalError = status >= 500;

  // Log server-side
  if (status >= 500) {
    console.error('[ERROR]', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      user: req.user?.id
    });
  }

  res.status(status).json({
    success: false,
    message: (isDevelopment || !isInternalError)
      ? err.message
      : 'Internal server error',
    ...(isDevelopment ? { stack: err.stack } : {}),
  });
};
```

---

### 🟡 MEDIUM-003: Insufficient Session Invalidation on Password Change

**Location**: `/apps/backend/src/services/userService.js:559-562`
**CVSS Score**: 6.5 (Medium)
**CWE**: CWE-613 (Insufficient Session Expiration)

**Description**:
Password changes don't invalidate existing refresh tokens.

**Remediation**:
```javascript
const changePassword = async (prisma, userId, { currentPassword, newPassword }) => {
  // ... verification code ...

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    }),
    // ✅ Revoke all refresh tokens
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  return {
    message: 'Password changed. Please log in again on all devices.',
    sessionsInvalidated: true
  };
};
```

---

### 🟡 MEDIUM-004: Weak CORS Configuration

**Location**: `/apps/backend/server.js:18-24`
**CVSS Score**: 5.3 (Medium)
**CWE**: CWE-942 (Overly Permissive Cross-domain Whitelist)

**Description**:
CORS origin is hardcoded without environment variable support.

**Remediation**:
```javascript
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400,
};
```

---

### 🟡 MEDIUM-005: Missing Audit Logging for Critical Operations

**Location**: Multiple service files
**CVSS Score**: 4.3 (Medium)
**CWE**: CWE-778 (Insufficient Logging)

**Description**:
Critical operations lack comprehensive audit logging.

**Remediation**:
Create audit logging utility:
```javascript
// utils/auditLog.js
async function createAuditLog({
  organizationId,
  userId,
  action,
  entityType,
  entityId,
  changes,
  ipAddress
}) {
  return await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action,
      entityType,
      entityId,
      changes: JSON.stringify(changes),
      ipAddress,
      timestamp: new Date()
    }
  });
}
```

---

## LOW Severity Findings

### 🟢 LOW-001: Missing Content-Type Validation on File Upload

**Location**: `/apps/backend/src/api/clients.js:26-35`
**CVSS Score**: 3.7 (Low)
**CWE**: CWE-434 (Unrestricted Upload of File with Dangerous Type)

**Description**:
CSV upload relies on MIME type which can be spoofed.

**Remediation**:
```javascript
// Validate actual content
const fileHeader = req.file.buffer.slice(0, 100).toString('utf-8');
if (!/^[^<>{}]*$/.test(fileHeader)) {
  throw new AppError('Invalid file format', 400);
}
```

---

### 🟢 LOW-002: Timing Attack in Slug Check

**Location**: `/apps/backend/src/api/organizations.js:172-186`
**CVSS Score**: 3.1 (Low)
**CWE**: CWE-208 (Observable Timing Discrepancy)

**Description**:
Response timing varies based on slug existence.

**Remediation**:
```javascript
// Add random delay
const delay = Math.floor(Math.random() * 50) + 50;
await new Promise(resolve => setTimeout(resolve, delay));
```

---

## INFORMATIONAL

### ℹ️ INFO-001: Missing Security Headers for Static Files

**Location**: `/apps/backend/server.js:28-36`

**Recommendation**:
```javascript
app.use('/files', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}, express.static(fileStorageRoot));
```

---

## Positive Security Findings

The following security controls are well-implemented:

✅ **Multi-Tenant Isolation**: Excellent Prisma extension implementation
✅ **Password Security**: Bcrypt with proper rounds, account lockout
✅ **JWT Implementation**: Proper token separation and TTLs
✅ **Rate Limiting**: Authentication endpoints well-protected
✅ **Input Validation**: Extensive Zod schema usage
✅ **SQL Injection Protection**: All queries through Prisma ORM

---

## Remediation Priority

### Immediate (24 hours)
1. ✅ Rotate all exposed secrets from `.env`
2. ✅ Implement CSRF protection
3. ✅ Fix ANAF encryption
4. ✅ Add organizationId filters to ANAF endpoints

### Short-term (1 week)
5. ✅ Update vulnerable dependencies
6. ✅ Add Socket.IO database verification
7. ✅ Implement audit logging
8. ✅ Add vehicle endpoint validation

### Medium-term (1 month)
9. ✅ Add comprehensive rate limiting
10. ✅ Enhance error handling
11. ✅ Implement security testing in CI/CD
12. ✅ Conduct penetration testing

---

## Compliance Considerations

**GDPR**:
- Audit logging insufficient for Article 30
- Data export functionality needed (Article 20)

**PCI DSS** (if applicable):
- CSRF protection required (6.5.9)
- Session management needs improvement (6.5.10)

**SOC 2**:
- Audit logging gaps affect CC6.1
- Missing automated vulnerability scanning (CC7.1)

---

## Testing Recommendations

1. **Security Testing**:
   - SAST: SonarQube, Semgrep
   - DAST: OWASP ZAP, Burp Suite
   - Dependency scanning: Snyk, npm audit

2. **Penetration Testing**:
   - Focus on multi-tenant isolation
   - ANAF integration security
   - Authentication/authorization bypasses

3. **Code Review**:
   - Manual review of all tenant scoping
   - Review all direct `prisma` usage
   - Verify all broadcast functions use organizationId

---

**Report End**
**Next Review**: Recommended in 90 days or after major changes
