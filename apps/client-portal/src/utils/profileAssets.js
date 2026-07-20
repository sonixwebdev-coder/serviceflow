export const createEmptyAssetForm = () => ({
  name: '',
  identifier: '',
  type: '',
  manufacturer: '',
  model: '',
  year: '',
});

export const createAssetFormFromAsset = (asset) => ({
  name: asset.name || '',
  identifier: asset.identifier || '',
  type: asset.type || '',
  manufacturer: asset.manufacturer || '',
  model: asset.model || '',
  year: asset.year?.toString() || '',
});

export const getAssetDisplayName = (asset, fallback) =>
  asset.name || `${asset.manufacturer || ''} ${asset.model || ''}`.trim() || fallback;
