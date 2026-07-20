const prisma = require('../../lib/prisma');
const clientImportService = require('../services/clientImportService');

jest.mock('../../lib/prisma', () => ({
  client: { findFirst: jest.fn() },
  $transaction: jest.fn(),
}));

describe('clientImportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        client: {
          create: jest.fn(async ({ data }) => ({ id: 'client-1', ...data })),
        },
      })
    );
  });

  it.each([
    ['+40 721 234 567', '0721234567'],
    ['0040-721-234-567', '0721234567'],
    ['40721234567', '0721234567'],
    ['0721.234.567', '0721234567'],
  ])('normalizes supported Romanian phone format %s', (input, expected) => {
    expect(clientImportService.normalizePhoneNumber(input)).toBe(expected);
  });

  it('keeps the public validation helpers compatible', () => {
    expect(clientImportService.validatePhoneNumber('0721234567')).toBeNull();
    expect(clientImportService.validatePhoneNumber('123')).toMatch('Numar de telefon invalid');
    expect(clientImportService.validateEmail('client@example.com')).toBeNull();
    expect(clientImportService.validateEmail('not-an-email')).toBe('Adresa de email invalida');
    expect(clientImportService.validateCUI('RO12345678')).toBeNull();
    expect(clientImportService.validateCUI('RO-ABC')).toMatch('CUI invalid');
  });

  it('generates the established Excel-compatible CSV template', () => {
    const template = clientImportService.generateCSVTemplate();
    const content = template.toString('utf8');

    expect(Buffer.isBuffer(template)).toBe(true);
    expect(content.startsWith('\ufeffTip,Prenume,Nume,Companie')).toBe(true);
    expect(content).toContain('"Auto Service SRL"');
  });

  it('imports normalized rows through the existing facade', async () => {
    const csv = Buffer.from(
      [
        'Tip,Prenume,Nume,Telefon,Email,Online,Observatii',
        'PF, Ana ,Popescu,+40 721 234 567,ANA@EXAMPLE.COM,da,=FORMULA',
      ].join('\n')
    );

    const result = await clientImportService.importClientsFromCSV(csv);

    expect(result).toMatchObject({
      totalRows: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
      quotaLimited: 0,
    });
    expect(prisma.client.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { phone: '0721234567' } })
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30000 });
    expect(result.created[0]).toMatchObject({
      row: 2,
      client: {
        firstName: 'Ana',
        phone: '0721234567',
        email: 'ana@example.com',
        isOnline: true,
        notes: "'=FORMULA",
      },
    });
  });

  it('reports validation failures without opening a transaction', async () => {
    const csv = Buffer.from(['Tip,Prenume,Nume,Telefon,Email', 'PF,,,,invalid'].join('\n'));

    const result = await clientImportService.importClientsFromCSV(csv);

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toMatchObject({
      row: 2,
      errors: expect.arrayContaining([
        'Clientii personali necesita prenume SAU nume',
        'Adresa de email invalida',
      ]),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('preserves duplicate detection and skips insertion', async () => {
    prisma.client.findFirst.mockResolvedValueOnce({
      id: 'existing',
      type: 'PF',
      firstName: 'Ana',
      lastName: 'Popescu',
      companyName: null,
    });
    const csv = Buffer.from(
      ['Tip,Prenume,Nume,Telefon,Email', 'PF,Ana,Popescu,0721234567,ana@example.com'].join('\n')
    );

    const result = await clientImportService.importClientsFromCSV(csv);

    expect(result).toMatchObject({ successful: 0, skipped: 1 });
    expect(result.duplicates).toEqual([{ row: 2, reason: 'Telefon duplicat: Ana Popescu' }]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('wraps empty imports in the existing 400 AppError contract', async () => {
    await expect(
      clientImportService.importClientsFromCSV(Buffer.from('Tip,Prenume\n'))
    ).rejects.toMatchObject({
      name: 'AppError',
      status: 400,
      message: 'Fisierul CSV este gol sau nu contine date valide',
    });
  });
});
