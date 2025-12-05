/**
 * Extract user-friendly error message from API error response
 *
 * Handles various error formats from:
 * - Axios errors (error.response.data.message)
 * - Network errors (error.message)
 * - Validation errors (error.response.data.errors)
 * - Generic errors
 *
 * @param {Error} error - The error object from API call or mutation
 * @param {string} fallbackMessage - Optional fallback message if no error message found
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error, fallbackMessage = 'A aparut o eroare. Va rugam incercati din nou.') => {
  // Check for axios response error with message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for axios response error with errors array (validation errors)
  if (error?.response?.data?.errors) {
    const errors = error.response.data.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      // Join multiple validation errors with line breaks
      return errors.map(err => err.message || err).join('\n');
    }
    if (typeof errors === 'object') {
      // Handle object of field errors
      const messages = Object.values(errors).flat();
      return messages.join('\n');
    }
  }

  // Check for axios response error with error field
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  // Check for regular error message
  if (error?.message) {
    // Filter out generic axios network errors
    if (error.message.includes('Network Error')) {
      return 'Eroare de retea. Verificati conexiunea la internet.';
    }
    if (error.message.includes('timeout')) {
      return 'Cererea a expirat. Va rugam incercati din nou.';
    }
    return error.message;
  }

  // Return fallback message
  return fallbackMessage;
};

/**
 * Get error status code from error object
 * @param {Error} error - The error object
 * @returns {number|null} - HTTP status code or null
 */
export const getErrorStatus = (error) => {
  return error?.response?.status || null;
};

/**
 * Check if error is a validation error (400)
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isValidationError = (error) => {
  return getErrorStatus(error) === 400;
};

/**
 * Check if error is an authentication error (401)
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  return getErrorStatus(error) === 401;
};

/**
 * Check if error is a forbidden error (403)
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isForbiddenError = (error) => {
  return getErrorStatus(error) === 403;
};

/**
 * Check if error is a not found error (404)
 * @param {Error} error - The error object
 * @returns {boolean}
 */
export const isNotFoundError = (error) => {
  return getErrorStatus(error) === 404;
};
