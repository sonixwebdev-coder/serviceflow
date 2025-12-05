-- AlterTable: Add new columns with defaults
ALTER TABLE "ServiceOrderLineItem" ADD COLUMN "hardwarePrice" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "ServiceOrderLineItem" ADD COLUMN "laborPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "InvoiceLineItem" ADD COLUMN "hardwarePrice" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceLineItem" ADD COLUMN "laborPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Migrate existing data: copy unitPrice to hardwarePrice
UPDATE "ServiceOrderLineItem" SET "hardwarePrice" = "unitPrice" WHERE "unitPrice" IS NOT NULL;
UPDATE "InvoiceLineItem" SET "hardwarePrice" = "unitPrice" WHERE "unitPrice" IS NOT NULL;

-- Drop old columns
ALTER TABLE "ServiceOrderLineItem" DROP COLUMN "unitPrice";
ALTER TABLE "InvoiceLineItem" DROP COLUMN "unitPrice";
