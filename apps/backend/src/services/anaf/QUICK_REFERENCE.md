# ANAF E-Factura - Quick Reference

## Common API Endpoints

### Authentication
```bash
# Get OAuth URL
GET /api/anaf/auth/url?configId={id}

# Handle callback
POST /api/anaf/auth/callback
Body: { "code": "...", "configId": "..." }

# Refresh token
POST /api/anaf/auth/refresh
Body: { "configId": "..." }

# Health check
GET /api/anaf/auth/health
```

### Invoice Operations
```bash
# Submit invoice
POST /api/anaf/invoices/{id}/submit
Body: { "forceResubmit": false }

# Get status
GET /api/anaf/invoices/{id}/status

# Sync status
POST /api/anaf/invoices/{id}/sync

# Retry failed
POST /api/anaf/invoices/{id}/retry

# Validate XML
GET /api/anaf/invoices/{id}/validate-xml

# Download XML
GET /api/anaf/invoices/{id}/xml
```

### Configuration
```bash
# List configs
GET /api/anaf/config

# Create config
POST /api/anaf/config
Body: {
  "companyId": "...",
  "clientId": "...",
  "clientSecret": "...",
  "redirectUri": "...",
  "cif": "12345678"
}

# Update config
PUT /api/anaf/config/{id}

# Delete config
DELETE /api/anaf/config/{id}
```

### Messages
```bash
# List messages
GET /api/anaf/messages?days=7&filter=T

# Get message
GET /api/anaf/messages/{id}

# Download message
GET /api/anaf/messages/{id}/download
```

### Synchronization
```bash
# Batch sync
POST /api/anaf/sync/batch
Body: { "limit": 10 }

# Get stats
GET /api/anaf/sync/stats

# List sync records
GET /api/anaf/sync?status=ERROR&page=1&limit=20
```

## Status Values

### AnafInvoiceStatus Enum
- `PENDING` - Not yet submitted
- `UPLOADING` - Currently uploading
- `UPLOADED` - Uploaded to ANAF
- `PROCESSING` - ANAF processing
- `OK` - Successfully processed
- `ERROR` - Submission failed
- `REJECTED` - Rejected by ANAF

### ANAF Message Filters
- `T` - Toate (All)
- `P` - Primite (Received)
- `E` - Emise (Sent)
- `R` - Erori (Errors)

## Common Code Patterns

### Submit Invoice from Service
```javascript
const { submitInvoiceToAnaf } = require('./services/anaf/anafInvoiceService');

try {
  const result = await submitInvoiceToAnaf(invoiceId, {
    forceResubmit: false
  });
  console.log('Submitted:', result.uploadIndex);
} catch (error) {
  console.error('Submission failed:', error.message);
}
```

### Check Invoice Status
```javascript
const { getInvoiceSyncStatus } = require('./services/anaf/anafInvoiceService');

const status = await getInvoiceSyncStatus(invoiceId);
console.log('Status:', status.status);
console.log('ANAF Status:', status.anafStatus);
console.log('Upload Index:', status.uploadIndex);
```

### Generate XML Only
```javascript
const { generateInvoiceXml } = require('./services/anaf/anafInvoiceService');

const { xmlContent, validation } = await generateInvoiceXml(invoiceId);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
} else {
  console.log('XML valid, length:', xmlContent.length);
}
```

### Get Valid Token (Auto-Refresh)
```javascript
const { getValidToken } = require('./services/anaf/anafOAuthService');

const token = await getValidToken(configId);
console.log('Expires at:', token.expiresAt);
console.log('Days until expiry:', Math.floor(
  (new Date(token.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
));
```

### Manual Token Refresh
```javascript
const { refreshAccessToken } = require('./services/anaf/anafOAuthService');

const config = await prisma.anafConfig.findUnique({
  where: { id: configId },
  include: { tokens: { take: 1, orderBy: { createdAt: 'desc' } } }
});

const newToken = await refreshAccessToken(
  config.tokens[0].refreshToken,
  config
);
console.log('Token refreshed:', newToken.expiresAt);
```

