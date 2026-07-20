const storage = require('../utils/storage');
const { getStoredLogoPath, removeStoredLogo } = require('../utils/companyLogoStorage');

jest.mock('../utils/storage', () => ({
  removeFile: jest.fn(),
}));

describe('company logo storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a persisted public logo URL to its storage-relative path before deletion', async () => {
    await removeStoredLogo('/files/logos/company-logo-123.png');

    expect(storage.removeFile).toHaveBeenCalledWith('logos/company-logo-123.png');
  });

  it.each([
    'https://cdn.example.com/files/logos/company-logo.png',
    '/files/logos/../private.txt',
    '/files/logos/%2e%2e%2fprivate.txt',
    '/uploads/logos/company-logo.png',
  ])('does not treat an unsupported URL as a local stored logo: %s', async (logoUrl) => {
    expect(getStoredLogoPath(logoUrl)).toBeNull();

    await removeStoredLogo(logoUrl);

    expect(storage.removeFile).not.toHaveBeenCalled();
  });
});
