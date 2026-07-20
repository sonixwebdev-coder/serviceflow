const { createWebsiteSchema, updateWebsiteSchema } = require('../schemas/websiteSchema');

describe('website branding image validation', () => {
  it.each(['/files/logos/company.png', 'https://cdn.example.com/company.png'])(
    'accepts uploaded and hosted image references: %s',
    (logoUrl) => {
      const result = createWebsiteSchema.safeParse({
        subdomain: 'sample-company',
        branding: { logoUrl },
      });

      expect(result.success).toBe(true);
    }
  );

  it('accepts a relative uploaded logo during website updates', () => {
    expect(
      updateWebsiteSchema.safeParse({ branding: { logoUrl: '/files/logos/company.png' } }).success
    ).toBe(true);
  });

  it('rejects executable URL protocols for image references', () => {
    expect(
      updateWebsiteSchema.safeParse({ branding: { logoUrl: 'javascript:alert(1)' } }).success
    ).toBe(false);
  });
});
