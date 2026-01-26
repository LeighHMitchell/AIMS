'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

interface ParseResult {
  activities: any[];
  organizations: any[];
  transactions: any[];
  unmapped: {
    activities: any[];
    organizations: any[];
    transactions: any[];
  };
  errors: string[];
}

interface ImportResult {
  success: boolean;
  results: {
    organizationsCreated: number;
    organizationsUpdated: number;
    activitiesCreated: number;
    activitiesUpdated: number;
    transactionsCreated: number;
    errors: string[];
  };
  verification?: {
    totalOrganizations: number;
    totalActivities: number;
    totalTransactions: number;
    transactionsByType?: any[];
    recentTransactions?: any[];
  };
}

export default function IATIImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseResult(null);
      setImportResult(null);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch('/api/iati/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Parse failed: ${response.statusText}`);
      }

      const result = await response.json();
      setParseResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/iati/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activities: parseResult.activities,
          organizations: parseResult.organizations,
          transactions: parseResult.transactions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">IATI Data Import</h1>

        {/* File Upload Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Upload IATI File</h2>
          
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">IATI XML files only</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xml"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {file && (
            <div className="mt-4">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">{file.name}</span>
                <button
                  onClick={handleParse}
                  disabled={isUploading}
                  className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? 'Processing...' : 'Parse File'}
                </button>
              </div>
              
              {/* Debug button for development */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={async () => {
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const response = await apiFetch('/api/iati/debug', {
                        method: 'POST',
                        body: formData,
                      });
                      const result = await response.json();
                      console.log('Debug result:', result);
                      alert(`Debug: ${result.recommendation}\n\nCheck console for details.`);
                    } catch (err) {
                      console.error('Debug error:', err);
                    }
                  }}
                  className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Debug Transaction Structure
                </button>
              )}
            </div>
          )}
        </div>

        {/* Parse Results */}
        {parseResult && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Review Parsed Data</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-blue-600 font-medium">Activities</p>
                <p className="text-2xl font-bold text-blue-900">{parseResult.activities.length}</p>
                {parseResult.activities.filter(a => a.matched).length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {parseResult.activities.filter(a => a.matched).length} existing
                  </p>
                )}
              </div>
              
              <div className="bg-green-50 p-4 rounded">
                <p className="text-sm text-green-600 font-medium">Organizations</p>
                <p className="text-2xl font-bold text-green-900">{parseResult.organizations.length}</p>
                {parseResult.organizations.filter(o => o.matched).length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {parseResult.organizations.filter(o => o.matched).length} existing
                  </p>
                )}
              </div>
              
              <div className="bg-purple-50 p-4 rounded">
                <p className="text-sm text-purple-600 font-medium">Transactions</p>
                <p className="text-2xl font-bold text-purple-900">{parseResult.transactions.length}</p>
                {parseResult.transactions.length > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    Total: ${parseResult.transactions.reduce((sum, t) => sum + t.value, 0).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Details */}
            {parseResult.activities.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Activities:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {parseResult.activities.slice(0, 5).map((activity, idx) => (
                    <li key={idx} className="flex items-center">
                      {activity.matched ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      {activity.title}
                    </li>
                  ))}
                  {parseResult.activities.length > 5 && (
                    <li className="text-gray-400">... and {parseResult.activities.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {parseResult.errors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 rounded">
                <h3 className="font-medium text-red-800 mb-2">Errors:</h3>
                <ul className="text-sm text-red-600 space-y-1">
                  {parseResult.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={isUploading || parseResult.activities.length === 0}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Import Data
            </button>
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Import Results</h2>
            
            {importResult.success ? (
              <div className="space-y-2">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Import completed successfully!</span>
                </div>
                
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  {importResult.results.organizationsCreated > 0 && (
                    <li>Created {importResult.results.organizationsCreated} organizations</li>
                  )}
                  {importResult.results.organizationsUpdated > 0 && (
                    <li>Updated {importResult.results.organizationsUpdated} organizations</li>
                  )}
                  {importResult.results.activitiesCreated > 0 && (
                    <li>Created {importResult.results.activitiesCreated} activities</li>
                  )}
                  {importResult.results.activitiesUpdated > 0 && (
                    <li>Updated {importResult.results.activitiesUpdated} activities</li>
                  )}
                  {importResult.results.transactionsCreated > 0 && (
                    <li>Created {importResult.results.transactionsCreated} transactions</li>
                  )}
                </ul>

                {importResult.results.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded">
                    <h3 className="font-medium text-yellow-800 mb-2">Import Warnings:</h3>
                    <ul className="text-sm text-yellow-600 space-y-1">
                      {importResult.results.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {importResult.verification && (
                  <div className="mt-4 p-4 bg-blue-50 rounded">
                    <h3 className="font-medium text-blue-800 mb-2">Database Verification:</h3>
                    <ul className="text-sm text-blue-600 space-y-1">
                      <li>Total Organizations in DB: {importResult.verification.totalOrganizations || 0}</li>
                      <li>Total Activities in DB: {importResult.verification.totalActivities || 0}</li>
                      <li>Total Transactions in DB: {importResult.verification.totalTransactions || 0}</li>
                    </ul>
                    
                    {importResult.verification.recentTransactions && importResult.verification.recentTransactions.length > 0 && (
                      <div className="mt-3">
                        <h4 className="font-medium text-blue-800 mb-1">Recent Transactions:</h4>
                        <ul className="text-xs text-blue-600 space-y-1">
                          {importResult.verification.recentTransactions.map((trans: any, idx: number) => (
                            <li key={idx}>
                              {trans.transaction_type}: {trans.currency} {trans.value?.toLocaleString()} 
                              {trans.created_at && ` (${new Date(trans.created_at).toLocaleDateString()})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600">Import failed. Please check the errors above.</div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 