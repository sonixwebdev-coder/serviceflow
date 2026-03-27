-- Migration: Replace CompanySetting (EAV) with OrganizationProfile (typed columns)
-- This migrates all existing EAV rows into a single row per organization.

-- 1. Create the new table
CREATE TABLE "OrganizationProfile" (
    "id"                  TEXT NOT NULL,
    "organization_id"     TEXT NOT NULL,
    "company_name"        TEXT,
    "legal_name"          TEXT,
    "address"             TEXT,
    "email"               TEXT,
    "phone"               TEXT,
    "website"             TEXT,
    "logo_url"            TEXT,
    "vat_number"          TEXT,
    "registration_number" TEXT,
    "bank_name"           TEXT,
    "iban"                TEXT,
    "swift"               TEXT,
    "contact_person"      TEXT,
    "footer_note"         TEXT,
    "gdpr_note"           TEXT,
    "additional_note"     TEXT,
    "ramp_count"          INTEGER NOT NULL DEFAULT 4,
    "tva_enabled"         BOOLEAN NOT NULL DEFAULT false,
    "tva_percentage"      DOUBLE PRECISION NOT NULL DEFAULT 19,
    "entity_type"         TEXT,
    "cnp"                 TEXT,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationProfile_organization_id_key" ON "OrganizationProfile"("organization_id");

ALTER TABLE "OrganizationProfile"
    ADD CONSTRAINT "OrganizationProfile_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Migrate existing EAV data: pivot N rows per org into one row per org
--    Values are stored as JSON {"value": <actual_value>}, extracted with ->>'value'
INSERT INTO "OrganizationProfile" (
    "id", "organization_id",
    "company_name", "legal_name", "address", "email", "phone", "website", "logo_url",
    "vat_number", "registration_number", "bank_name", "iban", "swift", "contact_person",
    "footer_note", "gdpr_note", "additional_note",
    "ramp_count", "tva_enabled", "tva_percentage",
    "entity_type", "cnp",
    "created_at", "updated_at"
)
SELECT
    gen_random_uuid()::TEXT,
    "organization_id",
    NULLIF(MAX(CASE WHEN name = 'companyName'        THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'legalName'          THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'address'            THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'email'              THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'phone'              THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'website'            THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'logoUrl'            THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'vatNumber'          THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'registrationNumber' THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'bankName'           THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'iban'               THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'swift'              THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'contactPerson'      THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'footerNote'         THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'gdprNote'           THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'additionalNote'     THEN value->>'value' END), ''),
    COALESCE(
        (MAX(CASE WHEN name = 'rampCount' THEN value->>'value' END))::INTEGER,
        4
    ),
    COALESCE(
        (MAX(CASE WHEN name = 'tvaEnabled' THEN value->>'value' END))::BOOLEAN,
        false
    ),
    COALESCE(
        (MAX(CASE WHEN name = 'tvaPercentage' THEN value->>'value' END))::DOUBLE PRECISION,
        19
    ),
    NULLIF(MAX(CASE WHEN name = 'entityType' THEN value->>'value' END), ''),
    NULLIF(MAX(CASE WHEN name = 'cnp'        THEN value->>'value' END), ''),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "CompanySetting"
WHERE "organization_id" IS NOT NULL
GROUP BY "organization_id";

-- 3. Drop the old EAV table
DROP TABLE "CompanySetting";
