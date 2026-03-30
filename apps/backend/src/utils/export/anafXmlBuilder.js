const xml2js = require('xml2js');
const { AppError } = require('../errors');

/**
 * ANAF E-Factura XML Builder
 * Generates CIUS-RO (UBL 2.1) compliant XML for Romanian E-Factura.
 *
 * References:
 *   - CIUS-RO v1.0.1: https://mfinante.gov.ro/web/efactura/informatii-tehnice
 *   - EN 16931 (European e-invoicing standard)
 */

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDecimal(value, decimals = 2) {
  return Number(value || 0).toFixed(decimals);
}

/**
 * Determine if a Romanian VAT number (CUI) has the 'RO' prefix (= VAT registered).
 * Normalises the input and returns { raw, prefix, numeric }.
 */
function parseRomanianVat(vatNumber) {
  if (!vatNumber) return { raw: '', prefix: '', numeric: '', isVatPayer: false };
  const trimmed = String(vatNumber).trim().toUpperCase();
  const isVatPayer = trimmed.startsWith('RO');
  const numeric = trimmed.replace(/^RO/, '');
  return { raw: trimmed, prefix: isVatPayer ? 'RO' : '', numeric, isVatPayer };
}

/**
 * Build supplier party element.
 * Supports SRL (company with CUI + J-number) and PFA (CNP-based).
 */
function buildSupplierParty(company) {
  const entityType = (company.entityType || 'SRL').toUpperCase();
  const isPFA = entityType === 'PFA';
  const vat = parseRomanianVat(company.vatNumber);

  const party = {
    'cac:PartyName': {
      'cbc:Name': company.companyName || company.legalName || company.name || '',
    },
    'cac:PostalAddress': {
      'cbc:StreetName': company.address || '',
      'cbc:CityName': company.city || '',
      ...(company.county ? { 'cbc:CountrySubentity': company.county } : {}),
      'cac:Country': {
        'cbc:IdentificationCode': company.country || 'RO',
      },
    },
    'cac:PartyTaxScheme': {
      // BT-31: VAT identifier.  RO + CUI for VAT payers, just CUI otherwise.
      // For PFA without CUI, use CNP prefixed with RO per ANAF guidance.
      'cbc:CompanyID': isPFA
        ? (vat.raw || (company.cnp ? `RO${company.cnp}` : ''))
        : (vat.raw || ''),
      'cac:TaxScheme': {
        'cbc:ID': 'VAT',
      },
    },
    'cac:PartyLegalEntity': {
      'cbc:RegistrationName': company.legalName || company.companyName || company.name || '',
      // BT-30: Legal registration. J-number for SRL, or CUI/CNP for PFA.
      'cbc:CompanyID': isPFA
        ? (vat.numeric || company.cnp || '')
        : (company.registrationNumber || ''),
    },
  };

  // Contact is optional but useful
  if (company.phone || company.email) {
    party['cac:Contact'] = {
      ...(company.phone ? { 'cbc:Telephone': company.phone } : {}),
      ...(company.email ? { 'cbc:ElectronicMail': company.email } : {}),
    };
  }

  return { 'cac:Party': party };
}

/**
 * Build customer party element.
 * Handles SRL (company) and PF (individual) clients.
 */
function buildCustomerParty(client) {
  const isBusiness = client.type === 'SRL';
  const displayName = isBusiness
    ? (client.companyName || '')
    : `${client.firstName || ''} ${client.lastName || ''}`.trim();
  const vat = parseRomanianVat(client.vatNumber);

  const party = {
    'cac:PartyName': {
      'cbc:Name': displayName || 'Client',
    },
    'cac:PostalAddress': {
      'cbc:StreetName': client.address || '',
      ...(client.city ? { 'cbc:CityName': client.city } : {}),
      'cac:Country': {
        'cbc:IdentificationCode': 'RO',
      },
    },
  };

  if (isBusiness) {
    // Business client - VAT scheme + legal entity with J-number
    party['cac:PartyTaxScheme'] = {
      'cbc:CompanyID': vat.raw || '',
      'cac:TaxScheme': { 'cbc:ID': 'VAT' },
    };
    party['cac:PartyLegalEntity'] = {
      'cbc:RegistrationName': displayName,
      ...(client.registrationNumber ? { 'cbc:CompanyID': client.registrationNumber } : {}),
    };
  } else {
    // Individual (PF) - no VAT scheme, just legal entity with name
    party['cac:PartyLegalEntity'] = {
      'cbc:RegistrationName': displayName,
    };
  }

  if (client.phone || client.email) {
    party['cac:Contact'] = {
      ...(client.phone ? { 'cbc:Telephone': client.phone } : {}),
      ...(client.email ? { 'cbc:ElectronicMail': client.email } : {}),
    };
  }

  return { 'cac:Party': party };
}

/**
 * Build a single InvoiceLine element (BG-25).
 */
