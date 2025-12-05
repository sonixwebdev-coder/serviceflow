-- AlterEnum
ALTER TYPE "LeaveType" ADD VALUE 'MEDICAL';

-- AlterTable
ALTER TABLE "TimeOffRequest" ADD COLUMN     "isMedical" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "TimeOffRequest_isMedical_idx" ON "TimeOffRequest"("isMedical");
