const normalize = (value) => (value ? value.toUpperCase().replace(/-/g, '_') : undefined);

const buildTaskCreateData = (payload, currentUser, locationId) => {
  const assignments = Array.isArray(payload.assignedTo) ? payload.assignedTo : [];

  return {
    assignments,
    data: {
      title: payload.title,
      description: payload.description,
      taskType: normalize(payload.taskType) || 'INSTALLATION',
      priority: normalize(payload.priority) || 'MEDIUM',
      status: normalize(payload.status) || 'TODO',
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      estimatedHours: payload.estimatedHours ?? 0,
      completionPercentage: payload.completionPercentage ?? 0,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerVehicle: payload.customerVehicle,
      createdById: currentUser.id,
      updatedById: currentUser.id,
      locationId: payload.locationId || locationId || null,
      products: payload.products?.length
        ? {
            create: payload.products.map((product) => ({
              productName: product.productName,
              sku: product.sku,
              quantity: product.quantity ?? 1,
            })),
          }
        : undefined,
      assignments: assignments.length
        ? {
            create: assignments.map((userId) => ({ userId })),
          }
        : undefined,
    },
  };
};

const buildTaskUpdateData = (payload, currentUser, { canUpdateAllFields, managerial }) => {
  const allowedFields = canUpdateAllFields
    ? payload
    : Object.fromEntries(
        Object.entries(payload).filter(([key]) => ['status', 'completionPercentage'].includes(key))
      );

  const data = {
    ...allowedFields,
    updatedById: currentUser.id,
  };

  if (data.status) data.status = normalize(data.status);
  if (data.priority) data.priority = normalize(data.priority);
  if (data.taskType) data.taskType = normalize(data.taskType);
  if (data.dueDate) data.dueDate = new Date(data.dueDate);

  if (managerial && Array.isArray(payload.assignedTo)) {
    data.assignments = {
      deleteMany: {},
      create: payload.assignedTo.map((userId) => ({ userId })),
    };
  }

  if (managerial && Array.isArray(payload.products)) {
    data.products = {
      deleteMany: {},
      create: payload.products.map((product) => ({
        productName: product.productName,
        sku: product.sku,
        quantity: product.quantity ?? 1,
      })),
    };
  }

  return data;
};

const mapTaskComments = (comments) =>
  comments.map((comment) => ({
    id: comment.id,
    _id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    user: {
      id: comment.author.id,
      _id: comment.author.id,
      firstName: comment.author.firstName,
      lastName: comment.author.lastName,
      email: comment.author.email,
    },
  }));

module.exports = {
  buildTaskCreateData,
  buildTaskUpdateData,
  mapTaskComments,
  normalize,
};
