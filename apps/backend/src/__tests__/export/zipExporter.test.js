/**
 * Unit Tests for ZIP Exporter
 * Tests ZIP archive creation with multiple files and metadata
 */

const AdmZip = require('adm-zip');
const {
  createZipArchive,
  createMetadataFile,
  exportEntitiesToZip,
  createZipWithFolders,
} = require('../../utils/export/zipExporter');

describe('ZIP Exporter - createZipArchive', () => {
  it('creates ZIP archive from multiple files', async () => {
    const files = [
      { name: 'file1.txt', buffer: Buffer.from('Content 1', 'utf8') },
      { name: 'file2.txt', buffer: Buffer.from('Content 2', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Verify ZIP contents
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    expect(zipEntries).toHaveLength(2);
  });

  it('preserves file names in archive', async () => {
    const files = [
      { name: 'test.txt', buffer: Buffer.from('Test', 'utf8') },
      { name: 'data.json', buffer: Buffer.from('{}', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    const fileNames = zipEntries.map(entry => entry.entryName);
    expect(fileNames).toContain('test.txt');
    expect(fileNames).toContain('data.json');
  });

  it('preserves file contents', async () => {
    const content1 = 'Hello World';
    const content2 = JSON.stringify({ key: 'value' });

    const files = [
      { name: 'hello.txt', buffer: Buffer.from(content1, 'utf8') },
      { name: 'data.json', buffer: Buffer.from(content2, 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);

    const file1Content = zip.readAsText('hello.txt');
    const file2Content = zip.readAsText('data.json');

    expect(file1Content).toBe(content1);
    expect(file2Content).toBe(content2);
  });

  it('handles single file', async () => {
    const files = [
      { name: 'single.txt', buffer: Buffer.from('Single file', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    expect(zipEntries).toHaveLength(1);
  });

  it('handles large files', async () => {
    const largeContent = Buffer.alloc(1024 * 1024, 'A'); // 1MB
    const files = [
      { name: 'large.dat', buffer: largeContent },
    ];

    const zipBuffer = await createZipArchive(files);
    expect(zipBuffer).toBeInstanceOf(Buffer);

    const zip = new AdmZip(zipBuffer);
    const extractedContent = zip.readFile('large.dat');
    expect(extractedContent.length).toBe(largeContent.length);
  });

  it('handles binary files', async () => {
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]);
    const files = [
      { name: 'binary.bin', buffer: binaryData },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);
    const extractedData = zip.readFile('binary.bin');

    expect(Buffer.compare(extractedData, binaryData)).toBe(0);
  });

  it('throws error for empty files array', async () => {
    await expect(createZipArchive([])).rejects.toThrow('Files array must not be empty');
  });

  it('throws error for non-array input', async () => {
    await expect(createZipArchive(null)).rejects.toThrow('Files array must not be empty');
    await expect(createZipArchive(undefined)).rejects.toThrow('Files array must not be empty');
  });

  it('throws error for files without name property', async () => {
    const files = [
      { buffer: Buffer.from('Content', 'utf8') },
    ];

    await expect(createZipArchive(files)).rejects.toThrow('Each file must have name and buffer properties');
  });

  it('throws error for files without buffer property', async () => {
    const files = [
      { name: 'file.txt' },
    ];

    await expect(createZipArchive(files)).rejects.toThrow('Each file must have name and buffer properties');
  });

  it('handles UTF-8 file names', async () => {
    const files = [
      { name: 'fișier.txt', buffer: Buffer.from('Romanian', 'utf8') },
      { name: '文件.txt', buffer: Buffer.from('Chinese', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    expect(zipEntries).toHaveLength(2);
  });

  it('handles file names with paths', async () => {
    const files = [
      { name: 'folder/file1.txt', buffer: Buffer.from('Content 1', 'utf8') },
      { name: 'folder/subfolder/file2.txt', buffer: Buffer.from('Content 2', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);

    const file1Content = zip.readAsText('folder/file1.txt');
    const file2Content = zip.readAsText('folder/subfolder/file2.txt');

    expect(file1Content).toBe('Content 1');
    expect(file2Content).toBe('Content 2');
  });

  it('compresses files', async () => {
    const uncompressedContent = 'A'.repeat(10000);
    const files = [
      { name: 'compressible.txt', buffer: Buffer.from(uncompressedContent, 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);

    // ZIP should be smaller than original content
    expect(zipBuffer.length).toBeLessThan(uncompressedContent.length);
  });
});

describe('ZIP Exporter - createMetadataFile', () => {
  it('creates metadata JSON buffer', () => {
    const metadata = {
      entities: ['appointments', 'invoices'],
      totalRecords: 100,
    };

    const buffer = createMetadataFile(metadata);
    expect(buffer).toBeInstanceOf(Buffer);

    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed).toHaveProperty('exportDate');
    expect(parsed).toHaveProperty('generatedBy', 'ViperX CRM');
    expect(parsed).toHaveProperty('version', '2.0.0');
    expect(parsed.entities).toEqual(['appointments', 'invoices']);
    expect(parsed.totalRecords).toBe(100);
  });

  it('includes export date', () => {
    const buffer = createMetadataFile({});
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.exportDate).toBeDefined();
    expect(typeof parsed.exportDate).toBe('string');
  });

  it('includes generator information', () => {
    const buffer = createMetadataFile({});
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.generatedBy).toBe('ViperX CRM');
    expect(parsed.version).toBe('2.0.0');
  });

  it('merges custom metadata', () => {
    const custom = {
      customField1: 'value1',
      customField2: 123,
    };

    const buffer = createMetadataFile(custom);
    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.customField1).toBe('value1');
    expect(parsed.customField2).toBe(123);
  });

  it('pretty prints JSON', () => {
    const buffer = createMetadataFile({});
    const jsonString = buffer.toString('utf8');

    expect(jsonString).toContain('\n');
    expect(jsonString).toContain('  ');
  });

  it('handles empty metadata', () => {
    const buffer = createMetadataFile({});
    expect(buffer).toBeInstanceOf(Buffer);

    const jsonString = buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    expect(parsed.exportDate).toBeDefined();
    expect(parsed.generatedBy).toBeDefined();
  });
});

describe('ZIP Exporter - exportEntitiesToZip', () => {
  it('exports multiple entities to ZIP', async () => {
    const entities = [
      {
        name: 'Appointments',
        fileName: 'appointments.csv',
        buffer: Buffer.from('id,title\n1,Test', 'utf8'),
        recordCount: 1,
      },
      {
        name: 'Invoices',
        fileName: 'invoices.csv',
        buffer: Buffer.from('id,number\n1,INV-001', 'utf8'),
        recordCount: 1,
      },
    ];

    const zipBuffer = await exportEntitiesToZip(entities);
    expect(zipBuffer).toBeInstanceOf(Buffer);

    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    // Should have metadata.json + 2 entity files
    expect(zipEntries.length).toBeGreaterThanOrEqual(2);
  });

  it('includes metadata.json file', async () => {
    const entities = [
      {
        name: 'Test',
        fileName: 'test.csv',
        buffer: Buffer.from('data', 'utf8'),
        recordCount: 1,
      },
    ];

    const zipBuffer = await exportEntitiesToZip(entities);
    const zip = new AdmZip(zipBuffer);

    const metadataContent = zip.readAsText('metadata.json');
    expect(metadataContent).toBeDefined();

    const metadata = JSON.parse(metadataContent);
    expect(metadata).toHaveProperty('exportDate');
    expect(metadata).toHaveProperty('entities');
  });

  it('includes entity information in metadata', async () => {
    const entities = [
      {
        name: 'Appointments',
        fileName: 'appointments.csv',
        buffer: Buffer.from('data', 'utf8'),
        recordCount: 5,
      },
      {
        name: 'Invoices',
        fileName: 'invoices.csv',
        buffer: Buffer.from('data', 'utf8'),
        recordCount: 3,
      },
    ];

    const zipBuffer = await exportEntitiesToZip(entities);
    const zip = new AdmZip(zipBuffer);

    const metadataContent = zip.readAsText('metadata.json');
    const metadata = JSON.parse(metadataContent);

    expect(metadata.entities).toHaveLength(2);
    expect(metadata.entities[0]).toEqual({
      name: 'Appointments',
      fileName: 'appointments.csv',
      recordCount: 5,
    });
  });

  it('includes custom metadata', async () => {
    const entities = [
      {
        name: 'Test',
        fileName: 'test.txt',
        buffer: Buffer.from('data', 'utf8'),
      },
    ];

    const customMetadata = {
      exportedBy: 'user-123',
      note: 'Test export',
    };

    const zipBuffer = await exportEntitiesToZip(entities, customMetadata);
    const zip = new AdmZip(zipBuffer);

    const metadataContent = zip.readAsText('metadata.json');
    const metadata = JSON.parse(metadataContent);

    expect(metadata.exportedBy).toBe('user-123');
    expect(metadata.note).toBe('Test export');
  });

  it('throws error for empty entities array', async () => {
    await expect(exportEntitiesToZip([])).rejects.toThrow('Entities array must not be empty');
  });

  it('throws error for non-array entities', async () => {
    await expect(exportEntitiesToZip(null)).rejects.toThrow('Entities array must not be empty');
  });

  it('skips entities without buffer or fileName', async () => {
    const entities = [
      {
        name: 'Valid',
        fileName: 'valid.txt',
        buffer: Buffer.from('data', 'utf8'),
      },
      {
        name: 'Invalid',
        // Missing fileName and buffer
      },
    ];

    const zipBuffer = await exportEntitiesToZip(entities);
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    // Should have metadata.json + 1 valid entity file
    const fileNames = zipEntries.map(e => e.entryName);
    expect(fileNames).toContain('valid.txt');
    expect(fileNames).toContain('metadata.json');
  });

  it('handles entities with recordCount = 0', async () => {
    const entities = [
      {
        name: 'Empty',
        fileName: 'empty.csv',
        buffer: Buffer.from('header\n', 'utf8'),
        recordCount: 0,
      },
    ];

    const zipBuffer = await exportEntitiesToZip(entities);
    expect(zipBuffer).toBeInstanceOf(Buffer);
  });
});

describe('ZIP Exporter - createZipWithFolders', () => {
  it('creates ZIP with folder structure', async () => {
    const structure = {
      'folder1': {
        'file1.txt': Buffer.from('Content 1', 'utf8'),
        'file2.txt': Buffer.from('Content 2', 'utf8'),
      },
      'folder2': {
        'file3.txt': Buffer.from('Content 3', 'utf8'),
      },
    };

    const zipBuffer = await createZipWithFolders(structure);
    const zip = new AdmZip(zipBuffer);

    expect(zip.readAsText('folder1/file1.txt')).toBe('Content 1');
    expect(zip.readAsText('folder1/file2.txt')).toBe('Content 2');
    expect(zip.readAsText('folder2/file3.txt')).toBe('Content 3');
  });

  it('handles nested folders', async () => {
    const structure = {
      'parent': {
        'child': {
          'grandchild': {
            'file.txt': Buffer.from('Deep', 'utf8'),
          },
        },
      },
    };

    const zipBuffer = await createZipWithFolders(structure);
    const zip = new AdmZip(zipBuffer);

    expect(zip.readAsText('parent/child/grandchild/file.txt')).toBe('Deep');
  });

  it('handles mixed files and folders at root', async () => {
    const structure = {
      'root-file.txt': Buffer.from('Root', 'utf8'),
      'folder': {
        'nested-file.txt': Buffer.from('Nested', 'utf8'),
      },
    };

    const zipBuffer = await createZipWithFolders(structure);
    const zip = new AdmZip(zipBuffer);

    expect(zip.readAsText('root-file.txt')).toBe('Root');
    expect(zip.readAsText('folder/nested-file.txt')).toBe('Nested');
  });

  it('throws error for non-object structure', async () => {
    await expect(createZipWithFolders(null)).rejects.toThrow('Structure must be an object');
    await expect(createZipWithFolders('string')).rejects.toThrow('Structure must be an object');
  });

  it('handles empty structure', async () => {
    const zipBuffer = await createZipWithFolders({});
    expect(zipBuffer).toBeInstanceOf(Buffer);

    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    expect(zipEntries).toHaveLength(0);
  });
});

describe('ZIP Exporter - Edge Cases', () => {
  it('handles many files', async () => {
    const files = Array(100).fill(null).map((_, i) => ({
      name: `file${i}.txt`,
      buffer: Buffer.from(`Content ${i}`, 'utf8'),
    }));

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    expect(zipEntries).toHaveLength(100);
  });

  it('handles Romanian file names', async () => {
    const files = [
      { name: 'Programări.csv', buffer: Buffer.from('data', 'utf8') },
      { name: 'Facturi.xlsx', buffer: Buffer.from('data', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    expect(zipBuffer).toBeInstanceOf(Buffer);
  });

  it('handles duplicate file names', async () => {
    const files = [
      { name: 'file.txt', buffer: Buffer.from('First', 'utf8') },
      { name: 'file.txt', buffer: Buffer.from('Second', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);

    // The second file should overwrite or coexist
    const content = zip.readAsText('file.txt');
    expect(content).toBeDefined();
  });

  it('handles empty buffers', async () => {
    const files = [
      { name: 'empty.txt', buffer: Buffer.alloc(0) },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);

    const content = zip.readFile('empty.txt');
    expect(content.length).toBe(0);
  });

  it('handles special characters in file names', async () => {
    const files = [
      { name: 'file (1).txt', buffer: Buffer.from('data', 'utf8') },
      { name: 'file [test].txt', buffer: Buffer.from('data', 'utf8') },
      { name: 'file@2024.txt', buffer: Buffer.from('data', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    expect(zipEntries).toHaveLength(3);
  });

  it('handles very long file names', async () => {
    const longName = 'a'.repeat(200) + '.txt';
    const files = [
      { name: longName, buffer: Buffer.from('data', 'utf8') },
    ];

    const zipBuffer = await createZipArchive(files);
    expect(zipBuffer).toBeInstanceOf(Buffer);
  });
});
