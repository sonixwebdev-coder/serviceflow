const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const STORAGE_ROOT =
  process.env.FILE_STORAGE_ROOT || path.resolve(__dirname, '../../storage');

const ensureDirectory = async (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    await fsp.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Resolve a relative path within STORAGE_ROOT.
 * Validates that the resolved path stays inside STORAGE_ROOT to prevent path traversal.
 */
const resolvePath = (relativePath = '') => {
  const fullPath = path.resolve(STORAGE_ROOT, relativePath);
  if (!fullPath.startsWith(STORAGE_ROOT + path.sep) && fullPath !== STORAGE_ROOT) {
    throw new Error(`Path traversal attempt blocked: ${relativePath}`);
  }
  return fullPath;
};

const writeFile = async (relativePath, buffer) => {
  const fullPath = resolvePath(relativePath);
  await ensureDirectory(path.dirname(fullPath));
  await fsp.writeFile(fullPath, buffer);
  return fullPath;
};

const readFile = async (relativePath) => {
  const fullPath = resolvePath(relativePath);
  return fsp.readFile(fullPath);
};

const removeFile = async (relativePath) => {
  if (!relativePath) return;
  try {
    const fullPath = resolvePath(relativePath);
    await fsp.unlink(fullPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const exists = async (relativePath) => {
  if (!relativePath) return false;
  try {
    const fullPath = resolvePath(relativePath);
    await fsp.access(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  STORAGE_ROOT,
  resolvePath,
  writeFile,
  readFile,
  removeFile,
  exists,
};
