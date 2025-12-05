-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "advancePaidAt" TIMESTAMP(3),
ADD COLUMN     "advancePayment" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "finalPaidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "remainingBalance" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "Appointment_paymentStatus_idx" ON "Appointment"("paymentStatus");
