'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import SectorAllocationForm from '@/components/activities/SectorAllocationForm';
import { SectorAllocation, SectorValidation } from '@/types/sector';

export default function ActivitySectorsPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params?.id as string;
  
  const [allocations, setAllocations] = useState<SectorAllocation[]>([]);
  const [validation, setValidation] = useState<SectorValidation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!validation?.isValid) {
      alert('Please ensure all sector allocations sum to 100% before saving.');
      return;
    }

    setIsSaving(true);
    try {
      // In a real implementation, this would save to the backend
      const response = await fetch(`/api/activities/${activityId}/sectors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectors: allocations })
      });

      if (response.ok) {
        router.push(`/activities/${activityId}`);
      } else {
        throw new Error('Failed to save sectors');
      }
    } catch (error) {
      console.error('Error saving sectors:', error);
      alert('Failed to save sectors. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Activity
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sector & Sub-sector Allocation</h1>
              <p className="mt-1 text-sm text-gray-600">
                Assign OECD DAC sector codes and allocate percentages for this activity
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={!validation?.isValid || isSaving}
                className={`flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  validation?.isValid && !isSaving
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save and Continue'}
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-white shadow rounded-lg p-6">
          <SectorAllocationForm
            allocations={allocations}
            onChange={setAllocations}
            onValidationChange={setValidation}
            allowPublish={true}
          />
        </div>

        {/* Validation summary */}
        {validation && !validation.isValid && allocations.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Validation Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Please fix the following issues before saving:</p>
                  <ul className="list-disc list-inside mt-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Template info */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Bulk Import Template</h3>
          <p className="text-sm text-gray-600 mb-4">
            To import multiple sector allocations at once, use a CSV file with the following format:
          </p>
          <pre className="bg-white border border-gray-200 rounded p-3 text-xs overflow-x-auto">
{`dac5_code,percentage
11220,30
12220,25
14030,20
15110,15
31110,10`}
          </pre>
          <p className="text-xs text-gray-500 mt-2">
            The first row must be the header. DAC5 codes must be valid OECD DAC codes.
          </p>
        </div>
      </div>
    </div>
  );
} 