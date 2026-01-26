"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

export default function TestFeedbackUploadPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const testUpload = async () => {
    if (!selectedFile || !user?.id) {
      toast.error("Please select a file and ensure you're logged in");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      console.log('[Test Upload] Starting upload test for:', selectedFile.name);
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('userId', user.id);

      const uploadResponse = await apiFetch('/api/feedback/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      console.log('[Test Upload] Upload response status:', uploadResponse.status);

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log('[Test Upload] Upload successful:', result);
        setUploadResult(result);
        toast.success("File uploaded successfully!");
      } else {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown upload error' }));
        console.error('[Test Upload] Upload failed:', errorData);
        setUploadError(`Upload failed: ${errorData.error || 'Unknown error'}`);
        toast.error(`Upload failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[Test Upload] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setUploadError(`Error: ${errorMessage}`);
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Test Feedback File Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user ? (
            <div className="text-center text-red-600">
              Please log in to test file upload
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select a file to test upload:
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.txt,.doc,.docx"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {selectedFile && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Selected File:</h3>
                  <div className="text-sm text-gray-600">
                    <p><strong>Name:</strong> {selectedFile.name}</p>
                    <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Type:</strong> {selectedFile.type}</p>
                  </div>
                </div>
              )}

              <Button
                onClick={testUpload}
                disabled={!selectedFile || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Testing Upload...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Test Upload
                  </>
                )}
              </Button>

              {uploadResult && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-800">Upload Successful!</h3>
                  </div>
                  <div className="text-sm text-green-700">
                    <p><strong>URL:</strong> <a href={uploadResult.url} target="_blank" rel="noopener noreferrer" className="underline">{uploadResult.url}</a></p>
                    <p><strong>Filename:</strong> {uploadResult.filename}</p>
                    <p><strong>Type:</strong> {uploadResult.type}</p>
                    <p><strong>Size:</strong> {uploadResult.size} bytes</p>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-medium text-red-800">Upload Failed</h3>
                  </div>
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>User Email:</strong> {user.email}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
