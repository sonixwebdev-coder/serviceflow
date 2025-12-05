-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Client_isOnline_idx" ON "Client"("isOnline");
