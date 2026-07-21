const { signupSchema, slugSchema } = require('../schemas/organizationSignupSchema');

const validSignup = {
  organizationName: '  ServiceFlow Automotive  ',
  slug: 'serviceflow-auto',
  email: 'OWNER@EXAMPLE.COM',
  password: 'strong-password',
  firstName: ' Ana ',
  lastName: ' Popescu ',
  phoneNumber: '0721234567',
  activitySector: 'AUTOMOTIVE',
  vatNumber: 'RO18547290',
  companyAddress: ' Strada Exemplu 1 ',
  companyEmail: 'OFFICE@EXAMPLE.COM',
  companyPhone: '+40 721 234 567',
  entityType: 'SRL',
  registrationNumber: 'J40/1234/2024',
  cnp: '',
};

describe('organization signup schemas', () => {
  it('normalizes a valid signup payload and applies the default plan', () => {
    const result = signupSchema.safeParse(validSignup);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      organizationName: 'ServiceFlow Automotive',
      email: 'owner@example.com',
      firstName: 'Ana',
      lastName: 'Popescu',
      companyEmail: 'office@example.com',
      companyPhone: '+40721234567',
      plan: 'PROFESSIONAL',
    });
  });

  it('rejects invalid CUI, slug, sector, and unexpected fields', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      vatNumber: 'RO12345678',
      slug: 'invalid--slug',
      activitySector: 'UNKNOWN',
      unexpected: true,
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining([
        ['vatNumber'].join('.'),
        ['slug'].join('.'),
        ['activitySector'].join('.'),
      ])
    );
  });

  it('keeps the public slug contract independent from signup parsing', () => {
    expect(slugSchema.safeParse({ slug: 'valid-company-1' }).success).toBe(true);
    expect(slugSchema.safeParse({ slug: 'Bad Company' }).success).toBe(false);
    expect(slugSchema.safeParse({ slug: 'ab' }).success).toBe(false);
  });
});
