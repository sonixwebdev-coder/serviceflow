-- CreateIndex
CREATE INDEX "Appointment_createdById_idx" ON "Appointment"("createdById");

-- CreateIndex
CREATE INDEX "Appointment_scheduledStart_scheduledEnd_idx" ON "Appointment"("scheduledStart", "scheduledEnd");

-- CreateIndex
CREATE INDEX "AppointmentAssignee_userId_idx" ON "AppointmentAssignee"("userId");

-- CreateIndex
CREATE INDEX "AppointmentAssignee_appointmentId_idx" ON "AppointmentAssignee"("appointmentId");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX "Task_status_dueDate_idx" ON "Task"("status", "dueDate");

-- CreateIndex
CREATE INDEX "TaskAssignment_userId_idx" ON "TaskAssignment"("userId");

-- CreateIndex
CREATE INDEX "TaskAssignment_taskId_idx" ON "TaskAssignment"("taskId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskProduct_taskId_idx" ON "TaskProduct"("taskId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_employeeId_status_idx" ON "TimeOffRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "TimeOffRequest_status_startDate_idx" ON "TimeOffRequest"("status", "startDate");

-- CreateIndex
CREATE INDEX "TimeOffRequest_startDate_endDate_idx" ON "TimeOffRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
