/**
 * ANAF E-Factura XML Exporter
 * Generates UBL 2.1 compliant XML for Romanian electronic invoicing
 */

const { buildUBLInvoice } = require('./anafXmlBuilder');

/**
 * Export a single invoice to ANAF-compatible UBL 2.1 XML
 * @param {Object} invoice - Invoice data with lineItems
 * @param {Object} company - Company/supplier information (from getCompanySettings)
 * @param {Object} client - Client record
 * @returns {Buffer} UBL XML as buffer
 */
const exportInvoiceToAnafXML = (invoice, company, client) => {
  const xmlString = buildUBLInvoice(invoice, company, client);
  return Buffer.from(xmlString, 'utf-8');
};

module.exports = {
  exportInvoiceToAnafXML,
};