function buildInvoiceLine(item, index, taxRate) {
  const quantity = Number(item.quantity || item.hardwareQuantity || 1);
  const lineTotal = Number(item.totalPrice || 0);
  const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;

  return {
    'cbc:ID': String(index + 1),
    'cbc:InvoicedQuantity': {
      '_': formatDecimal(quantity, 3),
      '$': { 'unitCode': 'EA' },
    },
    'cbc:LineExtensionAmount': {
      '_': formatDecimal(lineTotal, 2),
      '$': { 'currencyID': 'RON' },
    },
    'cac:Item': {
      'cbc:Name': item.name || 'Serviciu',
      ...(item.description ? { 'cbc:Description': item.description } : {}),
      'cac:ClassifiedTaxCategory': {
        'cbc:ID': 'S',
        'cbc:Percent': formatDecimal(taxRate, 2),
        'cac:TaxScheme': { 'cbc:ID': 'VAT' },
      },
    },
    'cac:Price': {
      'cbc:PriceAmount': {
        '_': formatDecimal(unitPrice, 4),
        '$': { 'currencyID': 'RON' },
      },
    },
  };
}

/**
 * Build UBL 2.1 Invoice XML for ANAF E-Factura.
 *
 * @param {Object} invoiceData - Invoice record (with lineItems array)
 * @param {Object} companyData - Supplier company settings (from getCompanySettings)
 * @param {Object} clientData  - Client record
 * @returns {string} UBL XML string ready for ANAF upload
 */
function buildUBLInvoice(invoiceData, companyData, clientData) {
  try {
    const subtotal = Number(invoiceData.subtotal || 0);
    const tax = Number(invoiceData.tax || 0);
    const total = Number(invoiceData.total || 0);
    const loyaltyDiscount = Number(invoiceData.loyaltyDiscount || 0);
    const loyaltyTierAtTime = invoiceData.loyaltyTierAtTime || null;
    const taxableBase = Math.max(0, subtotal - loyaltyDiscount);
    const taxRate = taxableBase > 0 ? (tax / taxableBase) * 100 : 19;

    // Build lines array (xml2js handles arrays as repeated elements)
    const lines = (invoiceData.lineItems || []).map((item, i) =>
      buildInvoiceLine(item, i, taxRate)
    );

    if (lines.length === 0) {
      throw new AppError('Invoice must have at least one line item', 400);
    }

    // Payment means
    const paymentMeans = {
      'cbc:PaymentMeansCode': '30', // Credit transfer
    };
    if (companyData.iban || companyData.bankAccount) {
      paymentMeans['cac:PayeeFinancialAccount'] = {
        'cbc:ID': companyData.iban || companyData.bankAccount || '',
        ...(companyData.bankName ? { 'cbc:Name': companyData.bankName } : {}),
      };
    }

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
        ...(invoiceData.notes ? { 'cbc:Note': invoiceData.notes } : {}),

        'cac:AccountingSupplierParty': buildSupplierParty(companyData),
        'cac:AccountingCustomerParty': buildCustomerParty(clientData),
        'cac:PaymentMeans': paymentMeans,

        // Document-level allowance (loyalty discount) - BT-92 / BG-20
        ...(loyaltyDiscount > 0 ? {
          'cac:AllowanceCharge': {
            'cbc:ChargeIndicator': 'false',
            'cbc:AllowanceChargeReasonCode': '95',
            'cbc:AllowanceChargeReason': loyaltyTierAtTime
              ? `Reducere fidelitate ${loyaltyTierAtTime}`
              : 'Reducere fidelitate',
            'cbc:Amount': {
              '_': formatDecimal(loyaltyDiscount, 2),
              '$': { 'currencyID': 'RON' },
            },
            'cac:TaxCategory': {
              'cbc:ID': 'S',
              'cbc:Percent': formatDecimal(taxRate, 2),
              'cac:TaxScheme': { 'cbc:ID': 'VAT' },
            },
          },
        } : {}),

        'cac:TaxTotal': {
          'cbc:TaxAmount': {
            '_': formatDecimal(tax, 2),
            '$': { 'currencyID': 'RON' },
          },
          'cac:TaxSubtotal': {
            'cbc:TaxableAmount': {
              '_': formatDecimal(taxableBase, 2),
              '$': { 'currencyID': 'RON' },
            },
            'cbc:TaxAmount': {
              '_': formatDecimal(tax, 2),
              '$': { 'currencyID': 'RON' },
            },
            'cac:TaxCategory': {
              'cbc:ID': 'S',
              'cbc:Percent': formatDecimal(taxRate, 2),
              'cac:TaxScheme': { 'cbc:ID': 'VAT' },
            },
          },
        },

        'cac:LegalMonetaryTotal': {
          'cbc:LineExtensionAmount': {
            '_': formatDecimal(subtotal, 2),
            '$': { 'currencyID': 'RON' },
          },
          ...(loyaltyDiscount > 0 ? {
            'cbc:AllowanceTotalAmount': {
              '_': formatDecimal(loyaltyDiscount, 2),
              '$': { 'currencyID': 'RON' },
            },
          } : {}),
          'cbc:TaxExclusiveAmount': {
            '_': formatDecimal(taxableBase, 2),
            '$': { 'currencyID': 'RON' },
          },
          'cbc:TaxInclusiveAmount': {
            '_': formatDecimal(total, 2),
            '$': { 'currencyID': 'RON' },
          },
          'cbc:PayableAmount': {
            '_': formatDecimal(total, 2),
            '$': { 'currencyID': 'RON' },
          },
        },

        // Invoice lines - xml2js renders arrays as repeated <cac:InvoiceLine> elements
        'cac:InvoiceLine': lines,
      },
    };

    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' },
    });

    return builder.buildObject(ublInvoice);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to build UBL XML: ${error.message}`, 500);
  }
}

module.exports = {
  buildUBLInvoice,
  formatDate,
  formatDecimal,
};
