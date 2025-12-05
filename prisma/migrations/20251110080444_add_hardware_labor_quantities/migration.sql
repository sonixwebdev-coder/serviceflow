-- AlterTable
ALTER TABLE "ServiceOrderLineItem" ADD COLUMN     "hardwareQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "laborQuantity" INTEGER NOT NULL DEFAULT 1;
