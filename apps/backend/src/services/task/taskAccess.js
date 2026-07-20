const { normalize } = require('./taskDomain');

const isManagerial = ({ roles }) => roles?.some((role) => ['admin', 'manager'].includes(role));

const getTaskAccess = (task, currentUser) => {
  const assignedIds = task.assignments.map((assignment) => assignment.userId);
  return {
    assignedIds,
    isCreator: task.createdById === currentUser.id,
  };
};

const buildTaskWhere = (filters, currentUser, options = {}) => {
  const { locationFilter = {} } = options;
  const where = {};
  const andConditions = [];

  if (locationFilter && Object.keys(locationFilter).length > 0) {
    andConditions.push(locationFilter);
  }

  if (filters.status) where.status = normalize(filters.status);
  if (filters.priority) where.priority = normalize(filters.priority);
  if (filters.taskType) where.taskType = normalize(filters.taskType);

  if (filters.assignedTo) {
    where.assignments = {
      some: {
        userId: filters.assignedTo,
      },
    };
  }

  andConditions.push({
    OR: [
      {
        assignments: {
          some: {
            userId: currentUser.id,
          },
        },
      },
      { createdById: currentUser.id },
    ],
  });

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
};

module.exports = { buildTaskWhere, getTaskAccess, isManagerial };
