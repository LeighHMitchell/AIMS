"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

export default function TestFeedbackDebugPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const checkDebugData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/debug/feedback-attachments');
      if (response.ok) {
        const data = await response.json();
        setDebugData(data);
        console.log('[Debug] Data received:', data);
      } else {
        const error = await response.json();
        toast.error(`Debug check failed: ${error.error}`);
      }
    } catch (error) {
      toast.error('Failed to check debug data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const submitTestFeedback = async () => {
    if (!selectedFile || !user?.id) {
      toast.error("Please select a file and ensure you're logged in");
      return;
    }

    setLoading(true);
    try {
      // First upload the file
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('userId', user.id);

      const uploadResponse = await apiFetch('/api/feedback/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'File upload failed');
      }

      const uploadData = await uploadResponse.json();
      console.log('[Test] File uploaded:', uploadData);

      // Then submit feedback with attachment
      const feedbackResponse = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          category: 'comment',
          subject: 'Test Feedback with Attachment',
          message: 'This is a test feedback to verify attachment functionality is working.',
          attachment_url: uploadData.url,
          attachment_filename: uploadData.filename,
          attachment_type: uploadData.type,
          attachment_size: uploadData.size,
        }),
      });

      if (feedbackResponse.ok) {
        toast.success("Test feedback submitted successfully!");
        // Refresh debug data
        setTimeout(checkDebugData, 1000);
      } else {
        const errorData = await feedbackResponse.json();
        throw new Error(errorData.error || 'Feedback submission failed');
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkDebugData();
    }
  }, [user?.id]);

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Feedback Attachment Debug Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user ? (
            <div className="text-center text-red-600">
              Please log in to test feedback attachments
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Debug Data Display */}
                <div>
                  <h3 className="font-medium mb-3">Current Database Status</h3>
                  <Button 
                    onClick={checkDebugData} 
                    disabled={loading}
                    className="mb-3"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Debug Data
                  </Button>
                  
                  {debugData && (
                    <div className="bg-gray-50 p-4 rounded-lg text-sm">
                      <h4 className="font-medium mb-2">Summary:</h4>
                      <ul className="space-y-1">
                        <li>• Attachment columns exist: {debugData.summary.hasAttachmentColumns ? '✅ Yes' : '❌ No'}</li>
                        <li>• Total feedback: {debugData.summary.totalFeedback}</li>
                        <li>• Feedback with attachments: {debugData.summary.feedbackWithAttachments}</li>
                      </ul>
                      
                      {debugData.feedbackWithAttachments.length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-medium mb-2">Sample Attachment Data:</h4>
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                            {JSON.stringify(debugData.feedbackWithAttachments[0], null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Test File Upload */}
                <div>
                  <h3 className="font-medium mb-3">Test New Feedback with Attachment</h3>
                  <div className="space-y-3">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.txt,.doc,.docx"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    
                    {selectedFile && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm">
                          <strong>Selected:</strong> {selectedFile.name} 
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    )}
                    
                    <Button
                      onClick={submitTestFeedback}
                      disabled={!selectedFile || loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Submit Test Feedback with Attachment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Raw Debug Data */}
              {debugData && (
                <div>
                  <h3 className="font-medium mb-3">Raw Debug Data</h3>
                  <details className="bg-gray-50 p-4 rounded-lg">
                    <summary className="cursor-pointer font-medium">Click to expand</summary>
                    <pre className="text-xs mt-2 overflow-auto">
                      {JSON.stringify(debugData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
