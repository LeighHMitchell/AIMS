import { describe, it, expect, vi } from 'vitest';
import { extractIatiMeta, IatiParseError, validateIatiId, validateOrgRef } from '../../../lib/iati/parseMeta';

describe('extractIatiMeta', () => {
  const createMockFile = (content: string, name: string = 'test.xml'): File => {
    const blob = new Blob([content], { type: 'application/xml' });
    return new File([blob], name, { type: 'application/xml' });
  };

  describe('successful parsing', () => {
    it('should extract metadata from valid IATI 2.03 XML', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activities version="2.03">
          <iati-activity>
            <iati-identifier>GB-GOV-1-123456</iati-identifier>
            <reporting-org ref="GB-GOV-1">
              <narrative>UK Government</narrative>
            </reporting-org>
            <last-updated-datetime>2024-01-15T10:30:00Z</last-updated-datetime>
          </iati-activity>
        </iati-activities>`;

      const file = createMockFile(xmlContent);
      const result = await extractIatiMeta(file);

      expect(result.iatiId).toBe('GB-GOV-1-123456');
      expect(result.reportingOrgRef).toBe('GB-GOV-1');
      expect(result.reportingOrgName).toBe('UK Government');
      expect(result.lastUpdated).toBe('2024-01-15T10:30:00Z');
    });

    it('should handle single activity XML without activities wrapper', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activity>
          <iati-identifier>SINGLE-ACTIVITY-123</iati-identifier>
          <reporting-org ref="ORG-REF">
            <narrative>Test Organisation</narrative>
          </reporting-org>
        </iati-activity>`;

      const file = createMockFile(xmlContent);
      const result = await extractIatiMeta(file);

      expect(result.iatiId).toBe('SINGLE-ACTIVITY-123');
      expect(result.reportingOrgRef).toBe('ORG-REF');
      expect(result.reportingOrgName).toBe('Test Organisation');
    });

    it('should handle multiple narratives and prefer English', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activities>
          <iati-activity>
            <iati-identifier>MULTI-LANG-123</iati-identifier>
            <reporting-org ref="MULTI-ORG">
              <narrative xml:lang="fr">Organisation française</narrative>
              <narrative xml:lang="en">English Organisation</narrative>
              <narrative xml:lang="es">Organización española</narrative>
            </reporting-org>
          </iati-activity>
        </iati-activities>`;

      const file = createMockFile(xmlContent);
      const result = await extractIatiMeta(file);

      expect(result.reportingOrgName).toBe('English Organisation');
    });

    it('should handle namespaced XML elements', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati:iati-activities xmlns:iati="http://iatistandard.org/2.03" version="2.03">
          <iati:iati-activity>
            <iati:iati-identifier>NAMESPACE-123</iati:iati-identifier>
            <iati:reporting-org ref="NS-ORG">
              <iati:narrative>Namespaced Org</iati:narrative>
            </iati:reporting-org>
          </iati:iati-activity>
        </iati:iati-activities>`;

      const file = createMockFile(xmlContent);
      const result = await extractIatiMeta(file);

      expect(result.iatiId).toBe('NAMESPACE-123');
      expect(result.reportingOrgRef).toBe('NS-ORG');
    });
  });

  describe('error handling', () => {
    it('should throw IatiParseError for non-XML files', async () => {
      const file = createMockFile('This is not XML', 'test.txt');
      
      await expect(extractIatiMeta(file)).rejects.toThrow(IatiParseError);
    });

    it('should throw IatiParseError for empty files', async () => {
      const file = createMockFile('');
      
      await expect(extractIatiMeta(file)).rejects.toThrow(IatiParseError);
    });

    it('should throw IatiParseError for files without iati-activity', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <root>
          <some-other-element>content</some-other-element>
        </root>`;

      const file = createMockFile(xmlContent);
      
      await expect(extractIatiMeta(file)).rejects.toThrow(IatiParseError);
      await expect(extractIatiMeta(file)).rejects.toThrow('Could not find <iati-activity>');
    });

    it('should throw IatiParseError for missing iati-identifier', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activity>
          <reporting-org ref="TEST-ORG">
            <narrative>Test Org</narrative>
          </reporting-org>
        </iati-activity>`;

      const file = createMockFile(xmlContent);
      
      await expect(extractIatiMeta(file)).rejects.toThrow(IatiParseError);
      await expect(extractIatiMeta(file)).rejects.toThrow('Missing <iati-identifier>');
    });

    it('should throw IatiParseError for missing reporting-org', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activity>
          <iati-identifier>TEST-123</iati-identifier>
        </iati-activity>`;

      const file = createMockFile(xmlContent);
      
      await expect(extractIatiMeta(file)).rejects.toThrow(IatiParseError);
      await expect(extractIatiMeta(file)).rejects.toThrow('Missing <reporting-org>');
    });

    it('should throw IatiParseError for missing reporting-org ref', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activity>
          <iati-identifier>TEST-123</iati-identifier>
          <reporting-org>
            <narrative>Test Org</narrative>
          </reporting-org>
        </iati-activity>`;

      const file = createMockFile(xmlContent);
      
      await expect(extractIatiMeta(file)).rejects.toThrow(IatiParseError);
      await expect(extractIatiMeta(file)).rejects.toThrow('Missing reporting-org/@ref');
    });

    it('should handle large files by throwing appropriate error', async () => {
      // Create a mock file larger than 50MB
      const largeMockFile = {
        name: 'large.xml',
        size: 51 * 1024 * 1024, // 51MB
        type: 'application/xml',
        text: vi.fn()
      } as unknown as File;
      
      await expect(extractIatiMeta(largeMockFile)).rejects.toThrow('too large');
    });

    it('should handle invalid XML gracefully', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activity>
          <iati-identifier>TEST-123
          <reporting-org ref="TEST-ORG">
            <narrative>Unclosed tag
        </iati-activity>`;

      const file = createMockFile(xmlContent);
      
      await expect(extractIatiMeta(file)).rejects.toThrow(IatiParseError);
    });
  });

  describe('edge cases', () => {
    it('should handle activities with no last-updated-datetime', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activity>
          <iati-identifier>NO-DATE-123</iati-identifier>
          <reporting-org ref="NO-DATE-ORG">
            <narrative>No Date Org</narrative>
          </reporting-org>
        </iati-activity>`;

      const file = createMockFile(xmlContent);
      const result = await extractIatiMeta(file);

      expect(result.lastUpdated).toBeUndefined();
    });

    it('should handle reporting-org without narrative', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <iati-activity>
          <iati-identifier>NO-NARRATIVE-123</iati-identifier>
          <reporting-org ref="NO-NARRATIVE-ORG" />
        </iati-activity>`;

      const file = createMockFile(xmlContent);
      const result = await extractIatiMeta(file);

      expect(result.reportingOrgName).toBeUndefined();
    });
  });
});

describe('validateIatiId', () => {
  it('should validate correct IATI identifiers', () => {
    expect(validateIatiId('GB-GOV-1-123456')).toBe(true);
    expect(validateIatiId('US-USAID-12345')).toBe(true);
    expect(validateIatiId('NL-KVK-12345678')).toBe(true);
  });

  it('should reject invalid IATI identifiers', () => {
    expect(validateIatiId('')).toBe(false);
    expect(validateIatiId('<script>')).toBe(false);
    expect(validateIatiId('A'.repeat(256))).toBe(false);
  });
});

describe('validateOrgRef', () => {
  it('should validate correct organisation references', () => {
    expect(validateOrgRef('GB-GOV-1')).toBe(true);
    expect(validateOrgRef('US-USAID')).toBe(true);
    expect(validateOrgRef('NL-KVK-12345678')).toBe(true);
  });

  it('should reject invalid organisation references', () => {
    expect(validateOrgRef('')).toBe(false);
    expect(validateOrgRef('<script>')).toBe(false);
    expect(validateOrgRef('A'.repeat(101))).toBe(false);
  });
});