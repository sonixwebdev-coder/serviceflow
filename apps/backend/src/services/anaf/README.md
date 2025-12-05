# ANAF E-Factura Integration

Complete integration with Romania's ANAF (National Agency for Fiscal Administration) E-Factura system for automatic invoice submission and management.

## Overview

This integration enables automatic submission of invoices to the ANAF E-Factura platform, complying with Romanian e-invoicing regulations. It includes:

- OAuth2 authentication with ANAF
- UBL 2.1 XML invoice generation
- Automatic invoice submission
- Status synchronization
- Message download from ANAF
- Token management and auto-refresh
- Background job processing

## Architecture

### Services

- **anafOAuthService.js** - OAuth2 authentication and token management
- **anafApiService.js** - REST API communication with ANAF
- **anafXmlBuilder.js** - UBL 2.1 XML generation and validation
- **anafInvoiceService.js** - Business logic orchestration
- **anafSyncJob.js** - Background job scheduler

### Database Models

- **Company** - Company information for invoices
- **AnafConfig** - OAuth2 configuration per company
- **AnafToken** - JWT access/refresh tokens
- **AnafInvoiceSync** - Invoice submission tracking
- **AnafMessage** - Messages received from ANAF

## Setup Instructions

### 1. Register Application with ANAF

1. Visit ANAF SPV Portal: https://www.anaf.ro/
2. Register your application to obtain:
   - `client_id`
   - `client_secret`
   - Register your `redirect_uri`

### 2. Configure Environment

Add to your `.env` file:

```bash
# ANAF OAuth2 endpoints
ANAF_AUTHORIZATION_URL=https://logincert.anaf.ro/anaf-oauth2/v1/authorize
ANAF_TOKEN_URL=https://logincert.anaf.ro/anaf-oauth2/v1/token
ANAF_API_BASE_URL=https://webserviceapl.anaf.ro/prod/FCTEL/rest

# Test environment (for development)
ANAF_TEST_API_BASE_URL=https://webserviceapl.anaf.ro/test/FCTEL/rest

# Your application's redirect URI
ANAF_REDIRECT_URI=https://your-domain.com/api/anaf/auth/callback

# Background jobs
ANAF_ENABLE_AUTO_SUBMIT=false
ANAF_ENABLE_STATUS_SYNC=true
ANAF_ENABLE_TOKEN_REFRESH=true
```

### 3. Run Database Migration

```bash
cd apps/backend
npx prisma migrate dev --schema ../../prisma/schema.prisma
npx prisma generate --schema ../../prisma/schema.prisma
```

### 4. Create Company and ANAF Configuration

#### Create Company

```bash
POST /api/anaf/companies
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Your Company SRL",
  "vatNumber": "RO12345678",
  "registrationNumber": "J40/1234/2023",
  "address": "Str. Example 123",
  "city": "Bucuresti",
  "county": "Bucuresti",
  "country": "RO",
  "phone": "+40123456789",
  "email": "contact@company.ro",
  "bankAccount": "RO49AAAA1B31007593840000",
  "bankName": "Banca Comerciala"
}
```

#### Create ANAF Configuration

```bash
POST /api/anaf/config
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "companyId": "{company_id_from_above}",
  "clientId": "your_anaf_client_id",
  "clientSecret": "your_anaf_client_secret",
  "redirectUri": "https://your-domain.com/api/anaf/auth/callback",
  "cif": "12345678"
}
```

### 5. Authenticate with ANAF

#### Get Authorization URL

```bash
GET /api/anaf/auth/url?configId={config_id}
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://logincert.anaf.ro/anaf-oauth2/v1/authorize?...",
    "state": "base64_encoded_state"
  }
}
```

#### Complete OAuth Flow

1. Open the `authorizationUrl` in browser
2. Log in with ANAF credentials
3. Authorize the application
4. You'll be redirected to your `redirect_uri` with a `code` parameter

#### Exchange Code for Token

```bash
POST /api/anaf/auth/callback
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "code": "authorization_code_from_redirect",
  "configId": "{config_id}"
}
```

