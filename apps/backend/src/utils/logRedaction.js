const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const MAX_DEPTH = 12;
const PII_KEYS = new Set([
  'email',
  'emailaddress',
  'phone',
  'phonenumber',
  'address',
  'cnp',
  'iban',
  'firstname',
  'lastname',
  'fullname',
]);

const normalizeKey = (key) => key.replace(/[-_]/g, '').toLowerCase();

const isSecretKey = (key) => {
  const normalized = normalizeKey(key);
  return (
    ['authorization', 'cookie', 'setcookie', 'passphrase'].includes(normalized) ||
    normalized.endsWith('password') ||
    normalized.endsWith('secret') ||
    normalized.endsWith('token') ||
    normalized.endsWith('apikey') ||
    normalized.endsWith('privatekey') ||
    normalized.endsWith('encryptionkey')
  );
};

function redactLogString(value) {
  return value
    .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
}

function redactLogData(value, state = { depth: 0, seen: new WeakSet() }) {
  if (typeof value === 'string') return redactLogString(value);
  if (value === null || value === undefined || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (state.depth >= MAX_DEPTH) return '[MAX_DEPTH]';
  if (state.seen.has(value)) return '[CIRCULAR]';

  state.seen.add(value);
  const childState = { depth: state.depth + 1, seen: state.seen };

  if (value instanceof Error) {
    const errorData = {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
    for (const key of Object.getOwnPropertyNames(value)) {
      if (!['name', 'message', 'stack'].includes(key)) errorData[key] = value[key];
    }
    return redactLogData(errorData, childState);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLogData(item, childState));
  }

  const redacted = {};
  for (const [key, item] of Object.entries(value)) {
    if (isSecretKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (PII_KEYS.has(normalizeKey(key))) {
      redacted[key] = '[REDACTED_PII]';
    } else {
      redacted[key] = redactLogData(item, childState);
    }
  }
  return redacted;
}

module.exports = { redactLogData, redactLogString };
