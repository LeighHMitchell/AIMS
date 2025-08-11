import {
  IatiDocumentLink,
  inferMimeFromUrl,
  isImageMime,
  getFormatLabel,
  validateIatiDocument,
  toIatiXml,
  toIatiJson,
  EXT_TO_MIME,
} from '../iatiDocumentLink';

describe('iatiDocumentLink utilities', () => {
  describe('inferMimeFromUrl', () => {
    it('should infer MIME type from common file extensions', () => {
      expect(inferMimeFromUrl('https://example.org/document.pdf')).toBe('application/pdf');
      expect(inferMimeFromUrl('https://example.org/report.docx')).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(inferMimeFromUrl('https://example.org/image.jpg')).toBe('image/jpeg');
      expect(inferMimeFromUrl('https://example.org/data.csv')).toBe('text/csv');
    });
    
    it('should handle uppercase extensions', () => {
      expect(inferMimeFromUrl('https://example.org/IMAGE.PNG')).toBe('image/png');
    });
    
    it('should return null for unknown extensions', () => {
      expect(inferMimeFromUrl('https://example.org/file.xyz')).toBeNull();
    });
    
    it('should return null for invalid URLs', () => {
      expect(inferMimeFromUrl('not-a-url')).toBeNull();
    });
    
    it('should handle URLs with query parameters', () => {
      expect(inferMimeFromUrl('https://example.org/doc.pdf?version=2')).toBe('application/pdf');
    });
  });
  
  describe('isImageMime', () => {
    it('should identify image MIME types', () => {
      expect(isImageMime('image/jpeg')).toBe(true);
      expect(isImageMime('image/png')).toBe(true);
      expect(isImageMime('image/gif')).toBe(true);
      expect(isImageMime('image/svg+xml')).toBe(true);
    });
    
    it('should return false for non-image MIME types', () => {
      expect(isImageMime('application/pdf')).toBe(false);
      expect(isImageMime('text/plain')).toBe(false);
      expect(isImageMime('video/mp4')).toBe(false);
    });
  });
  
  describe('getFormatLabel', () => {
    it('should return labels for known MIME types', () => {
      expect(getFormatLabel('application/pdf')).toBe('PDF');
      expect(getFormatLabel('image/jpeg')).toBe('JPEG');
      expect(getFormatLabel('text/csv')).toBe('CSV');
    });
    
    it('should return "Unknown" for unrecognized MIME types', () => {
      expect(getFormatLabel('application/x-custom')).toBe('Unknown');
    });
  });
  
  describe('validateIatiDocument', () => {
    const validDoc: IatiDocumentLink = {
      url: 'https://example.org/doc.pdf',
      format: 'application/pdf',
      title: [{ text: 'Test Document', lang: 'en' }],
    };
    
    it('should validate a minimal valid document', () => {
      const result = validateIatiDocument(validDoc);
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
    
    it('should validate a complete document', () => {
      const completeDoc: IatiDocumentLink = {
        ...validDoc,
        description: [{ text: 'Description', lang: 'en' }],
        categoryCode: 'A01',
        languageCodes: ['en', 'fr'],
        documentDate: '2024-01-15',
        recipientCountries: ['KE', 'TZ'],
        recipientRegion: {
          code: '298',
          vocabulary: '1',
        },
      };
      
      const result = validateIatiDocument(completeDoc);
      expect(result.ok).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
    
    it('should reject non-HTTPS URLs', () => {
      const doc = { ...validDoc, url: 'http://example.org/doc.pdf' };
      const result = validateIatiDocument(doc);
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: 'url',
          message: 'URL must use HTTPS',
        })
      );
    });
    
    it('should reject invalid URLs', () => {
      const doc = { ...validDoc, url: 'not-a-url' };
      const result = validateIatiDocument(doc);
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: 'url',
          message: 'Must be a valid URL',
        })
      );
    });
    
    it('should reject invalid MIME types', () => {
      const doc = { ...validDoc, format: 'invalid/mime' };
      const result = validateIatiDocument(doc);
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: 'format',
          message: 'Format must be a valid IANA MIME type from IATI FileFormat codelist',
        })
      );
    });
    
    it('should require at least one title', () => {
      const doc = { ...validDoc, title: [] };
      const result = validateIatiDocument(doc);
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: 'title',
          message: 'At least one title is required',
        })
      );
    });
    
    it('should validate language codes', () => {
      const doc = { ...validDoc, languageCodes: ['en', 'invalid'] };
      const result = validateIatiDocument(doc);
      expect(result.ok).toBe(false);
    });
    
    it('should validate date format', () => {
      const doc = { ...validDoc, documentDate: '2024/01/15' };
      const result = validateIatiDocument(doc);
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          path: 'documentDate',
          message: 'Date must be in YYYY-MM-DD format',
        })
      );
    });
    
    it('should validate recipient region vocabulary 99 requires URI', () => {
      const doc = {
        ...validDoc,
        recipientRegion: {
          code: 'TEST',
          vocabulary: '99',
        },
      };
      const result = validateIatiDocument(doc);
      expect(result.ok).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          message: 'vocabularyUri is required when vocabulary is 99',
        })
      );
    });
  });
  
  describe('toIatiXml', () => {
    it('should generate minimal XML', () => {
      const doc: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [{ text: 'Test Document', lang: 'en' }],
      };
      
      const xml = toIatiXml(doc);
      expect(xml).toContain('<document-link url="https://example.org/doc.pdf" format="application/pdf">');
      expect(xml).toContain('<title>');
      expect(xml).toContain('<narrative xml:lang="en">Test Document</narrative>');
      expect(xml).toContain('</title>');
      expect(xml).toContain('</document-link>');
    });
    
    it('should include all optional fields', () => {
      const doc: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [
          { text: 'Test Document', lang: 'en' },
          { text: 'Document de test', lang: 'fr' },
        ],
        description: [{ text: 'A test document', lang: 'en' }],
        categoryCode: 'A01',
        languageCodes: ['en', 'fr'],
        documentDate: '2024-01-15',
        recipientCountries: ['KE', 'TZ'],
        recipientRegion: {
          code: '298',
          vocabulary: '2',
          vocabularyUri: 'https://example.org/vocab',
        },
      };
      
      const xml = toIatiXml(doc);
      
      // Check multiple narratives
      expect(xml).toContain('<narrative xml:lang="en">Test Document</narrative>');
      expect(xml).toContain('<narrative xml:lang="fr">Document de test</narrative>');
      
      // Check description
      expect(xml).toContain('<description>');
      expect(xml).toContain('<narrative xml:lang="en">A test document</narrative>');
      
      // Check other elements
      expect(xml).toContain('<category code="A01"/>');
      expect(xml).toContain('<language code="en"/>');
      expect(xml).toContain('<language code="fr"/>');
      expect(xml).toContain('<document-date iso-date="2024-01-15"/>');
      expect(xml).toContain('<recipient-country code="KE"/>');
      expect(xml).toContain('<recipient-country code="TZ"/>');
      expect(xml).toContain(
        '<recipient-region code="298" vocabulary="2" vocabulary-uri="https://example.org/vocab"/>'
      );
    });
    
    it('should escape XML special characters', () => {
      const doc: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf?param=1&other=2',
        format: 'application/pdf',
        title: [{ text: 'Title with <special> & "quoted" \'chars\'', lang: 'en' }],
      };
      
      const xml = toIatiXml(doc);
      expect(xml).toContain('url="https://example.org/doc.pdf?param=1&amp;other=2"');
      expect(xml).toContain('Title with &lt;special&gt; &amp; &quot;quoted&quot; &apos;chars&apos;');
    });
    
    it('should maintain proper element order', () => {
      const doc: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [{ text: 'Test', lang: 'en' }],
        description: [{ text: 'Desc', lang: 'en' }],
        categoryCode: 'A01',
        languageCodes: ['en'],
        documentDate: '2024-01-15',
      };
      
      const xml = toIatiXml(doc);
      const lines = xml.split('\n');
      
      // Check order
      const titleIndex = lines.findIndex(l => l.includes('<title>'));
      const descIndex = lines.findIndex(l => l.includes('<description>'));
      const categoryIndex = lines.findIndex(l => l.includes('<category'));
      const languageIndex = lines.findIndex(l => l.includes('<language'));
      const dateIndex = lines.findIndex(l => l.includes('<document-date'));
      
      expect(titleIndex).toBeLessThan(descIndex);
      expect(descIndex).toBeLessThan(categoryIndex);
      expect(categoryIndex).toBeLessThan(languageIndex);
      expect(languageIndex).toBeLessThan(dateIndex);
    });
  });
  
  describe('toIatiJson', () => {
    it('should generate minimal JSON', () => {
      const doc: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [{ text: 'Test Document', lang: 'en' }],
      };
      
      const json = toIatiJson(doc);
      expect(json).toEqual({
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [
          {
            narrative: {
              text: 'Test Document',
              lang: 'en',
            },
          },
        ],
      });
    });
    
    it('should include all optional fields', () => {
      const doc: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [{ text: 'Test Document', lang: 'en' }],
        description: [{ text: 'A test document', lang: 'en' }],
        categoryCode: 'A01',
        languageCodes: ['en', 'fr'],
        documentDate: '2024-01-15',
        recipientCountries: ['KE', 'TZ'],
        recipientRegion: {
          code: '298',
          vocabulary: '1',
        },
      };
      
      const json = toIatiJson(doc);
      
      expect(json).toHaveProperty('description');
      expect(json).toHaveProperty('category', { code: 'A01' });
      expect(json).toHaveProperty('language', [{ code: 'en' }, { code: 'fr' }]);
      expect(json).toHaveProperty('documentDate', { isoDate: '2024-01-15' });
      expect(json).toHaveProperty('recipientCountry', [{ code: 'KE' }, { code: 'TZ' }]);
      expect(json).toHaveProperty('recipientRegion', { code: '298', vocabulary: '1' });
    });
    
    it('should include vocabularyUri when present', () => {
      const doc: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [{ text: 'Test', lang: 'en' }],
        recipientRegion: {
          code: '298',
          vocabulary: '99',
          vocabularyUri: 'https://example.org/vocab',
        },
      };
      
      const json = toIatiJson(doc) as any;
      expect(json.recipientRegion).toEqual({
        code: '298',
        vocabulary: '99',
        vocabularyUri: 'https://example.org/vocab',
      });
    });
  });
  
  describe('Edge cases and integration', () => {
    it('should handle documents with only required fields', () => {
      const minimal: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [{ text: 'Doc', lang: 'en' }],
      };
      
      const validation = validateIatiDocument(minimal);
      expect(validation.ok).toBe(true);
      
      const xml = toIatiXml(minimal);
      expect(xml).toContain('document-link');
      expect(xml).not.toContain('description');
      expect(xml).not.toContain('category');
      
      const json = toIatiJson(minimal);
      expect(Object.keys(json)).toEqual(['url', 'format', 'title']);
    });
    
    it('should handle multiple languages correctly', () => {
      const multiLang: IatiDocumentLink = {
        url: 'https://example.org/doc.pdf',
        format: 'application/pdf',
        title: [
          { text: 'English Title', lang: 'en' },
          { text: 'Titre Français', lang: 'fr' },
          { text: 'Título Español', lang: 'es' },
        ],
      };
      
      const xml = toIatiXml(multiLang);
      const narrativeCount = (xml.match(/<narrative/g) || []).length;
      expect(narrativeCount).toBe(3);
    });
  });
});
