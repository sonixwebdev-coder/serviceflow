const xml2js = require('xml2js');
const { AppError } = require('../../utils/errors');

/**
 * ANAF XML Builder Service
 * Generates UBL 2.1 compliant XML for Romanian E-Factura
 */

/**
 * Format date to ANAF format (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format decimal number for XML
 * @param {number|string} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
function formatDecimal(value, decimals = 2) {
  return Number(value).toFixed(decimals);
}

/**
 * Build UBL 2.1 Invoice XML for ANAF E-Factura
 * @param {Object} invoiceData - Invoice data from database
 * @param {Object} companyData - Company information
 * @param {Object} clientData - Client information
 * @returns {string} UBL XML string
 */
function buildUBLInvoice(invoiceData, companyData, clientData) {
  try {
    // Prepare supplier (company) data
    const supplier = {
      'cac:Party': {
        'cac:PartyName': {
          'cbc:Name': companyData.name || 'Company Name',
        },
        'cac:PostalAddress': {
          'cbc:StreetName': companyData.address || '',
          'cbc:CityName': companyData.city || '',
          'cbc:CountrySubentity': companyData.county || '',
          'cac:Country': {
            'cbc:IdentificationCode': companyData.country || 'RO',
          },
        },
        'cac:PartyTaxScheme': {
          'cbc:CompanyID': companyData.vatNumber || '',
          'cac:TaxScheme': {
            'cbc:ID': 'VAT',
          },
        },
        'cac:PartyLegalEntity': {
          'cbc:RegistrationName': companyData.name || '',
          'cbc:CompanyID': companyData.registrationNumber || '',
        },
        'cac:Contact': {
          'cbc:Telephone': companyData.phone || '',
          'cbc:ElectronicMail': companyData.email || '',
        },
      },
    };

    // Prepare customer (client) data
    const customer = {
      'cac:Party': {
        'cac:PartyName': {
          'cbc:Name': clientData.type === 'PF'
            ? `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim()
            : clientData.companyName || 'Client Name',
        },
        'cac:PostalAddress': {
          'cbc:StreetName': clientData.address || '',
          'cbc:CityName': clientData.city || '',
          'cac:Country': {
            'cbc:IdentificationCode': 'RO',
          },
        },
        'cac:PartyTaxScheme': {
          'cbc:CompanyID': clientData.vatNumber || 'N/A',
          'cac:TaxScheme': {
            'cbc:ID': 'VAT',
          },
        },
        'cac:PartyLegalEntity': {
          'cbc:RegistrationName': clientData.type === 'PF'
            ? `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim()
            : clientData.companyName || '',
          'cbc:CompanyID': clientData.registrationNumber || 'N/A',
        },
        'cac:Contact': {
          'cbc:Telephone': clientData.phone || '',
          'cbc:ElectronicMail': clientData.email || '',
        },
      },
    };

    // Prepare invoice lines
    const invoiceLines = invoiceData.lineItems.map((item, index) => {
      const lineTotal = Number(item.totalPrice);
      const unitPrice = Number(item.hardwarePrice) + Number(item.laborPrice);
      const quantity = Number(item.quantity);

      return {
        'cac:InvoiceLine': {
          'cbc:ID': String(index + 1),
          'cbc:InvoicedQuantity': {
            '_': formatDecimal(quantity, 3),
            '$': {
              'unitCode': 'EA', // Each
            },
          },
          'cbc:LineExtensionAmount': {
            '_': formatDecimal(lineTotal, 2),
            '$': {
              'currencyID': 'RON',
            },
          },
          'cac:Item': {
            'cbc:Name': item.name,
            'cbc:Description': item.description || item.name,
          },
          'cac:Price': {
            'cbc:PriceAmount': {
              '_': formatDecimal(unitPrice, 2),
              '$': {
                'currencyID': 'RON',
              },
            },
          },
        },
      };
    });

    // Calculate tax breakdown
    const subtotal = Number(invoiceData.subtotal);
    const tax = Number(invoiceData.tax);
    const total = Number(invoiceData.total);
    const taxRate = subtotal > 0 ? (tax / subtotal) * 100 : 19;

    // Build the complete UBL structure
    const ublInvoice = {
      'Invoice': {
        '$': {
          'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
          'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
          'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        },
        'cbc:UBLVersionID': '2.1',
        'cbc:CustomizationID': 'urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1',
        'cbc:ID': invoiceData.invoiceNumber,
        'cbc:IssueDate': formatDate(invoiceData.issueDate),
        'cbc:DueDate': formatDate(invoiceData.dueDate),
        'cbc:InvoiceTypeCode': '380', // Commercial invoice
        'cbc:DocumentCurrencyCode': 'RON',
        'cbc:Note': invoiceData.notes || '',
        'cac:AccountingSupplierParty': supplier,
        'cac:AccountingCustomerParty': customer,
        'cac:PaymentMeans': {
          'cbc:PaymentMeansCode': '30', // Credit transfer
          'cac:PayeeFinancialAccount': {
            'cbc:ID': companyData.bankAccount || 'N/A',
            'cbc:Name': companyData.bankName || '',
          },
        },
        'cac:TaxTotal': {
          'cbc:TaxAmount': {
            '_': formatDecimal(tax, 2),
            '$': {
              'currencyID': 'RON',
            },
          },
          'cac:TaxSubtotal': {
            'cbc:TaxableAmount': {
              '_': formatDecimal(subtotal, 2),
              '$': {
                'currencyID': 'RON',
              },
            },
            'cbc:TaxAmount': {
              '_': formatDecimal(tax, 2),
              '$': {
                'currencyID': 'RON',
              },
            },
            'cac:TaxCategory': {
              'cbc:ID': 'S', // Standard rate
              'cbc:Percent': formatDecimal(taxRate, 2),
              'cac:TaxScheme': {
                'cbc:ID': 'VAT',
              },
            },
          },
        },
        'cac:LegalMonetaryTotal': {
          'cbc:LineExtensionAmount': {
            '_': formatDecimal(subtotal, 2),
            '$': {
              'currencyID': 'RON',
            },
          },
          'cbc:TaxExclusiveAmount': {
            '_': formatDecimal(subtotal, 2),
            '$': {
              'currencyID': 'RON',
            },
          },
          'cbc:TaxInclusiveAmount': {
            '_': formatDecimal(total, 2),
            '$': {
              'currencyID': 'RON',
            },
          },
          'cbc:PayableAmount': {
            '_': formatDecimal(total, 2),
            '$': {
              'currencyID': 'RON',
            },
          },
        },
        ...invoiceLines.reduce((acc, line, idx) => {
          acc[`cac:InvoiceLine${idx > 0 ? idx : ''}`] = line['cac:InvoiceLine'];
          return acc;
        }, {}),
      },
    };

    // Convert to XML string
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' },
    });

    return builder.buildObject(ublInvoice);
  } catch (error) {
    throw new AppError(`Failed to build UBL XML: ${error.message}`, 500);
  }
}

