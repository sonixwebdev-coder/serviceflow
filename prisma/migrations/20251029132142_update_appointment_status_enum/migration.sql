-- Update existing appointment statuses to new enum values
-- Map old values to new values: SCHEDULED -> PENDING, CONFIRMED -> APPROVED

-- Create new enum type with updated values
CREATE TYPE "AppointmentStatus_new" AS ENUM ('PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Alter the table to use the new enum type, mapping old values to new
ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus_new"
  USING (
    CASE status::text
      WHEN 'SCHEDULED' THEN 'PENDING'
      WHEN 'CONFIRMED' THEN 'APPROVED'
      WHEN 'NO_SHOW' THEN 'CANCELLED'
      ELSE status::text
    END::"AppointmentStatus_new"
  );
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"AppointmentStatus_new";

-- Drop the old enum type
DROP TYPE "AppointmentStatus";

-- Rename the new enum type to the original name
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
