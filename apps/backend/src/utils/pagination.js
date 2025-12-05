/**
 * Pagination utilities for API endpoints
 */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * Parse pagination parameters from query
 * @param {Object} query - Express query object
 * @returns {Object} Pagination params
 */
const parsePaginationParams = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

/**
 * Build pagination response metadata
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
};

/**
 * Create paginated response
 * @param {Array} data - Data array
 * @param {number} total - Total count
 * @param {Object} paginationParams - Pagination parameters
 * @returns {Object} Paginated response
 */
const createPaginatedResponse = (data, total, { page, limit }) => {
  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Apply pagination to Prisma query
 * @param {Object} query - Express query object
 * @returns {Object} Prisma pagination options
 */
const getPrismaPagination = (query) => {
  const { skip, limit } = parsePaginationParams(query);
  return { skip, take: limit };
};

module.exports = {
  parsePaginationParams,
  buildPaginationMeta,
  createPaginatedResponse,
  getPrismaPagination,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
};
