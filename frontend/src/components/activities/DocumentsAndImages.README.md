# Documents & Images Component Documentation

## Overview
The Documents & Images component provides a comprehensive IATI v2.03 compliant interface for managing document links within the Activity Editor.

## Key Features
- ✅ IATI v2.03 compliant document-link implementation
- ✅ Multi-language support for titles and descriptions
- ✅ Document categorization with IATI Document Category codelist
- ✅ Real-time validation with helpful error messages
- ✅ Image preview and caption support
- ✅ Copy-to-clipboard for XML and JSON
- ✅ Bulk import functionality
- ✅ Search and filter capabilities
- ✅ Drag-and-drop reordering

## Usage

### Basic Implementation
```tsx
import { DocumentsAndImagesTab } from '@/components/activities/DocumentsAndImagesTab';
import { IatiDocumentLink } from '@/lib/iatiDocumentLink';

function MyActivityEditor() {
  const [documents, setDocuments] = useState<IatiDocumentLink[]>([]);
  
  return (
    <DocumentsAndImagesTab
      documents={documents}
      onChange={setDocuments}
      locale="en"
    />
  );
}
```

### With Optional Features
```tsx
<DocumentsAndImagesTab
  documents={documents}
  onChange={setDocuments}
  locale="en"
  fetchHead={async (url) => {
    // Optional: Fetch HEAD to get file metadata
    const response = await fetch(url, { method: 'HEAD' });
    return {
      format: response.headers.get('content-type') || undefined,
      size: parseInt(response.headers.get('content-length') || '0', 10)
    };
  }}
/>
```

## Components

### DocumentsAndImagesTab
Main container component that orchestrates the entire documents interface.

Props:
- `documents`: Array of IatiDocumentLink objects
- `onChange`: Callback when documents are added/edited/deleted
- `locale`: Default language code (ISO 639-1)
- `fetchHead`: Optional function to fetch URL metadata
- `customCategories`: Optional custom document categories
- `customFormats`: Optional custom MIME type mappings
- `customLanguages`: Optional custom language list

### DocumentCard
Presentational component for displaying individual document links.

Features:
- File type icon or image preview
- Title and description display
- Format, category, language, and date badges
- Quick actions: Edit, Copy XML/JSON, Open, Delete
- Validation status indicator

### DocumentForm
Modal form for creating/editing document links.

Sections:
- Link Information: URL and MIME type
- Metadata: Titles, descriptions, category, languages, date
- Geography: Recipient countries and regions

## Data Types

### IatiDocumentLink
```typescript
interface IatiDocumentLink {
  url: string;                      // Required, must be HTTPS
  format: string;                   // Required, IANA MIME type
  title: Narrative[];               // Required, at least one
  description?: Narrative[];        // Optional
  categoryCode?: string;            // Optional, IATI category
  languageCodes?: string[];         // Optional, ISO 639-1
  documentDate?: string;            // Optional, YYYY-MM-DD
  recipientCountries?: string[];    // Optional, ISO 3166-1 alpha-2
  recipientRegion?: {               // Optional
    code: string;
    vocabulary: string;
    vocabularyUri?: string;
  };
  isImage?: boolean;                // Derived from format
}

interface Narrative {
  text: string;
  lang: string;  // ISO 639-1
}
```

## IATI XML Output
Each document generates compliant IATI XML:
```xml
<document-link url="https://..." format="application/pdf">
  <title>
    <narrative xml:lang="en">Document Title</narrative>
  </title>
  <description>
    <narrative xml:lang="en">Document description</narrative>
  </description>
  <category code="A01"/>
  <language code="en"/>
  <document-date iso-date="2024-01-15"/>
  <recipient-country code="KE"/>
</document-link>
```

## Testing
A test page is available at `/test-documents` to verify functionality:
```bash
npm run dev
# Navigate to http://localhost:3000/test-documents
```

## Error Handling
- Validation only shows after user interaction
- Graceful degradation for network errors
- Clear error messages aligned with IATI requirements
- No runtime crashes from validation errors

## Integration Notes
1. The component uses `sonner` for toast notifications
2. Requires `shadcn/ui` components (Button, Card, Dialog, etc.)
3. Zod is used for validation schemas
4. Date formatting uses `date-fns`

## Known Issues & Solutions
- **Initial validation errors**: Fixed by only showing validation after user interaction
- **Toast import error**: Use `import { toast } from 'sonner'` not custom useToast
- **Zod error handling**: Use `zodError.issues` not `zodError.errors`