/**
 * Validate XML structure before upload
 * @param {string} xmlString - XML string to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateXmlStructure(xmlString) {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
    });

    const parsed = await parser.parseStringPromise(xmlString);
    const errors = [];
    const warnings = [];

    // Check required UBL elements
    if (!parsed.Invoice) {
      errors.push('Missing root Invoice element');
    } else {
      const invoice = parsed.Invoice;

      // Required elements
      if (!invoice['cbc:ID']) errors.push('Missing invoice ID (cbc:ID)');
      if (!invoice['cbc:IssueDate']) errors.push('Missing issue date (cbc:IssueDate)');
      if (!invoice['cac:AccountingSupplierParty']) errors.push('Missing supplier information');
      if (!invoice['cac:AccountingCustomerParty']) errors.push('Missing customer information');
      if (!invoice['cac:LegalMonetaryTotal']) errors.push('Missing monetary totals');

      // Check for at least one invoice line
      const hasInvoiceLine = Object.keys(invoice).some(key => key.startsWith('cac:InvoiceLine'));
      if (!hasInvoiceLine) {
        errors.push('Missing invoice lines');
      }

      // Warnings for optional but recommended elements
      if (!invoice['cbc:DueDate']) warnings.push('Missing due date (recommended)');
      if (!invoice['cbc:Note']) warnings.push('Missing notes (recommended)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      parsedData: parsed,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`XML parsing error: ${error.message}`],
      warnings: [],
      parsedData: null,
    };
  }
}

/**
 * Parse ANAF XML response
 * @param {string} xmlString - XML response from ANAF
 * @returns {Promise<Object>} Parsed response
 */
async function parseAnafResponse(xmlString) {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false,
    });

    return await parser.parseStringPromise(xmlString);
  } catch (error) {
    throw new AppError(`Failed to parse ANAF response: ${error.message}`, 500);
  }
}

/**
 * Extract error messages from ANAF response
 * @param {Object|string} response - ANAF response (XML or parsed)
 * @returns {Promise<Array>} Array of error messages
 */
async function extractErrorMessages(response) {
  try {
    let parsed = response;

    if (typeof response === 'string') {
      parsed = await parseAnafResponse(response);
    }

    const errors = [];

    // Check for error in header
    if (parsed.header) {
      if (parsed.header.Errors) {
        errors.push(parsed.header.Errors);
      }
      if (parsed.header.ExecutionStatus !== '0' && parsed.header.ExecutionStatus !== 0) {
        errors.push(`Execution failed with status: ${parsed.header.ExecutionStatus}`);
      }
    }

    // Check for error messages in body
    if (parsed.mesaj_eroare) {
      errors.push(parsed.mesaj_eroare);
    }

    if (parsed.Envelope?.Body?.Fault) {
      const fault = parsed.Envelope.Body.Fault;
      errors.push(`SOAP Fault: ${fault.faultstring || 'Unknown error'}`);
    }

    return errors;
  } catch (error) {
    return [`Failed to parse error response: ${error.message}`];
  }
}

module.exports = {
  buildUBLInvoice,
  validateXmlStructure,
  parseAnafResponse,
  extractErrorMessages,
  formatDate,
  formatDecimal,
};
