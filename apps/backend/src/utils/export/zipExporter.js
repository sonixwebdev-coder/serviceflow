/**
 * ZIP Export Utilities
 * Creates ZIP archives containing multiple export files
 */

const archiver = require('archiver');
const { Readable } = require('stream');
const { formatDateTime } = require('./exportUtils');

/**
 * Create ZIP archive from multiple files
 * @param {Array} files - Array of {name, buffer} objects
 * @param {Object} options - Archive options
 * @returns {Promise<Buffer>} ZIP file as buffer
 */
const createZipArchive = (files) => {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(files) || files.length === 0) {
      return reject(new Error('Files array must not be empty'));
    }

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const chunks = [];

    // Collect chunks
    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    // Archive finalized
    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });

    // Handle errors
    archive.on('error', (err) => {
      reject(err);
    });

    // Add files to archive
    files.forEach(file => {
      if (!file.name || !file.buffer) {
        throw new Error('Each file must have name and buffer properties');
      }

      // Create readable stream from buffer
      const stream = Readable.from(file.buffer);
      archive.append(stream, { name: file.name });
    });

    // Finalize archive
    archive.finalize();
  });
};

/**
 * Create metadata file for export
 */
const createMetadataFile = (metadata) => {
  const content = {
    exportDate: formatDateTime(new Date()),
    generatedBy: 'ForjaIt CRM',
    version: '2.0.0',
    ...metadata,
  };

  const jsonString = JSON.stringify(content, null, 2);
  return Buffer.from(jsonString, 'utf8');
};

/**
 * Export multiple entities to a ZIP archive
 * @param {Array} entities - Array of entity exports
 * @param {Object} metadata - Export metadata
 * @returns {Promise<Buffer>} ZIP archive buffer
 */
const exportEntitiesToZip = async (entities, metadata = {}) => {
  if (!Array.isArray(entities) || entities.length === 0) {
    throw new Error('Entities array must not be empty');
  }

  const files = [];

  // Add metadata file
  const metadataContent = {
    ...metadata,
    entities: entities.map(e => ({
      name: e.name,
      fileName: e.fileName,
      recordCount: e.recordCount || 0,
    })),
  };

  files.push({
    name: 'metadata.json',
    buffer: createMetadataFile(metadataContent),
  });

  // Add entity files
  entities.forEach(entity => {
    if (entity.buffer && entity.fileName) {
      files.push({
        name: entity.fileName,
        buffer: entity.buffer,
      });
    }
  });

  // Create and return ZIP
  return createZipArchive(files);
};

/**
 * Create folder structure in ZIP
 */
const createZipWithFolders = (structure) => {
  return new Promise((resolve, reject) => {
    if (!structure || typeof structure !== 'object') {
      return reject(new Error('Structure must be an object'));
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks = [];

    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    archive.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    // Process structure recursively
    const addToArchive = (obj, basePath = '') => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const currentPath = basePath ? `${basePath}/${key}` : key;

        if (Buffer.isBuffer(value)) {
          // It's a file
          const stream = Readable.from(value);
          archive.append(stream, { name: currentPath });
        } else if (typeof value === 'object' && value !== null) {
          // It's a folder
          addToArchive(value, currentPath);
        }
      });
    };

    addToArchive(structure);
    archive.finalize();
  });
};

module.exports = {
  createZipArchive,
  createMetadataFile,
  exportEntitiesToZip,
  createZipWithFolders,
};
