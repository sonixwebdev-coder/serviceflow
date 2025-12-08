export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEHNICIAN: 'technician',
  TECHNICIAN: 'technician',  // Alias for backward compatibility (same value, won't duplicate in Object.values)
  VANZARI: 'sales',
  SALES: 'sales',            // Alias for backward compatibility (same value, won't duplicate in Object.values)
};

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const LEAVE_TYPE = {
  VACATION: 'vacation',
  SICK: 'sick',
  PERSONAL: 'personal',
  UNPAID: 'unpaid',
  MEDICAL: 'medical',
};
