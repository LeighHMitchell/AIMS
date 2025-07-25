'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/useUser';
import { useSectorsAutosave } from '@/hooks/use-field-autosave-new';

export default function TestAutosavePage() {
  const { user } = useUser();
  const [testSectors, setTestSectors] = useState([
    {
      id: 'test-1',
      code: '110',
      name: 'Education',
      percentage: 50,
      level: 'group',
      category: 'Education',
      categoryCode: '110'
    },
    {
      id: 'test-2',
      code: '11110',
      name: 'Education policy and administrative management',
      percentage: 50,
      level: 'sector',
      category: 'Education',
      categoryCode: '111'
    }
  ]);
  
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingComplete, setIsTestingComplete] = useState(false);

  const activityId = '85b03f24-217e-4cbf-b8e4-79dca60dee1f';
  const sectorsAutosave = useSectorsAutosave(activityId, user?.id);

  const testSave = () => {
    console.log('🧪 [TestAutosave] Testing manual save...');
    console.log('📊 [TestAutosave] Test sectors:', testSectors);
    console.log('🏢 [TestAutosave] Activity ID:', activityId);
    console.log('👤 [TestAutosave] User ID:', user?.id);
    
    sectorsAutosave.saveNow(testSectors);
  };

  const updatePercentage = (newPercentage: number) => {
    const updated = testSectors.map(sector => ({
      ...sector,
      percentage: newPercentage
    }));
    console.log('🔄 [TestAutosave] Updating test sectors:', updated);
    setTestSectors(updated);
    sectorsAutosave.saveNow(updated);
  };

  const testDirectAPI = async () => {
    console.log('🌐 [TestAutosave] Testing direct API call...');
    
    try {
      const response = await fetch('/api/activities/field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          field: 'sectors',
          value: testSectors,
          user: { id: user?.id }
        })
      });

      console.log('📥 [TestAutosave] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [TestAutosave] API Error:', errorText);
        return;
      }

      const data = await response.json();
      console.log('✅ [TestAutosave] API Success:', data);

    } catch (error) {
      console.error('💥 [TestAutosave] Network Error:', error);
    }
  };

  const runCompleteTest = async () => {
    console.log('🔬 [TestAutosave] Running complete test suite...');
    setIsTestingComplete(true);
    setTestResults(null);
    
    try {
      const response = await fetch('/api/test-sectors-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          testSectors: testSectors
        })
      });

      const results = await response.json();
      console.log('🧪 [TestAutosave] Complete test results:', results);
      setTestResults(results);

    } catch (error) {
      console.error('💥 [TestAutosave] Complete test error:', error);
      setTestResults({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTestingComplete(false);
    }
  };

  const testDatabaseQuery = async () => {
    console.log('🗄️ [TestAutosave] Testing database query...');
    
    try {
      const response = await fetch('/api/test-sectors-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId
        })
      });

      const results = await response.json();
      console.log('🗄️ [TestAutosave] Database query results:', results);

    } catch (error) {
      console.error('💥 [TestAutosave] Database query error:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Comprehensive Autosave Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Activity ID:</strong> {activityId}
          </div>
          <div>
            <strong>User ID:</strong> {user?.id || 'Not logged in'}
          </div>
          <div>
            <strong>Autosave State:</strong>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-2">
              {JSON.stringify(sectorsAutosave.state, null, 2)}
            </pre>
          </div>
          
          <div className="space-y-2">
            <label>Test Sector Percentage:</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={testSectors[0]?.percentage || 0}
              onChange={(e) => updatePercentage(parseInt(e.target.value) || 0)}
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <strong>Test Sectors:</strong>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(testSectors, null, 2)}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testSave} variant="outline">
              Test Manual Save
            </Button>
            <Button onClick={testDirectAPI} variant="outline">
              Test Direct API
            </Button>
            <Button onClick={testDatabaseQuery} variant="outline">
              Test Database Query
            </Button>
            <Button 
              onClick={runCompleteTest} 
              variant="default"
              disabled={isTestingComplete}
            >
              {isTestingComplete ? 'Running Complete Test...' : '🔬 Run Complete Test'}
            </Button>
          </div>

          {testResults && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">
                  🔬 Complete Test Results
                  {testResults.summary && (
                    <span className={`ml-2 text-sm ${testResults.summary.allTestsPassed ? 'text-green-600' : 'text-red-600'}`}>
                      {testResults.summary.allTestsPassed ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.summary && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <strong>Summary:</strong> 
                    {testResults.summary.passedTests}/{testResults.summary.totalTests} tests passed
                    {testResults.summary.failedTests > 0 && (
                      <span className="text-red-600 ml-2">
                        ({testResults.summary.failedTests} failed)
                      </span>
                    )}
                  </div>
                )}
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 