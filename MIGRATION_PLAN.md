# ServiceFlow Schema Migration Plan

## Current Status

✅ **Rollback Complete** - System restored to working state with original schema
- All temporary refactor files removed
- Backend services restored to committed versions
- Server running and healthy
- Database: Neon PostgreSQL with new multi-tenant schema

## Problem Analysis

The initial approach tried to change too much at once:
- Changed database schema (old → new multi-tenant)
- Modified all auth services
- Updated task services
- Changed middleware
- This created a cascade of errors that was hard to debug

## New Approach: Incremental Migration

We'll migrate ONE module at a time, testing at each step.

---

## Phase 1: Database Schema Coexistence (CURRENT)

**Goal**: Both old and new schemas can coexist

**Current State**:
- ✅ New Prisma schema created and deployed
- ✅ Database has new multi-tenant structure
- ✅ Seed data exists (3 organizations, demo users)
- ✅ Old code still works (reading from old schema)

**Status**: COMPLETE

---

## Phase 2: Authentication Module Migration

**Goal**: Auth works with new schema, everything else unchanged

### Step 2.1: Auth Service Only
- [ ] Update `authService.js`:
  - `loginUser()` - Change `findUnique` → `findFirst` (email not globally unique)
  - `loginUser()` - Use `passwordHash` field
  - `loginUser()` - Add organization to response
  - `refreshSession()` - Same changes
  - Keep `registerUser()` AS-IS for now
- [ ] Test: Login with `admin@autoservice.ro` / `Admin123!`
- [ ] Test: Token refresh
- [ ] **DO NOT TOUCH** other services yet

### Step 2.2: Auth Middleware
- [ ] Update `authenticate.js`:
  - Remove `roles` include
  - Add `organization` include
  - Change `req.user` to use single `role` field
  - Add `req.organization`
- [ ] Update `authorize.js`:
  - Check `req.user.role` instead of `req.user.roles`
- [ ] Test: All authenticated endpoints still work

### Step 2.3: User Service (Minimal)
- [ ] Update `userService.js` - ONLY `getCurrentUser()`:
  - Remove `roles` include
  - Add `organization` include
- [ ] Test: `/api/users/me` endpoint
- [ ] **STOP** - Don't touch other user service functions yet

**Exit Criteria for Phase 2**:
- ✅ Login works
- ✅ Token refresh works
- ✅ `/api/users/me` works
- ✅ All other endpoints still work (even if using old schema)

---

## Phase 3: Fix Common Utilities

**Goal**: Shared utilities work with new schema

### Step 3.1: OptimizedIncludes
- [ ] Update `minimalUserInclude`:
  - Change `avatarUrl` → `avatar`
  - Remove `roles` relation
  - Add single `role` field
- [ ] Update `fullUserInclude`:
  - Remove `roles`
  - Add `organization`
- [ ] **DO NOT** update task includes yet
- [ ] Test: User-related endpoints

### Step 3.2: Transform/Mappers
- [ ] Update `mapUser()` if needed
- [ ] Keep other mappers AS-IS
- [ ] Test: User data displays correctly

**Exit Criteria for Phase 3**:
- ✅ User includes work
- ✅ User data maps correctly
- ✅ No errors in user-related endpoints

---

## Phase 4: Task Module Migration

**Goal**: Tasks work with simplified new schema

### Step 4.1: Understand Schema Differences

**Old Task Schema** (what code expects):
- `assignments` - Join table with multiple users
- `taskType`, `estimatedHours`, `completionPercentage`
- `customerName`, `customerPhone`, `customerVehicle`
- `products` relation
- `updatedBy` relation
- `comments` relation

**New Task Schema** (what actually exists):
- `assignedToId` - Single user assignment
- `assignedEmployeeId` - Optional employee assignment
- Only basic fields: `title`, `description`, `status`, `priority`, `dueDate`
- No `taskType`, no `products`, no `comments`, no `updatedBy`

### Step 4.2: Update Task Includes
- [ ] Update `optimizedTaskIncludes`:
  - `assignments` → `assignedTo` + `assignedEmployee`
  - Remove `updatedBy`, `products`
- [ ] Update `minimalTaskIncludes` - same changes
- [ ] Test: Can read task includes without errors

### Step 4.3: Update Task Service - Read Operations Only
- [ ] `buildTaskWhere()`:
  - Change `assignments.some` → `assignedToId`
  - Add `organizationId` scoping
- [ ] `listTasks()`:
  - Use new where clause
  - Use new includes
- [ ] `getTaskById()`:
  - Check `assignedToId` instead of `assignments`
