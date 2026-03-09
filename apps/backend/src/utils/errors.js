class AppError extends Error {
  constructor(message, status = 500, details = null, code = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

module.exports = {
  AppError,
};
