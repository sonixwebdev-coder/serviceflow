-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "fidelityCardSerie" TEXT;

-- CreateIndex
CREATE INDEX "Client_fidelityCardSerie_idx" ON "Client"("fidelityCardSerie");
