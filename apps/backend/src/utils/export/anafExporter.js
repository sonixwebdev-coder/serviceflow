/**
 * ANAF E-Factura XML Exporter
 * Generates UBL 2.1 compliant XML for Romanian electronic invoicing
 */

const { buildUBLInvoice } = require('../../services/anaf/anafXmlBuilder');
const { createZipArchive } = require('./zipExporter');

/**
 * Export a single invoice to ANAF-compatible UBL 2.1 XML
 * @param {Object} invoice - Invoice data with lineItems
 * @param {Object} company - Company/supplier information
 * @param {Object} client - Client/customer information
 * @returns {Buffer} UBL XML as buffer
 */
const exportInvoiceToAnafXML = (invoice, company, client) => {
  const xmlString = buildUBLInvoice(invoice, company, client);
  return Buffer.from(xmlString, 'utf-8');
};

/**
 * Export multiple invoices to a ZIP archive of ANAF UBL XMLs
 * @param {Array} invoices - Array of { invoice, company, client } objects
 * @returns {Promise<Buffer>} ZIP buffer containing individual XML files
 */
const exportInvoicesToAnafZip = async (invoices) => {
  const files = invoices.map((item) => {
    const xmlBuffer = exportInvoiceToAnafXML(item.invoice, item.company, item.client);
    const safeNumber = (item.invoice.invoiceNumber || item.invoice.id)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      name: `factura_${safeNumber}.xml`,
      buffer: xmlBuffer,
    };
  });

  return createZipArchive(files);
};

module.exports = {
  exportInvoiceToAnafXML,
  exportInvoicesToAnafZip,
};