- [ ] Test: Can list and view tasks

### Step 4.4: Update Task Service - Write Operations
- [ ] `createTask()`:
  - Remove non-existent fields
  - Use `assignedToId` instead of `assignments`
  - Add `organizationId`
- [ ] `updateTask()`:
  - Remove non-existent fields
  - Simplified permissions
- [ ] `deleteTask()` - Should work as-is
- [ ] Test: Can create, update, delete tasks

**Exit Criteria for Phase 4**:
- ✅ Can list tasks
- ✅ Can view task details
- ✅ Can create basic tasks
- ✅ Can update task status
- ✅ Can delete tasks
- ⚠️ Advanced features (taskType, products, etc.) intentionally removed

---

## Phase 5: Other Modules (One at a Time)

Repeat the pattern for each module:

### 5.1 Clients Module
- [ ] Update client service
- [ ] Test thoroughly before moving on

### 5.2 Appointments Module
- [ ] Update appointment service
- [ ] Update appointment includes
- [ ] Test

### 5.3 Service Orders Module
- [ ] Update service order service
- [ ] Test

### 5.4 Vehicles/Assets Module
- [ ] Update as needed
- [ ] Test

### 5.5 Employees Module
- [ ] Update employee service
- [ ] Test

### 5.6 Time Tracking Module
- [ ] Update time entry/off services
- [ ] Test

**Rule**: ONE module per session. Test. Commit. Move to next.

---

## Phase 6: Frontend Updates

Only after backend is stable:

### 6.1 Error Display
- [ ] Update login page error handling
- [ ] Show `error.response.data.message` instead of raw errors

### 6.2 Organization Branding
- [ ] Use organization data from login
- [ ] Apply `primaryColor` and `brandName`

### 6.3 Role-Based UI
- [ ] Update to use single `role` field
- [ ] Update permissions checks

---

## Testing Strategy

### After Each Step:
1. **Manual Test**: Test the specific feature you just changed
2. **Regression Test**: Test 2-3 other features to ensure nothing broke
3. **Server Health**: Check server logs for errors
4. **Commit**: If working, commit immediately

### Test Credentials:
- `admin@autoservice.ro` / `Admin123!` (OWNER, PRO plan)
- `admin@techrepair.ro` / `Admin123!` (OWNER, STARTER plan)
- `demo@serviceflow.ro` / `Admin123!` (ADMIN, FREE plan)

---

## Rollback Strategy

### If a Step Fails:
1. **Don't panic** - We're working incrementally
2. **Revert the specific file**: `git checkout HEAD -- path/to/file.js`
3. **Document the issue**: What failed, why
4. **Reassess**: Maybe skip that module for now

### Nuclear Option:
```bash
# Restore ALL backend services to last commit
git checkout HEAD -- apps/backend/src/services/
git checkout HEAD -- apps/backend/src/middleware/
git checkout HEAD -- apps/backend/src/utils/
```

---

## Success Criteria

### Minimum Viable Migration:
- ✅ Auth works (login, refresh, authenticate)
- ✅ Users can see their profile
- ✅ Basic task CRUD works
- ✅ No critical errors in logs
- ⚠️ Some advanced features may be temporarily disabled

### Full Migration Complete:
- ✅ All modules migrated
- ✅ All features working
- ✅ Frontend updated
- ✅ No schema errors
- ✅ Multi-tenant isolation working
- ✅ All tests passing

---

## Key Principles

1. **One Thing at a Time**: Never change more than one service file per step
2. **Test Before Moving On**: Each step must pass tests
3. **Commit Often**: Working code > perfect code
4. **Document Decisions**: Note what was changed and why
5. **Keep Old Code**: Backup old versions before deleting
6. **Accept Trade-offs**: Some features may be simplified in new schema

---

## Current Next Step

**START HERE**: Phase 2.1 - Update Auth Service Only

**Files to modify**:
- `apps/backend/src/services/authService.js` (ONLY loginUser and refreshSession)

**Files to NOT touch**:
- Everything else

**Test plan**:
```bash
# 1. Start server
npm run dev:backend

# 2. Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autoservice.ro","password":"Admin123!"}'

# Should return 200 with user + organization data

# 3. Test other endpoint (should still work)
# Use token from step 2
curl http://localhost:5000/api/users/me \
  -H "Authorization: Bearer <token>"

# Should return 200 with user data
```

**Success = Move to Phase 2.2**
**Failure = Rollback this one file, reassess**

---

*Last Updated: 2025-12-05*
*Status: Ready to begin Phase 2.1*
