/*
  Warnings:

  - You are about to drop the column `company` on the `Client` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PF', 'SRL');

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "company",
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "type" "ClientType" NOT NULL DEFAULT 'PF',
ADD COLUMN     "vatNumber" TEXT,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "carId" TEXT,
ADD COLUMN     "odometerKm" INTEGER;
