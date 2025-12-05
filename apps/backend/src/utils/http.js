const ok = (res, data = {}, message = 'Operation successful') => {
  return res.json({
    success: true,
    message,
    data,
  });
};

const created = (res, data = {}, message = 'Resource created successfully') => {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
};

const noContent = (res) => {
  return res.status(204).send();
};

const errorResponse = (res, status, message, errors) => {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
};

module.exports = {
  ok,
  created,
  noContent,
  errorResponse,
};
