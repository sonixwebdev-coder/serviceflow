/**
 * XML Export Utilities
 * Generates generic XML exports for entities
 */

const xml2js = require('xml2js');

/**
 * Export entity data to XML format
 * @param {string} entityType - Type of entity (e.g., 'invoices', 'clients')
 * @param {Array} data - Array of entity data objects
 * @returns {Buffer} XML content as buffer
 */
const exportEntityToXML = (entityType, data) => {
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ' },
    rootName: 'Export',
  });

  const xmlObj = {
    metadata: {
      entityType,
      count: data.length,
      exportedAt: new Date().toISOString(),
    },
    records: {
      record: data.map((item) => {
        // Flatten nested objects and convert values to strings for XML safety
        const record = {};
        for (const [key, value] of Object.entries(item)) {
          if (value === null || value === undefined) {
            record[key] = '';
          } else if (typeof value === 'object' && !(value instanceof Date)) {
            record[key] = JSON.stringify(value);
          } else {
            record[key] = String(value);
          }
        }
        return record;
      }),
    },
  };

  const xmlString = builder.buildObject(xmlObj);
  return Buffer.from(xmlString, 'utf-8');
};

module.exports = {
  exportEntityToXML,
};
