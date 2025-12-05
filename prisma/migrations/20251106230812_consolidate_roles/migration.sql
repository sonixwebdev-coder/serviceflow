-- Consolidate Roles: Migrate manager -> admin and inventory -> technician
-- This migration preserves existing role records for potential rollback

-- Update UserRole assignments: Map all 'manager' role assignments to 'admin'
UPDATE "UserRole"
SET "roleId" = (SELECT id FROM "Role" WHERE key = 'admin' LIMIT 1)
WHERE "roleId" IN (SELECT id FROM "Role" WHERE key = 'manager');

-- Update UserRole assignments: Map all 'inventory' role assignments to 'technician'
UPDATE "UserRole"
SET "roleId" = (SELECT id FROM "Role" WHERE key = 'technician' LIMIT 1)
WHERE "roleId" IN (SELECT id FROM "Role" WHERE key = 'inventory');

-- Note: We keep the old 'manager' and 'inventory' Role records in the database
-- for potential rollback. They will simply not be assigned to any users anymore.
-- If you want to remove them completely in the future, run:
-- DELETE FROM "Role" WHERE key IN ('manager', 'inventory');
