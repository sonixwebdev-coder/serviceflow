const normalizeEmploymentType = (value) => {
  if (!value) return undefined;
  return value.toString().toUpperCase().replace(/[\s-]+/g, '_');
};

module.exports = {
  normalizeEmploymentType,
};