### Batch Sync Pending Invoices
```javascript
const { syncPendingInvoices } = require('./services/anaf/anafInvoiceService');

const result = await syncPendingInvoices({ limit: 20 });
console.log('Checked:', result.checked);
console.log('Completed:', result.completed);
console.log('Errors:', result.errors);
```

### Download ANAF Messages
```javascript
const { downloadAnafMessages } = require('./services/anaf/anafInvoiceService');

const result = await downloadAnafMessages({
  days: 7,
  filter: 'T'
});
console.log('Total messages:', result.totalMessages);
console.log('New messages:', result.newMessages);
```

## Database Queries

### Find Pending Submissions
```javascript
const pending = await prisma.anafInvoiceSync.findMany({
  where: {
    status: { in: ['UPLOADED', 'PROCESSING'] }
  },
  include: {
    invoice: {
      select: { invoiceNumber: true }
    }
  }
});
```

### Find Failed Invoices
```javascript
const failed = await prisma.anafInvoiceSync.findMany({
  where: {
    status: 'ERROR',
    retryCount: { lt: prisma.raw('max_retries') }
  },
  orderBy: { updatedAt: 'asc' }
});
```

### Get Active Configuration
```javascript
const config = await prisma.anafConfig.findFirst({
  where: { isActive: true },
  include: {
    company: true,
    tokens: {
      orderBy: { createdAt: 'desc' },
      take: 1
    }
  }
});
```

### Check Token Expiry
```javascript
const expiringSoon = await prisma.anafToken.findMany({
  where: {
    expiresAt: {
      lte: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    }
  },
  include: {
    config: {
      include: { company: true }
    }
  }
});
```

## Environment Variables

```bash
# OAuth2 Endpoints
ANAF_AUTHORIZATION_URL=https://logincert.anaf.ro/anaf-oauth2/v1/authorize
ANAF_TOKEN_URL=https://logincert.anaf.ro/anaf-oauth2/v1/token

# API Endpoints
ANAF_API_BASE_URL=https://webserviceapl.anaf.ro/prod/FCTEL/rest
ANAF_TEST_API_BASE_URL=https://webserviceapl.anaf.ro/test/FCTEL/rest

# Application Config
ANAF_REDIRECT_URI=https://your-domain.com/api/anaf/auth/callback

# Background Jobs
ANAF_ENABLE_AUTO_SUBMIT=false
ANAF_ENABLE_STATUS_SYNC=true
ANAF_ENABLE_TOKEN_REFRESH=true
ANAF_ENABLE_MESSAGE_DOWNLOAD=true
ANAF_ENABLE_RETRY_FAILED=true
```

## Background Jobs Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Status Sync | Every 5 minutes | Check pending uploads |
| Token Refresh | Daily at 2 AM | Refresh expiring tokens |
| Message Download | Daily at 3 AM | Download new messages |
| Retry Failed | Daily at 4 AM | Retry failed invoices |
| Auto-Submit | Every 15 minutes | Auto-submit SENT invoices (optional) |

## Error Messages & Solutions

### "ANAF tokens expired. Please re-authenticate."
**Solution**: Complete OAuth flow again to get new tokens
```bash
GET /api/anaf/auth/url?configId={id}
# Follow OAuth flow
POST /api/anaf/auth/callback
```

### "Invalid XML structure: Missing invoice ID"
**Solution**: Ensure invoice has all required fields
```javascript
// Check invoice data completeness
const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: {
    client: true,
    lineItems: true
  }
});

// Verify: invoiceNumber, issueDate, dueDate, client, lineItems exist
```

### "Maximum retry attempts reached"
**Solution**: Review errors and manually resubmit
```bash
# Check error details
GET /api/anaf/invoices/{id}/status

# Fix issues, then retry
POST /api/anaf/invoices/{id}/retry
```

