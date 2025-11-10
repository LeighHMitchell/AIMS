'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalPublisherModal } from '@/components/import/ExternalPublisherModal';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle } from 'lucide-react';
// Mock strings for demo - in production these would come from i18n system
const iatiImportStrings = {
  'toast.reference': 'Linked as reference. Read-only and excluded from totals.',
  'toast.fork': 'Fork created. Assign your IATI Activity ID before publishing.',
  'toast.merge': 'Linked to existing activity. No duplicate created.'
};

// Mock user data for demonstration
const MOCK_USER = {
  id: 'demo-user-123',
  orgName: 'Demo Development Agency',
  publisherRefs: ['GB-GOV-1', 'DEMO-ORG']
};

export default function IatiImportDemoPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an XML file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', MOCK_USER.id);

      const response = await fetch('/api/iati/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      if (data.status === 'owned') {
        // Direct import - reporting org matches user's publisher refs
        setResult({
          type: 'owned',
          message: 'Activity imported successfully as owned',
          activityId: data.createdId,
          meta: data.meta
        });
        toast.success('Activity imported successfully');
      } else if (data.status === 'external') {
        // External publisher detected - show modal
        setModalData({
          meta: data.meta,
          userOrgName: data.userOrgName || MOCK_USER.orgName,
          userPublisherRefs: data.userPublisherRefs || MOCK_USER.publisherRefs,
          existingActivity: data.existingActivity
        });
        setModalOpen(true);
      }

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      toast.error('Upload failed', {
        description: errorMessage
      });
    } finally {
      setUploading(false);
    }
  };

  const handleModalChoice = async (choice: 'reference' | 'fork' | 'merge', targetActivityId?: string) => {
    if (!modalData) return;

    try {
      let endpoint = '';
      let payload: any = {
        meta: modalData.meta,
        userId: MOCK_USER.id
      };

      switch (choice) {
        case 'reference':
          endpoint = '/api/iati/reference';
          break;
        case 'fork':
          endpoint = '/api/iati/fork';
          break;
        case 'merge':
          endpoint = '/api/iati/merge';
          payload.targetActivityId = targetActivityId;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${choice} activity`);
      }

      setModalOpen(false);
      setResult({
        type: choice,
        message: data.message || getSuccessMessage(choice),
        activityId: data.id,
        activity: data.activity
      });

      toast.success(getToastMessage(choice));

    } catch (err) {
      console.error(`${choice} error:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to ${choice} activity`;
      toast.error(`${choice.charAt(0).toUpperCase() + choice.slice(1)} failed`, {
        description: errorMessage
      });
    }
  };

  const getSuccessMessage = (choice: string) => {
    switch (choice) {
      case 'reference':
        return 'External activity linked as read-only reference';
      case 'fork':
        return 'Activity forked as local draft for editing';
      case 'merge':
        return 'External activity linked to existing local activity';
      default:
        return 'Operation completed';
    }
  };

  const getToastMessage = (choice: string) => {
    switch (choice) {
      case 'reference':
        return iatiImportStrings['toast.reference'];
      case 'fork':
        return iatiImportStrings['toast.fork'];
      case 'merge':
        return iatiImportStrings['toast.merge'];
      default:
        return 'Operation completed';
    }
  };

  const resetDemo = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setModalData(null);
    setModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">IATI External Publisher Import Demo</h1>
        <p className="text-gray-600">
          Demonstration of the external publisher detection and import modal system
        </p>
      </div>

      {/* Mock User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Mock User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Organisation:</strong> {MOCK_USER.orgName}
            </div>
            <div>
              <strong>Publisher IDs:</strong> {MOCK_USER.publisherRefs.join(', ')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload IATI XML File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="xmlFile">Select XML File</Label>
            <Input
              id="xmlFile"
              type="file"
              accept=".xml,application/xml,text/xml"
              onChange={handleFileChange}
              className="mt-1"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? 'Processing...' : 'Upload and Analyse'}
          </Button>

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Expected behavior:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>If reporting-org matches {MOCK_USER.publisherRefs.join(' or ')}: Direct import as owned activity</li>
              <li>If reporting-org is different: External publisher modal opens with 3 options</li>
              <li>Modal includes tooltips, validation, and contextual help</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Import Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-medium text-green-800">{result.message}</p>
              <div className="mt-2 text-sm text-green-700 space-y-1">
                <p><strong>Type:</strong> {result.type}</p>
                <p><strong>Activity ID:</strong> {result.activityId}</p>
                {result.activity && (
                  <>
                    {result.activity.title && <p><strong>Title:</strong> {result.activity.title}</p>}
                    {result.activity.iatiId && <p><strong>IATI ID:</strong> {result.activity.iatiId}</p>}
                  </>
                )}
              </div>
            </div>

            <Button onClick={resetDemo} variant="outline" className="w-full">
              Try Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Test Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">To test external publisher detection:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create or find an IATI XML file with a reporting-org/@ref that does NOT match '{MOCK_USER.publisherRefs.join("' or '")}'</li>
              <li>Upload the file using the form above</li>
              <li>The external publisher modal should appear with three options</li>
              <li>Test each option to see different import behaviors</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-2">To test owned import:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create an IATI XML file with reporting-org/@ref="{MOCK_USER.publisherRefs[0]}" or "{MOCK_USER.publisherRefs[1]}"</li>
              <li>Upload the file - it should import directly without showing the modal</li>
            </ol>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-blue-800">
              <strong>Note:</strong> This is a demonstration page. In production, user data would come from authentication context,
              and the import would integrate with the main application flow.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* External Publisher Modal */}
      {modalData && (
        <ExternalPublisherModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          meta={modalData.meta}
          userOrgName={modalData.userOrgName}
          userPublisherRefs={modalData.userPublisherRefs}
          userRole="super_user"
          userId={MOCK_USER.id}
          xmlContent={undefined}
          onChoose={handleModalChoice}
          existingActivity={modalData.existingActivity}
        />
      )}
    </div>
  );
}