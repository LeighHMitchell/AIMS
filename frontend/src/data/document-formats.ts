// Common IATI Document Format Codes (MIME types)
// Based on IANA Media Types registry

export interface DocumentFormatOption {
  code: string;
  name: string;
  extension?: string;
}

export const DOCUMENT_FORMATS: DocumentFormatOption[] = [
  // PDF
  {
    code: 'application/pdf',
    name: 'PDF Document',
    extension: '.pdf'
  },
  // Word Documents
  {
    code: 'application/msword',
    name: 'Microsoft Word (DOC)',
    extension: '.doc'
  },
  {
    code: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    name: 'Microsoft Word (DOCX)',
    extension: '.docx'
  },
  {
    code: 'application/vnd.oasis.opendocument.text',
    name: 'OpenDocument Text',
    extension: '.odt'
  },
  // Excel Spreadsheets
  {
    code: 'application/vnd.ms-excel',
    name: 'Microsoft Excel (XLS)',
    extension: '.xls'
  },
  {
    code: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    name: 'Microsoft Excel (XLSX)',
    extension: '.xlsx'
  },
  {
    code: 'application/vnd.oasis.opendocument.spreadsheet',
    name: 'OpenDocument Spreadsheet',
    extension: '.ods'
  },
  {
    code: 'text/csv',
    name: 'CSV File',
    extension: '.csv'
  },
  // PowerPoint Presentations
  {
    code: 'application/vnd.ms-powerpoint',
    name: 'Microsoft PowerPoint (PPT)',
    extension: '.ppt'
  },
  {
    code: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    name: 'Microsoft PowerPoint (PPTX)',
    extension: '.pptx'
  },
  {
    code: 'application/vnd.oasis.opendocument.presentation',
    name: 'OpenDocument Presentation',
    extension: '.odp'
  },
  // Images
  {
    code: 'image/jpeg',
    name: 'JPEG Image',
    extension: '.jpg'
  },
  {
    code: 'image/png',
    name: 'PNG Image',
    extension: '.png'
  },
  {
    code: 'image/gif',
    name: 'GIF Image',
    extension: '.gif'
  },
  // Text & HTML
  {
    code: 'text/plain',
    name: 'Plain Text',
    extension: '.txt'
  },
  {
    code: 'text/html',
    name: 'HTML Document',
    extension: '.html'
  },
  {
    code: 'application/xhtml+xml',
    name: 'XHTML Document',
    extension: '.xhtml'
  },
  // Archives
  {
    code: 'application/zip',
    name: 'ZIP Archive',
    extension: '.zip'
  },
  // Other
  {
    code: 'application/xml',
    name: 'XML Document',
    extension: '.xml'
  },
  {
    code: 'application/json',
    name: 'JSON Document',
    extension: '.json'
  }
];

// Helper to get format by code
export const getFormatByCode = (code: string): DocumentFormatOption | undefined => {
  return DOCUMENT_FORMATS.find(format => format.code === code);
};

// Helper to get format by extension
export const getFormatByExtension = (extension: string): DocumentFormatOption | undefined => {
  const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
  return DOCUMENT_FORMATS.find(format => format.extension === normalizedExt);
};

// Get all formats sorted alphabetically by name
export const getSortedFormats = (): DocumentFormatOption[] => {
  return [...DOCUMENT_FORMATS].sort((a, b) => a.name.localeCompare(b.name));
};

