/**
 * Optimized Prisma includes for better performance
 * These includes fetch only necessary fields and avoid deep nesting
 */

// Minimal user info for assignments/references
const minimalUserInclude = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    avatarUrl: true,
    roles: {
      select: {
        role: {
          select: {
            key: true,
            name: true,
          },
        },
      },
    },
  },
};

// Full user info (when needed)
const fullUserInclude = {
  include: {
    roles: {
      include: {
        role: true,
      },
    },
  },
};

// Optimized task includes (without comments - use lazy loading)
const optimizedTaskIncludes = {
  assignments: {
    include: {
      user: minimalUserInclude,
    },
  },
  createdBy: minimalUserInclude,
  updatedBy: minimalUserInclude,
  products: true,
};

// Full task includes (with comments - only for detailed view if needed)
const fullTaskIncludes = {
  ...optimizedTaskIncludes,
  comments: {
    include: {
      author: minimalUserInclude,
    },
    orderBy: { createdAt: 'asc' },
  },
};

// Minimal task includes (for lists)
const minimalTaskIncludes = {
  assignments: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
};

// Minimal location include
const minimalLocationInclude = {
  select: {
    id: true,
    name: true,
    slug: true,
  },
};

// Optimized appointment includes
const optimizedAppointmentIncludes = {
  client: {
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      companyName: true,
      contactName: true,
      phone: true,
      email: true,
      vatNumber: true,
      registrationNumber: true,
      notes: true,
    },
  },
  asset: {
    select: {
      id: true,
      name: true,
      type: true,
      identifier: true,
      manufacturer: true,
      model: true,
      year: true,
      metadata: true,
    },
  },
  locationRef: minimalLocationInclude,
  assignees: {
    include: {
      user: minimalUserInclude,
    },
  },
  createdBy: minimalUserInclude,
  updatedBy: minimalUserInclude,
};

// Minimal appointment includes (for calendar/lists)
const minimalAppointmentIncludes = {
  client: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
    },
  },
  asset: {
    select: {
      id: true,
      name: true,
      type: true,
      identifier: true,
    },
  },
  locationRef: minimalLocationInclude,
  assignees: {
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
};

// Optimized time off includes
const optimizedTimeOffIncludes = {
  employee: minimalUserInclude,
  reviewer: minimalUserInclude,
};

// Optimized time entry includes
const optimizedTimeEntryIncludes = {
  employee: minimalUserInclude,
  schedule: {
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      shiftType: true,
    },
  },
  locationRef: minimalLocationInclude,
};

module.exports = {
  minimalUserInclude,
  fullUserInclude,
  minimalLocationInclude,
  optimizedTaskIncludes,
  fullTaskIncludes,
  minimalTaskIncludes,
  optimizedAppointmentIncludes,
  minimalAppointmentIncludes,
  optimizedTimeOffIncludes,
  optimizedTimeEntryIncludes,
};
