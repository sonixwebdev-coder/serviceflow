-- CreateEnum
CREATE TYPE "AnafInvoiceStatus" AS ENUM ('PENDING', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'OK', 'ERROR', 'REJECTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatNumber" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "county" TEXT,
    "country" TEXT NOT NULL DEFAULT 'RO',
    "phone" TEXT,
    "email" TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnafConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnafConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnafToken" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnafToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnafInvoiceSync" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "uploadIndex" TEXT,
    "downloadId" TEXT,
    "status" "AnafInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "anafStatus" TEXT,
    "errorMessage" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "xmlContent" TEXT,
    "responseData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnafInvoiceSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnafMessage" (
    "id" TEXT NOT NULL,
    "anafMessageId" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "solicitareId" TEXT,
    "tip" TEXT NOT NULL,
    "dataCreare" TEXT NOT NULL,
    "downloadId" TEXT,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "downloadedAt" TIMESTAMP(3),
    "content" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnafMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_vatNumber_key" ON "Company"("vatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AnafConfig_companyId_key" ON "AnafConfig"("companyId");

-- CreateIndex
CREATE INDEX "AnafConfig_cif_idx" ON "AnafConfig"("cif");

-- CreateIndex
CREATE INDEX "AnafToken_configId_idx" ON "AnafToken"("configId");

-- CreateIndex
CREATE INDEX "AnafToken_expiresAt_idx" ON "AnafToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnafInvoiceSync_invoiceId_key" ON "AnafInvoiceSync"("invoiceId");

-- CreateIndex
CREATE INDEX "AnafInvoiceSync_invoiceId_idx" ON "AnafInvoiceSync"("invoiceId");

-- CreateIndex
CREATE INDEX "AnafInvoiceSync_status_idx" ON "AnafInvoiceSync"("status");

-- CreateIndex
CREATE INDEX "AnafInvoiceSync_uploadIndex_idx" ON "AnafInvoiceSync"("uploadIndex");

-- CreateIndex
CREATE INDEX "AnafInvoiceSync_createdAt_idx" ON "AnafInvoiceSync"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnafMessage_anafMessageId_key" ON "AnafMessage"("anafMessageId");

-- CreateIndex
CREATE INDEX "AnafMessage_cif_idx" ON "AnafMessage"("cif");

-- CreateIndex
CREATE INDEX "AnafMessage_tip_idx" ON "AnafMessage"("tip");

-- CreateIndex
CREATE INDEX "AnafMessage_downloaded_idx" ON "AnafMessage"("downloaded");

-- CreateIndex
CREATE INDEX "AnafMessage_dataCreare_idx" ON "AnafMessage"("dataCreare");

-- AddForeignKey
ALTER TABLE "AnafConfig" ADD CONSTRAINT "AnafConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnafToken" ADD CONSTRAINT "AnafToken_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AnafConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnafInvoiceSync" ADD CONSTRAINT "AnafInvoiceSync_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
