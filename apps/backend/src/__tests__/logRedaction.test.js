const { redactLogData, redactLogString } = require('../utils/logRedaction');

describe('log redaction', () => {
  it('redacts nested secrets and common personal-data fields without changing safe context', () => {
    expect(
      redactLogData({
        action: 'profile.update',
        password: 'not-for-logs',
        nested: {
          accessToken: 'not-for-logs',
          email: 'ana@example.com',
          phone: '+40123456789',
          organizationId: 'org-1',
        },
      })
    ).toEqual({
      action: 'profile.update',
      password: '[REDACTED]',
      nested: {
        accessToken: '[REDACTED]',
        email: '[REDACTED_PII]',
        phone: '[REDACTED_PII]',
        organizationId: 'org-1',
      },
    });
  });

  it('redacts credentials and email addresses embedded in log messages', () => {
    expect(redactLogString('Login ana@example.com with Bearer abc.def.ghi')).toBe(
      'Login [REDACTED_EMAIL] with Bearer [REDACTED]'
    );
  });

  it('handles errors and circular data without throwing', () => {
    const context = { requestId: 'request-1' };
    context.self = context;
    const result = redactLogData({
      error: Object.assign(new Error('Failed for ana@example.com'), { refreshToken: 'secret' }),
      context,
    });

    expect(result.error.message).toBe('Failed for [REDACTED_EMAIL]');
    expect(result.error.refreshToken).toBe('[REDACTED]');
    expect(result.context.self).toBe('[CIRCULAR]');
  });
});
