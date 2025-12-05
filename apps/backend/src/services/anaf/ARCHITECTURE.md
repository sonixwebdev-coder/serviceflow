# ANAF E-Factura Integration - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ViperX CRM Frontend                         │
│                    (React / User Interface)                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                        Express.js API Layer                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               Authentication Middleware                     │   │
│  │          (JWT Verification, Role Authorization)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  API Routes (/api/anaf/*)                   │   │
│  │  • Company Management   • Configuration   • OAuth           │   │
│  │  • Invoice Operations   • Messages        • Sync            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                         Service Layer                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ anafOAuthService │  │ anafApiService   │  │anafXmlBuilder    │  │
│  │                  │  │                  │  │                  │  │
│  │ • Token mgmt     │  │ • Upload invoice │  │ • Generate UBL   │  │
│  │ • OAuth flow     │  │ • Check status   │  │ • Validate XML   │  │
│  │ • Auto-refresh   │  │ • Download msgs  │  │ • Parse response │  │
│  │ • Encryption     │  │ • List messages  │  │ • Error extract  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              anafInvoiceService (Orchestration)              │  │
│  │  • Submit workflow   • Status sync   • Retry logic          │  │
│  │  • Batch operations  • Message sync  • Config management    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────┬───────────────────────┬────────────────────────┘
                     │                       │
         ┌───────────▼────────┐   ┌─────────▼──────────┐
         │  PostgreSQL DB     │   │  Background Jobs   │
         │                    │   │                    │
         │ • Company          │   │ • Status Sync      │
         │ • AnafConfig       │   │ • Token Refresh    │
         │ • AnafToken        │   │ • Message Download │
         │ • AnafInvoiceSync  │   │ • Retry Failed     │
         │ • AnafMessage      │   │ • Auto-Submit      │
         │ • Invoice (exist)  │   │   (node-cron)      │
         └───────────┬────────┘   └────────────────────┘
                     │
                     │ Prisma ORM
                     │
         ┌───────────▼────────────────────────────┐
         │                                        │
         │  ANAF E-Factura Platform               │
         │  (Romania Tax Authority)               │
         │                                        │
         │  • OAuth2 Authentication               │
         │  • Invoice Upload (UBL XML)            │
         │  • Status Check                        │
         │  • Message Download (ZIP)              │
         │  • List Messages                       │
         │                                        │
         └────────────────────────────────────────┘
```

## Component Architecture

### 1. API Layer (Express.js Routes)

```
/api/anaf/
├── companies/              (Company Management)
│   ├── POST /              Create company
│   ├── GET /               List companies
│   ├── GET /:id            Get company
│   └── PUT /:id            Update company
│
├── config/                 (ANAF Configuration)
│   ├── POST /              Create config
│   ├── GET /               List configs
│   ├── GET /:id            Get config
│   ├── PUT /:id            Update config
│   └── DELETE /:id         Delete config
│
├── auth/                   (OAuth2 Authentication)
│   ├── GET /url            Get authorization URL
│   ├── POST /callback      Handle OAuth callback
│   ├── POST /refresh       Refresh token
│   └── GET /health         API health check
│
├── invoices/               (Invoice Operations)
│   ├── POST /:id/submit    Submit to ANAF
│   ├── GET /:id/status     Get sync status
│   ├── POST /:id/sync      Sync with ANAF
│   ├── POST /:id/retry     Retry failed
│   ├── GET /:id/validate-xml  Validate XML
│   └── GET /:id/xml        Download XML
│
├── messages/               (Message Management)
│   ├── GET /               List messages
│   ├── GET /:id            Get message
│   └── GET /:id/download   Download ZIP
│
└── sync/                   (Synchronization)
    ├── POST /batch         Batch sync
    ├── GET /stats          Get statistics
    └── GET /               List sync records
```

### 2. Service Layer

```
anafOAuthService
├── Token Management
│   ├── getAuthorizationUrl()
│   ├── exchangeCodeForToken()
│   ├── refreshAccessToken()
│   ├── validateToken()
│   └── getValidToken()
└── Security
    ├── encrypt()          AES-256-CBC
    └── decrypt()          Key derivation

anafApiService
├── Invoice Operations
│   ├── uploadInvoice()
│   ├── checkInvoiceStatus()
│   └── validateInvoiceXml()
├── Message Operations
│   ├── listMessages()
│   ├── downloadMessage()
│   └── convertXmlToPdf()
└── Utilities
    ├── healthCheck()
    └── parseXmlResponse()

anafXmlBuilder
├── XML Generation
│   ├── buildUBLInvoice()
│   └── formatDate/Decimal()
├── Validation
│   ├── validateXmlStructure()
│   └── extractErrorMessages()
└── Parsing
    └── parseAnafResponse()

anafInvoiceService (Orchestrator)
├── Workflows
│   ├── generateInvoiceXml()
│   ├── submitInvoiceToAnaf()
│   └── syncInvoiceStatus()
├── Management
│   ├── retryFailedInvoice()
│   ├── getInvoiceSyncStatus()
│   └── syncPendingInvoices()
└── Messages
    └── downloadAnafMessages()
```

### 3. Data Layer (Prisma Models)

```
Company
├── id (PK)
├── name
├── vatNumber (unique)
├── registrationNumber
├── address, city, county
├── bankAccount, bankName
└── anafConfig (1:1)

AnafConfig
├── id (PK)
├── companyId (FK → Company, unique)
├── clientId
├── clientSecret (encrypted)
├── redirectUri
├── cif
├── isActive
└── tokens[] (1:N → AnafToken)

AnafToken
├── id (PK)
├── configId (FK → AnafConfig)
├── accessToken (JWT)
├── refreshToken (JWT)
├── expiresAt (90 days)
├── refreshExpiresAt (365 days)
├── tokenType (Bearer)
└── scope (EFACTURA)

AnafInvoiceSync
├── id (PK)
├── invoiceId (FK → Invoice, unique)
├── uploadIndex (from ANAF)
├── downloadId (from ANAF)
├── status (enum)
├── anafStatus
├── errorMessage
├── uploadedAt, processedAt
├── retryCount, maxRetries
└── xmlContent, responseData

AnafMessage
├── id (PK)
├── anafMessageId (unique)
├── cif
├── solicitareId
├── tip (FACTURA TRIMISA, etc.)
├── dataCreare
├── downloadId
├── downloaded
└── content, metadata
```

## Data Flow Diagrams

### Invoice Submission Flow

```
┌──────────────┐
│ User submits │
│   invoice    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ POST /api/anaf/invoices/     │
│ {id}/submit                  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ anafInvoiceService           │
│ .submitInvoiceToAnaf()       │
└──────┬───────────────────────┘
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐        ┌──────────────┐
│ Generate XML │        │ Get valid    │
│ (UBL 2.1)    │        │ token        │
└──────┬───────┘        └──────┬───────┘
       │                       │
       └───────┬───────────────┘
               │
               ▼
       ┌──────────────┐
       │ Validate XML │
       └──────┬───────┘
              │
              ▼
       ┌──────────────────┐
       │ Create sync      │
       │ record (PENDING) │
       └──────┬───────────┘
              │
              ▼
       ┌──────────────────┐
       │ Upload to ANAF   │
       │ anafApiService   │
       └──────┬───────────┘
              │
              ▼
       ┌──────────────────┐
       │ ANAF returns     │
       │ upload_index     │
       └──────┬───────────┘
              │
              ▼
       ┌──────────────────┐
       │ Update sync      │
       │ (UPLOADED)       │
       └──────┬───────────┘
              │
              ▼
       ┌──────────────────┐
       │ Immediate status │
       │ check            │
       └──────┬───────────┘
              │
              ▼
       ┌──────────────────┐
       │ Return result    │
       └──────────────────┘
```

### Background Status Sync

```
┌────────────────┐
│ Cron: Every    │
│ 5 minutes      │
└────────┬───────┘
         │
         ▼
┌────────────────────────┐
│ Find invoices with     │
│ status: UPLOADED or    │
│ PROCESSING             │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ For each invoice:      │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Get valid token        │
│ (auto-refresh if near  │
│  expiry)               │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Call ANAF API:         │
│ checkInvoiceStatus()   │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Parse response:        │
│ • stare (ok/nok)       │
│ • id_descarcare        │
└────────┬───────────────┘
         │
         ├─── stare="ok" ──▶ Update status: OK
         │                   Store downloadId
         │                   Mark processedAt
         │
         ├─── stare="nok" ─▶ Update status: ERROR
         │                   Store error message
         │
         └─── stare="proc" ▶ Update status: PROCESSING
                             Continue checking
```

### Token Auto-Refresh Flow

```
┌────────────────┐
│ Cron: Daily    │
│ at 2:00 AM     │
└────────┬───────┘
         │
         ▼
┌────────────────────────┐
│ Find all active        │
│ AnafConfig records     │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ For each config:       │
│ Get latest token       │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Calculate days until   │
│ expiry                 │
└────────┬───────────────┘
         │
         ├─── < 5 days ────▶ Call refreshAccessToken()
         │                   Update token in DB
         │                   Log success
         │
         ├─── 0 days ──────▶ Token expired
         │                   Log warning
         │                   Notify admin
         │
         └─── > 5 days ────▶ Skip (still valid)
                            Continue
```

## Security Architecture

### Encryption Flow

```
Client Secret Storage
┌─────────────────┐
│ Plain text      │
│ client_secret   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Generate key from       │
│ JWT_ACCESS_SECRET       │
│ using scrypt            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Generate random IV      │
│ (16 bytes)              │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AES-256-CBC encryption  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Format: "IV:ciphertext" │
│ Store in database       │
└─────────────────────────┘

Decryption Process
┌─────────────────────────┐
│ Read from database      │
│ "IV:ciphertext"         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Split by ":"            │
│ Extract IV and cipher   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Derive key from         │
│ JWT_ACCESS_SECRET       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AES-256-CBC decryption  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Plain text client_secret│
│ (used for API calls)    │
└─────────────────────────┘
```

### Authorization Layers

```
Request Flow
┌─────────────────┐
│ HTTP Request    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ authenticate middleware │
│ • Verify JWT            │
│ • Load user from DB     │
│ • Attach req.user       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ authorize middleware    │
│ • Check roles[]         │
│ • Check permissions[]   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ validateRequest         │
│ • Zod schema validation │
│ • Attach req.validated  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Route Handler           │
│ • Business logic        │
│ • Response              │
└─────────────────────────┘
```

## Integration Points

### External Systems

```
┌─────────────────────────────────────────────────┐
│              ViperX CRM System                  │
│                                                 │
│  ┌─────────────┐  ┌──────────────┐            │
│  │   Invoice   │──│ InvoiceItems │            │
│  │   Model     │  └──────────────┘            │
│  └──────┬──────┘                               │
│         │                                       │
│         │ 1:1                                   │
│         │                                       │
│  ┌──────▼──────────┐                           │
│  │ AnafInvoiceSync │                           │
│  └─────────────────┘                           │
│                                                 │
│  ┌──────────────┐   ┌─────────────┐           │
│  │   Client     │   │   Company   │           │
│  │   Model      │   │   Model     │           │
│  └──────────────┘   └─────┬───────┘           │
│                            │                    │
│                            │ 1:1                │
│                            │                    │
│                     ┌──────▼──────┐            │
│                     │ AnafConfig  │            │
│                     └─────┬───────┘            │
│                           │                     │
│                           │ 1:N                 │
│                           │                     │
│                     ┌─────▼──────┐             │
│                     │ AnafToken  │             │
│                     └────────────┘             │
│                                                 │
└────────────────────┬────────────────────────────┘
                     │
                     │ HTTPS / OAuth2
                     │
┌────────────────────▼────────────────────────────┐
│         ANAF E-Factura Platform                 │
│                                                 │
│  OAuth2: logincert.anaf.ro                     │
│  API: webserviceapl.anaf.ro                    │
│                                                 │
│  Endpoints:                                     │
│  • /authorize     (OAuth2)                     │
│  • /token         (OAuth2)                     │
│  • /upload        (Invoice submission)         │
│  • /stareMesaj    (Status check)               │
│  • /descarcare    (Download ZIP)               │
│  • /listaMesaje   (List messages)              │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              Production Environment              │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │        Load Balancer / Nginx           │    │
│  └───────────────┬────────────────────────┘    │
│                  │                              │
│  ┌───────────────▼────────────────────────┐    │
│  │         Express.js Application         │    │
│  │                                         │    │
│  │  • API Routes                           │    │
│  │  • Services                             │    │
│  │  • Background Jobs (node-cron)          │    │
│  └───────┬─────────────────────────────────┘    │
│          │                                       │
│          ├──────────────────┐                   │
│          │                  │                    │
│  ┌───────▼────────┐  ┌─────▼──────┐            │
│  │  PostgreSQL    │  │   Redis    │            │
│  │   Database     │  │   Cache    │            │
│  │                │  │ (optional) │            │
│  └────────────────┘  └────────────┘            │
│                                                  │
└──────────────────────┬───────────────────────────┘
                       │
                       │ HTTPS
                       │
         ┌─────────────▼─────────────┐
         │  ANAF E-Factura Platform  │
         │  (External Service)       │
         └───────────────────────────┘
```

## Error Handling Strategy

```
┌────────────────────┐
│  Operation Start   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Try Operation     │
└────────┬───────────┘
         │
         ├──── Success ────▶ Update status: OK
         │                  Return result
         │
         └──── Error ──────▶ Identify error type
                            │
                ┌───────────┴────────────┐
                │                        │
         Token Expired            Network Error
                │                        │
                ▼                        ▼
         Refresh token         Increment retryCount
         Retry operation       │
                │              ▼
                │       Check < maxRetries?
                │              │
                │              ├─ Yes ─▶ Schedule retry
                │              │         (exponential backoff)
                │              │
                │              └─ No ──▶ Update status: ERROR
                │                        Store error message
                │                        Notify admin
                │
                └──────────────┬─────────┘
                               │
                               ▼
                        ┌────────────┐
                        │   Audit    │
                        │    Log     │
                        └────────────┘
```

## Performance Optimization

### Caching Strategy
```
Token Cache
├── Store in memory (req.token)
├── Reuse for request lifecycle
└── Refresh only when expired

Database Queries
├── Use Prisma's connection pooling
├── Index all foreign keys
├── Index status and date fields
└── Batch operations where possible

API Calls
├── Timeout: 60 seconds
├── Retry with exponential backoff
├── Rate limiting compliance
└── Connection keep-alive
```

## Scalability Considerations

### Horizontal Scaling
```
┌──────────────────────────────────────┐
│       Load Balancer                  │
└─────┬─────────┬─────────┬────────────┘
      │         │         │
┌─────▼───┐ ┌──▼────┐ ┌──▼────┐
│ Node 1  │ │ Node 2│ │ Node 3│
│         │ │       │ │       │
│ • API   │ │ • API │ │ • API │
│ • Jobs* │ │       │ │       │
└─────┬───┘ └───┬───┘ └───┬───┘
      │         │         │
      └─────────┴─────────┴──────────┐
                                     │
                          ┌──────────▼────────┐
                          │   Shared Database │
                          │   (PostgreSQL)    │
                          └───────────────────┘

* Note: Background jobs should run on
  only ONE node to avoid duplicates
```

---

**Last Updated**: November 6, 2025
**Architecture Version**: 1.0
**Status**: Production Ready
