'use client';

import React from 'react';
import { DocumentsAndImagesTabInline } from '@/components/activities/DocumentsAndImagesTabInline';
import { IatiDocumentLink } from '@/lib/iatiDocumentLink';

export default function TestDocumentsPage() {
  const [documents, setDocuments] = React.useState<IatiDocumentLink[]>([]);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Documents & Images Test Page (Inline Editing)</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <DocumentsAndImagesTabInline
          documents={documents}
          onChange={setDocuments}
          activityId="test-activity"
          locale="en"
        />
      </div>
      
      {documents.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Current Documents ({documents.length})</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(documents, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
