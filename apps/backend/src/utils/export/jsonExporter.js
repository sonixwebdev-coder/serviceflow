/**
 * JSON Export Utilities
 * Generates structured JSON files with metadata
 */

const { formatDateTime } = require('./exportUtils');
const { getPlatformConfig } = require('../../config/platform');

/**
 * Export data to JSON format
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @param {Boolean} options.includeMetadata - Include export metadata
 * @param {Boolean} options.prettyPrint - Format JSON with indentation
 * @param {String} options.entityType - Entity type for metadata
 * @returns {Buffer} JSON file as buffer
 */
const exportToJSON = (data, options = {}) => {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }

  const { includeMetadata = true, prettyPrint = true, entityType = 'data' } = options;

  let output;

  if (includeMetadata) {
    output = {
      metadata: {
        exportDate: formatDateTime(new Date()),
        entityType,
        totalRecords: data.length,
        generatedBy: getPlatformConfig().name,
      },
      data,
    };
  } else {
    output = data;
  }

  // Handle circular references
  const seen = new WeakSet();
  const jsonString = JSON.stringify(
    output,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    },
    prettyPrint ? 2 : 0
  );

  return Buffer.from(jsonString, 'utf8');
};

/**
 * Export entity data to JSON with proper structure
 */
const exportEntityToJSON = (entityType, data, includeMetadata = true) => {
  return exportToJSON(data, {
    includeMetadata,
    prettyPrint: true,
    entityType,
  });
};

/**
 * Export multiple entities to a single structured JSON file
 */
const exportMultipleEntitiesToJSON = (entities) => {
  if (!Array.isArray(entities) || entities.length === 0) {
    throw new Error('Entities must be a non-empty array');
  }

  const output = {
    metadata: {
      exportDate: formatDateTime(new Date()),
      generatedBy: getPlatformConfig().name,
      entities: entities.map((e) => ({
        name: e.name,
        count: e.data?.length || 0,
      })),
    },
    data: {},
  };

  entities.forEach((entity) => {
    output.data[entity.name] = entity.data || [];
  });

  const jsonString = JSON.stringify(output, null, 2);
  return Buffer.from(jsonString, 'utf8');
};

module.exports = {
  exportToJSON,
  exportEntityToJSON,
  exportMultipleEntitiesToJSON,
};