## API Endpoints

### Company Management

- `POST /api/anaf/companies` - Create company
- `GET /api/anaf/companies` - List companies
- `GET /api/anaf/companies/:id` - Get company
- `PUT /api/anaf/companies/:id` - Update company

### Configuration

- `POST /api/anaf/config` - Create ANAF config
- `GET /api/anaf/config` - List configurations
- `GET /api/anaf/config/:id` - Get configuration
- `PUT /api/anaf/config/:id` - Update configuration
- `DELETE /api/anaf/config/:id` - Delete configuration

### Authentication

- `GET /api/anaf/auth/url` - Get OAuth authorization URL
- `POST /api/anaf/auth/callback` - Handle OAuth callback
- `POST /api/anaf/auth/refresh` - Manually refresh token
- `GET /api/anaf/auth/health` - Check ANAF API connectivity

### Invoice Operations

- `POST /api/anaf/invoices/:id/submit` - Submit invoice to ANAF
- `GET /api/anaf/invoices/:id/status` - Get sync status
- `POST /api/anaf/invoices/:id/sync` - Sync status with ANAF
- `POST /api/anaf/invoices/:id/retry` - Retry failed submission
- `GET /api/anaf/invoices/:id/validate-xml` - Validate XML
- `GET /api/anaf/invoices/:id/xml` - Download UBL XML

### Messages

- `GET /api/anaf/messages` - List ANAF messages
- `GET /api/anaf/messages/:id` - Get message details
- `GET /api/anaf/messages/:id/download` - Download message ZIP

### Synchronization

- `POST /api/anaf/sync/batch` - Batch sync pending invoices
- `GET /api/anaf/sync/stats` - Get sync statistics
- `GET /api/anaf/sync` - List sync records with filters

## Usage Examples

### Submit Invoice to ANAF

```javascript
// Submit invoice
const response = await fetch('/api/anaf/invoices/clxxx123/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer {token}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    forceResubmit: false
  })
});

const result = await response.json();
// {
//   "success": true,
//   "data": {
//     "invoiceId": "clxxx123",
//     "uploadIndex": "5006096656",
//     "status": "UPLOADED",
//     "message": "Invoice successfully uploaded to ANAF"
//   }
// }
```

### Check Invoice Status

```javascript
const response = await fetch('/api/anaf/invoices/clxxx123/status', {
  headers: {
    'Authorization': 'Bearer {token}'
  }
});

const status = await response.json();
// {
//   "success": true,
//   "data": {
//     "synced": true,
//     "status": "OK",
//     "uploadIndex": "5006096656",
//     "downloadId": "3008662942",
//     "anafStatus": "ok",
//     "uploadedAt": "2024-01-13T20:08:00Z",
//     "processedAt": "2024-01-13T20:10:00Z"
//   }
// }
```

## Background Jobs

The system includes automated background jobs:

### Status Sync (Every 5 minutes)
- Checks pending invoice uploads
- Updates status from ANAF
- Automatically runs for invoices in UPLOADED/PROCESSING state

### Token Refresh (Daily at 2 AM)
- Checks token expiry dates
- Automatically refreshes tokens 5 days before expiry
- Prevents authentication interruptions

### Message Download (Daily at 3 AM)
- Downloads new messages from ANAF
- Stores messages in database
- Tracks downloaded/undownloaded messages

### Retry Failed (Daily at 4 AM)
- Retries failed invoice submissions
- Respects max retry limits
- Exponential backoff for errors

### Auto-Submit (Every 15 minutes, optional)
- Automatically submits new SENT invoices
- Disabled by default (enable with `ANAF_ENABLE_AUTO_SUBMIT=true`)

## Invoice Submission Workflow

1. **Invoice Creation** - Create invoice in CRM
2. **Invoice Finalization** - Mark invoice as SENT
3. **XML Generation** - System generates UBL 2.1 XML
4. **Validation** - XML is validated against schema
5. **Upload** - XML uploaded to ANAF with CIF
6. **Status Tracking** - System tracks upload index
7. **Status Check** - Periodic checks for processing status
8. **Download ID** - ANAF provides download ID when processed
9. **Confirmation** - Invoice marked as OK in ANAF

