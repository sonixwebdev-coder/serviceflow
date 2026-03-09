const { AppError } = require('../utils/errors');

const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';
const VIES_TIMEOUT = 10000;

const CUI_TEST_KEY = [7, 5, 3, 2, 1, 7, 5, 3, 2];

/**
 * Validate a Romanian CUI/CIF using the checksum algorithm.
 * Works for both SRL and PFA entities.
 */
function validateCuiChecksum(cui) {
  // Strip RO prefix if present
  let digits = String(cui).trim().toUpperCase();
  if (digits.startsWith('RO')) {
    digits = digits.slice(2);
  }
  digits = digits.trim();

  // Must be numeric
  if (!/^\d+$/.test(digits)) {
    return { valid: false, error: 'CUI-ul trebuie sa contina doar cifre (cu prefix RO optional)' };
  }

  // Length check: 2-10 digits
  if (digits.length < 2 || digits.length > 10) {
    return { valid: false, error: 'CUI-ul trebuie sa aiba intre 2 si 10 cifre' };
  }

  // Separate control digit (last) from body, then left-pad body to 9 digits
  const checkDigit = parseInt(digits[digits.length - 1], 10);
  const body = digits.slice(0, -1).padStart(9, '0');

  // Positional multiply and sum
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(body[i], 10) * CUI_TEST_KEY[i];
  }

  // Checksum: (sum * 10) % 11, if result is 10 then control digit is 0
  let computed = (sum * 10) % 11;
  if (computed === 10) computed = 0;

  if (computed !== checkDigit) {
    return { valid: false, error: 'CUI-ul nu este valid (cifra de control incorecta)' };
  }

  return { valid: true };
}

/**
 * Call the EU VIES SOAP API to verify a VAT number.
 */
async function validateVatVies(countryCode, vatNumber) {
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${countryCode}</urn:countryCode>
      <urn:vatNumber>${vatNumber}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VIES_TIMEOUT);

  let response;
  try {
    response = await fetch(VIES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: soapBody,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('Serviciul VIES nu este disponibil momentan. Incercati mai tarziu.', 503);
    }
    throw new AppError('Serviciul VIES nu este disponibil momentan. Incercati mai tarziu.', 503);
  } finally {
    clearTimeout(timeout);
  }

  const xml = await response.text();

  // Check for SOAP faults
  const faultMatch = xml.match(/<faultstring>([^<]*)<\/faultstring>/);
  if (faultMatch) {
    const fault = faultMatch[1];
    if (fault.includes('INVALID_INPUT')) {
      throw new AppError('CUI-ul nu a fost gasit in registrul VIES. Verificati numarul.', 400);
    }
    // SERVICE_UNAVAILABLE, MS_UNAVAILABLE, TIMEOUT, etc.
    throw new AppError('Serviciul VIES nu este disponibil momentan. Incercati mai tarziu.', 503);
  }

  // Parse response fields
  const validMatch = xml.match(/<valid>([^<]*)<\/valid>/);
  const nameMatch = xml.match(/<name>([^<]*)<\/name>/);
  const addressMatch = xml.match(/<address>([^<]*)<\/address>/);

  const isValid = validMatch ? validMatch[1] === 'true' : false;
  const name = nameMatch ? nameMatch[1].trim() : '';
  const address = addressMatch ? addressMatch[1].trim() : '';

  return { valid: isValid, name, address };
}

/**
 * Orchestrator: validate a VAT number (local checksum + VIES).
 */
async function validateVatNumber(vatNumber) {
  let input = String(vatNumber).trim().toUpperCase();

  // Detect country code from prefix
  let countryCode = 'RO';
  let number = input;

  const prefixMatch = input.match(/^([A-Z]{2})(.+)$/);
  if (prefixMatch) {
    countryCode = prefixMatch[1];
    number = prefixMatch[2].trim();
  }

  // For Romanian VAT: run local checksum first (fast fail)
  if (countryCode === 'RO') {
    const checksumResult = validateCuiChecksum(number);
    if (!checksumResult.valid) {
      throw new AppError(checksumResult.error, 400);
    }
  }

  // VIES verification
  const viesResult = await validateVatVies(countryCode, number);

  if (!viesResult.valid) {
    throw new AppError('CUI-ul nu a fost gasit in registrul VIES. Verificati numarul.', 400);
  }

  return {
    valid: true,
    countryCode,
    vatNumber: number,
    name: viesResult.name,
    address: viesResult.address,
  };
}

module.exports = {
  validateCuiChecksum,
  validateVatVies,
  validateVatNumber,
};
