const path = require('path');
const { removeFile } = require('./storage');

const PUBLIC_LOGO_PREFIX = '/files/logos/';

const getStoredLogoPath = (logoUrl) => {
  if (typeof logoUrl !== 'string') return null;

  const publicPath = logoUrl.split(/[?#]/, 1)[0];
  if (!publicPath.startsWith(PUBLIC_LOGO_PREFIX)) return null;

  let filename;
  try {
    filename = decodeURIComponent(publicPath.slice(PUBLIC_LOGO_PREFIX.length));
  } catch {
    return null;
  }

  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('\0') ||
    path.posix.basename(filename) !== filename ||
    path.win32.basename(filename) !== filename
  ) {
    return null;
  }

  return path.posix.join('logos', filename);
};

const removeStoredLogo = async (logoUrl) => {
  const storedPath = getStoredLogoPath(logoUrl);
  if (storedPath) await removeFile(storedPath);
};

module.exports = { getStoredLogoPath, removeStoredLogo };