### "No token found. Please authenticate first."
**Solution**: Configuration exists but not authenticated
```bash
POST /api/anaf/auth/callback
Body: { "code": "...", "configId": "..." }
```

## Validation Rules

### CIF Format
- Numeric only (no RO prefix)
- Example: `12345678` ✓
- Example: `RO12345678` ✗

### VAT Number Format
- Must include RO prefix
- Example: `RO12345678` ✓
- Example: `12345678` ✗

### Invoice Requirements
- Invoice number (unique)
- Issue date
- Due date
- Client information
- At least one line item
- Subtotal, tax, total

### Company Requirements
- Company name
- VAT number (with RO)
- Address, city, county
- Bank account (IBAN format)
- Bank name
- Phone, email

## Testing Checklist

### Quick Test
```bash
# 1. Check health
GET /api/anaf/auth/health

# 2. Check config
GET /api/anaf/config

# 3. Submit test invoice
POST /api/anaf/invoices/{id}/submit

# 4. Check status
GET /api/anaf/invoices/{id}/status

# 5. Check sync stats
GET /api/anaf/sync/stats
```

## Useful SQL Queries

```sql
-- Check sync status distribution
SELECT status, COUNT(*) as count
FROM "AnafInvoiceSync"
GROUP BY status;

-- Find oldest pending sync
SELECT *
FROM "AnafInvoiceSync"
WHERE status IN ('UPLOADED', 'PROCESSING')
ORDER BY "uploadedAt" ASC
LIMIT 1;

-- Check token expiry
SELECT c.cif, t."expiresAt",
       EXTRACT(DAY FROM (t."expiresAt" - NOW())) as days_until_expiry
FROM "AnafToken" t
JOIN "AnafConfig" c ON t."configId" = c.id
WHERE c."isActive" = true;

-- Failed invoices with error messages
SELECT i."invoiceNumber", s.status, s."errorMessage", s."retryCount"
FROM "AnafInvoiceSync" s
JOIN "Invoice" i ON s."invoiceId" = i.id
WHERE s.status = 'ERROR'
ORDER BY s."updatedAt" DESC;
```

## Monitoring Metrics

### Key Performance Indicators
- **Submission Success Rate**: > 95%
- **Average Processing Time**: < 5 minutes
- **Token Refresh Success**: 100%
- **Background Job Success**: > 99%

### Critical Alerts
- Token expires in < 5 days
- Invoice submission failure rate > 5%
- Background job failure
- ANAF API unreachable

## Common Workflows

### New Invoice Workflow
1. Create invoice in CRM
2. Mark as SENT
3. Auto-submit runs (if enabled) OR manual submit
4. Background job checks status every 5 minutes
5. Status updates to OK when processed
6. Download ID stored for message retrieval

### Token Refresh Workflow
1. Daily job checks all tokens at 2 AM
2. If token expires in < 5 days, refresh
3. New token stored in database
4. Old token replaced

### Error Recovery Workflow
1. Submission fails, status = ERROR
2. Error message stored
3. Retry job runs daily at 4 AM
4. Retries up to max_retries (default: 3)
5. If still fails, manual intervention needed

## Quick Troubleshooting

| Issue | Check | Fix |
|-------|-------|-----|
| Can't authenticate | ANAF credentials | Verify clientId, clientSecret |
| Upload fails | Invoice data | Check all required fields |
| Status stuck | Background jobs | Check job logs |
| Token expired | Token expiry date | Re-run OAuth flow |
| XML invalid | Invoice completeness | Verify client, items exist |

## Support Resources

- **Full Documentation**: `/apps/backend/src/services/anaf/README.md`
- **Architecture**: `/apps/backend/src/services/anaf/ARCHITECTURE.md`
- **Deployment Checklist**: `/apps/backend/ANAF_DEPLOYMENT_CHECKLIST.md`
- **ANAF Documentation**: https://static.anaf.ro/static/10/Anaf/Informatii_R/API/

---

**Quick Reference Version**: 1.0
**Last Updated**: November 6, 2025
