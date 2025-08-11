import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentsAndImagesTab } from './DocumentsAndImagesTab';
import { IatiDocumentLink, toIatiXml, toIatiJson } from '@/lib/iatiDocumentLink';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mock data demonstrating various document types
const mockDocuments: IatiDocumentLink[] = [
  {
    url: 'https://example.org/project-document.pdf',
    format: 'application/pdf',
    title: [
      { text: 'Climate Resilience Project Document', lang: 'en' },
      { text: 'Document de projet de résilience climatique', lang: 'fr' },
    ],
    description: [
      { text: 'Comprehensive project document outlining objectives, activities, and expected outcomes for the climate resilience initiative.', lang: 'en' },
    ],
    categoryCode: 'B02',
    languageCodes: ['en', 'fr'],
    documentDate: '2024-01-15',
    recipientCountries: ['KE', 'TZ'],
  },
  {
    url: 'https://example.org/images/community-workshop.jpg',
    format: 'image/jpeg',
    title: [
      { text: 'Community Workshop in Nairobi', lang: 'en' },
    ],
    description: [
      { text: 'Local community members participating in climate adaptation workshop, January 2024', lang: 'en' },
    ],
    categoryCode: 'D01',
    languageCodes: ['en'],
    documentDate: '2024-01-20',
    recipientCountries: ['KE'],
    isImage: true,
  },
  {
    url: 'https://example.org/reports/results-brief-q1-2024.docx',
    format: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    title: [
      { text: 'Q1 2024 Results Brief', lang: 'en' },
    ],
    description: [
      { text: 'Quarterly results summary highlighting key achievements and progress indicators', lang: 'en' },
    ],
    categoryCode: 'B03',
    languageCodes: ['en'],
    documentDate: '2024-04-05',
    recipientRegion: {
      code: '298',
      vocabulary: '1',
    },
  },
  {
    url: 'https://example.org/evaluations/midterm-evaluation.pdf',
    format: 'application/pdf',
    title: [
      { text: 'Midterm Evaluation Report', lang: 'en' },
    ],
    categoryCode: 'A07',
    languageCodes: ['en'],
    documentDate: '2024-06-30',
  },
  // Example with validation issues (bad MIME type)
  {
    url: 'https://example.org/invalid-document.xyz',
    format: 'application/invalid-mime-type', // This will fail validation
    title: [
      { text: 'Document with Invalid Format', lang: 'en' },
    ],
  },
];

export function ExampleActivityEditor() {
  const [documents, setDocuments] = React.useState<IatiDocumentLink[]>(mockDocuments);
  const [showXml, setShowXml] = React.useState(false);
  const [showJson, setShowJson] = React.useState(false);
  
  // Mock fetch head function for demonstration
  const mockFetchHead = async (url: string): Promise<{ format?: string; size?: number } | null> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock metadata
    if (url.includes('.pdf')) {
      return { format: 'application/pdf', size: 1024 * 1024 * 2.5 }; // 2.5 MB
    }
    if (url.includes('.jpg') || url.includes('.jpeg')) {
      return { format: 'image/jpeg', size: 1024 * 500 }; // 500 KB
    }
    if (url.includes('.docx')) {
      return { 
        format: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024 * 300, // 300 KB
      };
    }
    
    return null;
  };
  
  const generateFullXml = () => {
    return documents
      .filter(doc => {
        // Only include valid documents
        const { ok } = validateIatiDocument(doc);
        return ok;
      })
      .map(doc => toIatiXml(doc))
      .join('\n\n');
  };
  
  const generateFullJson = () => {
    return JSON.stringify(
      documents
        .filter(doc => {
          const { ok } = validateIatiDocument(doc);
          return ok;
        })
        .map(doc => toIatiJson(doc)),
      null,
      2
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Editor - Documents & Images Example</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            This example demonstrates the Documents & Images tab with various document types,
            including a PDF project document, an image with caption, a results brief, 
            an evaluation report, and an invalid document to showcase validation.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="documents">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="documents">Documents & Images</TabsTrigger>
              <TabsTrigger value="xml">IATI XML</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="mt-6">
              <DocumentsAndImagesTab
                documents={documents}
                onChange={setDocuments}
                fetchHead={mockFetchHead}
                locale="en"
              />
            </TabsContent>
            
            <TabsContent value="xml" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Generated IATI XML</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowXml(!showXml)}
                  >
                    {showXml ? 'Hide' : 'Show'} XML
                  </Button>
                </div>
                
                {showXml && (
                  <ScrollArea className="h-96 w-full rounded-md border">
                    <pre className="p-4 text-xs font-mono">
                      {generateFullXml()}
                    </pre>
                  </ScrollArea>
                )}
                
                <p className="text-sm text-gray-600">
                  Note: Only valid documents are included in the XML output.
                  Documents with validation errors are automatically excluded.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Generated JSON (API Format)</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowJson(!showJson)}
                  >
                    {showJson ? 'Hide' : 'Show'} JSON
                  </Button>
                </div>
                
                {showJson && (
                  <ScrollArea className="h-96 w-full rounded-md border">
                    <pre className="p-4 text-xs font-mono">
                      {generateFullJson()}
                    </pre>
                  </ScrollArea>
                )}
                
                <p className="text-sm text-gray-600">
                  This JSON format mirrors the structure expected by your API endpoints.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Features Demonstrated</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ IATI v2.03 compliant document-link implementation</li>
            <li>✓ Multi-language narratives for titles and descriptions</li>
            <li>✓ Document categorization with IATI Document Category codelist</li>
            <li>✓ Language selection (ISO 639-1)</li>
            <li>✓ Recipient country and region support</li>
            <li>✓ Real-time validation with helpful error messages</li>
            <li>✓ Image preview and caption support</li>
            <li>✓ Copy-to-clipboard for XML and JSON</li>
            <li>✓ Bulk import functionality</li>
            <li>✓ Search and filter capabilities</li>
            <li>✓ Drag-and-drop reordering</li>
            <li>✓ Responsive and accessible UI</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Missing import for validateIatiDocument
import { validateIatiDocument } from '@/lib/iatiDocumentLink';
