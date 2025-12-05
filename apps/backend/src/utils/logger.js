const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const formatTimestamp = () => {
  return new Date().toISOString();
};

const writeToFile = (message) => {
  try {
    fs.appendFileSync(LOG_FILE, message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

const log = (level, message, data = null) => {
  const timestamp = formatTimestamp();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  // File output only (no console logging)
  writeToFile(logMessage);
  if (data) {
    writeToFile(JSON.stringify(data, null, 2));
  }
};

const logger = {
  info: (message, data) => log('INFO', message, data),
  warn: (message, data) => log('WARN', message, data),
  error: (message, data) => log('ERROR', message, data),
  debug: (message, data) => log('DEBUG', message, data),
  notification: (message, data) => log('NOTIFICATION', message, data),
};

module.exports = logger;
