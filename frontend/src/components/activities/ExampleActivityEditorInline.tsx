import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentsAndImagesTabInline } from './DocumentsAndImagesTabInline';
import { IatiDocumentLink, toIatiXml, toIatiJson } from '@/lib/iatiDocumentLink';

// Mock data for demonstration
const mockDocuments: IatiDocumentLink[] = [
  {
    url: 'https://example.org/project-overview.pdf',
    format: 'application/pdf',
    title: [
      { text: 'Project Overview Document', lang: 'en' },
      { text: 'Documento de Visión General del Proyecto', lang: 'es' }
    ],
    description: [
      { text: 'Comprehensive overview of the project objectives, methodology, and expected outcomes.', lang: 'en' }
    ],
    categoryCode: 'A01',
    languageCodes: ['en', 'es'],
    documentDate: '2024-01-15',
    recipientCountries: ['KE', 'UG'],
  },
  {
    url: 'https://example.org/images/beneficiaries.jpg',
    format: 'image/jpeg',
    title: [
      { text: 'Project Beneficiaries', lang: 'en' }
    ],
    description: [
      { text: 'Photo showing direct beneficiaries of the water access project in rural Kenya.', lang: 'en' }
    ],
    categoryCode: 'A08',
    languageCodes: ['en'],
    documentDate: '2024-02-01',
    recipientCountries: ['KE'],
  },
  {
    url: 'https://example.org/reports/quarterly-report-q1.xlsx',
    format: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    title: [
      { text: 'Q1 Progress Report', lang: 'en' }
    ],
    description: [
      { text: 'Detailed quarterly progress report with financial data and key performance indicators.', lang: 'en' }
    ],
    categoryCode: 'A06',
    languageCodes: ['en'],
    documentDate: '2024-03-31',
    recipientCountries: ['KE', 'UG'],
  },
  {
    url: 'https://example.org/evaluation/external-evaluation.pdf',
    format: 'application/pdf',
    title: [
      { text: 'External Evaluation Report', lang: 'en' }
    ],
    description: [
      { text: 'Independent evaluation conducted by third-party consultant assessing project impact and effectiveness.', lang: 'en' }
    ],
    categoryCode: 'A07',
    languageCodes: ['en'],
    documentDate: '2024-03-15',
    recipientCountries: ['KE', 'UG'],
  },
  {
    url: 'https://invalid-url-for-demo',
    format: '',
    title: [
      { text: '', lang: 'en' }
    ],
    description: [],
    languageCodes: [],
    recipientCountries: [],
  },
];

// Mock function to simulate HEAD requests
const mockFetchHead = async (url: string): Promise<{ format?: string; size?: number } | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (url.includes('pdf')) {
        resolve({ format: 'application/pdf', size: 2480000 });
      } else if (url.includes('jpg') || url.includes('jpeg')) {
        resolve({ format: 'image/jpeg', size: 1024000 });
      } else if (url.includes('xlsx')) {
        resolve({ format: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 512000 });
      } else {
        resolve(null);
      }
    }, 500);
  });
};

export function ExampleActivityEditorInline() {
  const [documents, setDocuments] = React.useState<IatiDocumentLink[]>(mockDocuments);

  const generateFullXml = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities>
  <iati-activity>
    <!-- Document links -->
${documents
  .filter(doc => {
    try {
      return doc.url && doc.title[0]?.text;
    } catch {
      return false;
    }
  })
  .map(doc => {
    try {
      return toIatiXml(doc);
    } catch {
      return '<!-- Invalid document -->';
    }
  })
  .map(xml => xml.split('\n').map(line => `    ${line}`).join('\n'))
  .join('\n')}
  </iati-activity>
</iati-activities>`;
  };

  const generateFullJson = () => {
    return JSON.stringify(
      {
        "iati-activity": {
          "document-link": documents
            .filter(doc => {
              try {
                return doc.url && doc.title[0]?.text;
              } catch {
                return false;
              }
            })
            .map(doc => {
              try {
                return toIatiJson(doc);
              } catch {
                return null;
              }
            })
            .filter(Boolean)
        }
      },
      null,
      2
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity Editor - Inline Documents & Images</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            This example demonstrates the new inline editing Documents & Images tab. 
            You can edit document metadata directly on each card without opening a modal. 
            Click "Edit" on any document card to see the inline editing interface, 
            or expand cards to view more details.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="documents">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="documents">Documents & Images (Inline)</TabsTrigger>
              <TabsTrigger value="xml">IATI XML</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="mt-6">
              <DocumentsAndImagesTabInline
                documents={documents}
                onChange={setDocuments}
                activityId="demo-activity-123"
                fetchHead={mockFetchHead}
                locale="en"
              />
            </TabsContent>
            
            <TabsContent value="xml" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Generated IATI XML</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(generateFullXml())}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Copy XML
                  </button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  <code>{generateFullXml()}</code>
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Generated JSON</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(generateFullJson())}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  <code>{generateFullJson()}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Key Features of Inline Editing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">✨ User Experience</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Edit directly on each card</li>
                <li>• No modal interruptions</li>
                <li>• Expandable details view</li>
                <li>• Real-time validation feedback</li>
                <li>• Save/cancel for each document</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚀 Functionality</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• All IATI document fields supported</li>
                <li>• Multi-language titles & descriptions</li>
                <li>• File upload with progress</li>
                <li>• Drag & drop reordering</li>
                <li>• Search and filtering</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 