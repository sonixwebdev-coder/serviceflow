/**
 * Export Utilities Index
 * Central export point for all export utilities
 */

const exportUtils = require('./exportUtils');
const csvExporter = require('./csvExporter');
const excelExporter = require('./excelExporter');
const jsonExporter = require('./jsonExporter');
const pdfExporter = require('./pdfExporter');
const zipExporter = require('./zipExporter');

module.exports = {
  // Export utilities
  ...exportUtils,

  // CSV exports
  exportToCSV: csvExporter.exportToCSV,
  exportEntityToCSV: csvExporter.exportEntityToCSV,
  getFieldConfig: csvExporter.getFieldConfig,
  FIELD_CONFIGS: csvExporter.FIELD_CONFIGS,

  // Excel exports
  exportToExcel: excelExporter.exportToExcel,
  exportEntityToExcel: excelExporter.exportEntityToExcel,
  exportMultipleEntitiesToExcel: excelExporter.exportMultipleEntitiesToExcel,
  fieldConfigToColumns: excelExporter.fieldConfigToColumns,

  // JSON exports
  exportToJSON: jsonExporter.exportToJSON,
  exportEntityToJSON: jsonExporter.exportEntityToJSON,
  exportMultipleEntitiesToJSON: jsonExporter.exportMultipleEntitiesToJSON,

  // PDF exports
  exportToPDF: pdfExporter.exportToPDF,
  exportEntityToPDF: pdfExporter.exportEntityToPDF,

  // ZIP exports
  createZipArchive: zipExporter.createZipArchive,
  createMetadataFile: zipExporter.createMetadataFile,
  exportEntitiesToZip: zipExporter.exportEntitiesToZip,
  createZipWithFolders: zipExporter.createZipWithFolders,
};