## UBL XML Format

The system generates UBL 2.1 compliant XML following ANAF specifications:

- **Standard**: UBL 2.1
- **Customization**: CIUS-RO 1.0.1
- **Currency**: RON (Romanian Lei)
- **Invoice Type**: 380 (Commercial Invoice)
- **Tax Scheme**: VAT

## Error Handling

### Common Errors

**Token Expired**
```json
{
  "error": "ANAF tokens expired. Please re-authenticate."
}
```
Solution: Re-run OAuth flow to get new tokens

**Invalid XML**
```json
{
  "error": "Invalid XML structure: Missing invoice ID"
}
```
Solution: Check invoice data completeness

**Upload Failed**
```json
{
  "error": "ANAF upload failed with status 1: Invalid CIF"
}
```
Solution: Verify CIF in ANAF configuration

**Max Retries Exceeded**
```json
{
  "error": "Maximum retry attempts reached. Please check errors and resubmit."
}
```
Solution: Review error logs, fix issues, manually resubmit

## Security Considerations

- **Client Secret Encryption** - Stored encrypted in database using AES-256-CBC
- **Token Storage** - JWT tokens stored securely with expiry tracking
- **Rate Limiting** - Respects ANAF API rate limits
- **Audit Logging** - All ANAF operations are logged
- **Role-Based Access** - Admin/Manager roles required for operations

## Monitoring

### Check Configuration Status

```bash
GET /api/anaf/config
```

Returns token expiry status and configuration health.

### Check Sync Statistics

```bash
GET /api/anaf/sync/stats
```

Returns counts by status (PENDING, OK, ERROR, etc.)

### List Recent Sync Records

```bash
GET /api/anaf/sync?status=ERROR&page=1&limit=20
```

Filter and paginate sync records.

## Troubleshooting

### Issue: OAuth redirect not working

**Check:**
1. `ANAF_REDIRECT_URI` matches ANAF portal registration
2. SSL certificate is valid (ANAF requires HTTPS)
3. Firewall allows outbound connections to ANAF

### Issue: Token refresh fails

**Check:**
1. Refresh token hasn't expired (365 days)
2. ANAF token endpoint is accessible
3. Client credentials are correct

### Issue: Invoice upload fails

**Check:**
1. Invoice has all required fields (client, line items, totals)
2. Company information is complete
3. CIF is valid and matches ANAF registration
4. Token is valid and not expired

### Issue: Background jobs not running

**Check:**
1. Jobs are enabled in `.env`
2. Server has been restarted after configuration changes
3. Check server logs for job execution

## Testing

### Test Environment

For testing, the system automatically uses ANAF test endpoints when `NODE_ENV=development`.

Test endpoints:
- API: `https://webserviceapl.anaf.ro/test/FCTEL/rest`
- OAuth: Same as production

### Manual Testing

```bash
# Test OAuth flow
curl -X GET "http://localhost:5000/api/anaf/auth/url?configId=xxx" \
  -H "Authorization: Bearer {token}"

# Test invoice submission
curl -X POST "http://localhost:5000/api/anaf/invoices/{id}/submit" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"forceResubmit": false}'

# Test health check
curl -X GET "http://localhost:5000/api/anaf/auth/health" \
  -H "Authorization: Bearer {token}"
```

## References

- [ANAF OAuth2 Documentation](https://static.anaf.ro/static/10/Anaf/Informatii_R/API/Oauth_procedura_inregistrare_aplicatii_portal_ANAF.pdf)
- [UBL 2.1 Specification](http://docs.oasis-open.org/ubl/UBL-2.1.html)
- [CIUS-RO Specification](https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/strategii_anaf/proiecte_digitalizare/e_factura/)

## Support

For issues or questions:
1. Check this documentation
2. Review server logs in `/apps/backend/logs`
3. Check ANAF portal status
4. Contact ANAF support for API issues
