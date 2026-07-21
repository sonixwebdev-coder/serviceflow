const { sendSystemEmail } = require('../services/email/emailService');

describe('email service Brevo integration', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BREVO_API_KEY: 'test-brevo-key',
      EMAIL_FROM: 'noreply@serviceflow.test',
      EMAIL_FROM_NAME: 'ServiceFlow',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue({ messageId: 'brevo-message-1' }),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('sends through the Brevo transactional email API', async () => {
    await sendSystemEmail(
      'crm-welcome',
      {
        userName: 'Ana',
        email: 'ana@example.com',
        organizationName: 'ServiceFlow Test',
        loginUrl: 'https://serviceflow.test/login',
      },
      'ana@example.com'
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': 'test-brevo-key',
          'content-type': 'application/json',
        },
      })
    );
    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload).toEqual(
      expect.objectContaining({
        subject: expect.any(String),
        htmlContent: expect.any(String),
        sender: { name: 'ServiceFlow', email: 'noreply@serviceflow.test' },
        to: [{ email: 'ana@example.com' }],
      })
    );
  });
});
