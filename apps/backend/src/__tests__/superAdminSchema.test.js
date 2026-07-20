const { billingSubscriptionsQuery } = require('../schemas/superAdminSchema');

describe('super-admin billing subscription query', () => {
  it('accepts a single organization filter alongside pagination', () => {
    const result = billingSubscriptionsQuery.parse({
      organizationId: 'clx1234567890abcdefghijkl',
      page: '2',
      limit: '10',
    });

    expect(result).toMatchObject({
      organizationId: 'clx1234567890abcdefghijkl',
      page: 2,
      limit: 10,
    });
  });

  it('rejects malformed organization identifiers', () => {
    expect(() => billingSubscriptionsQuery.parse({ organizationId: '../all' })).toThrow();
  });
});
