import React, { useState } from 'react';
import { useSupabaseFieldUpdate } from '@/hooks/use-supabase-field-update';
import { useActivityDefaults } from '@/hooks/use-activity-defaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SupabaseFieldsTestProps {
  activityId: string | null;
  currentDefaults?: {
    defaultAidType?: string | null;
    defaultFinanceType?: string | null;
    defaultFlowType?: string | null;
    defaultCurrency?: string | null;
    defaultTiedStatus?: string | null;
  };
}

export function SupabaseFieldsTest({ activityId, currentDefaults }: SupabaseFieldsTestProps) {
  const [testResults, setTestResults] = useState<string[]>([]);

  // Basic field update test
  const { updateField, state: fieldState } = useSupabaseFieldUpdate(activityId, {
    tableName: 'activities',
    onSuccess: (field, value) => {
      setTestResults(prev => [...prev, `✅ ${field} updated to: ${value}`]);
    },
    onError: (field, error) => {
      setTestResults(prev => [...prev, `❌ ${field} failed: ${error.message}`]);
    }
  });

  // Activity defaults hook test
  const {
    values,
    updateDefaultCurrency,
    updateDefaultAidType,
    isUpdating: defaultsUpdating,
    error: defaultsError
  } = useActivityDefaults({
    activityId,
    initialValues: {
      default_currency: currentDefaults?.defaultCurrency,
      default_aid_type: currentDefaults?.defaultAidType,
      default_finance_type: currentDefaults?.defaultFinanceType,
      default_flow_type: currentDefaults?.defaultFlowType,
      default_tied_status: currentDefaults?.defaultTiedStatus
    },
    onFieldUpdate: (field, value) => {
      setTestResults(prev => [...prev, `✅ useActivityDefaults updated ${field} to: ${value}`]);
    },
    onError: (field, error) => {
      setTestResults(prev => [...prev, `❌ useActivityDefaults failed ${field}: ${error.message}`]);
    }
  });

  const testBasicUpdate = async () => {
    setTestResults(prev => [...prev, '🧪 Testing basic field update...']);
    await updateField('default_currency', 'USD');
  };

  const testDefaultsHook = async () => {
    setTestResults(prev => [...prev, '🧪 Testing activity defaults hook...']);
    await updateDefaultCurrency('EUR');
  };

  const testMultipleFields = async () => {
    setTestResults(prev => [...prev, '🧪 Testing multiple field updates...']);
    await updateDefaultAidType('C01');
    setTimeout(async () => {
      await updateDefaultCurrency('GBP');
    }, 500);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getStatusBadge = () => {
    if (fieldState.isUpdating || defaultsUpdating) {
      return <Badge variant="outline" className="text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Updating</Badge>;
    }
    if (fieldState.error || defaultsError) {
      return <Badge variant="outline" className="text-red-600"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
    }
    if (fieldState.lastUpdated) {
      return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
    }
    return <Badge variant="outline">Ready</Badge>;
  };

  return (
    <Card className="w-full mb-6 border-blue-200">
      <CardHeader className="bg-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-blue-800">🧪 Supabase Integration Test</CardTitle>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-blue-600">
          Test the new Supabase default fields integration before replacing existing components.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Test Info */}
        <div className="bg-gray-50 p-3 rounded text-sm">
          <div><strong>Activity ID:</strong> {activityId || 'None (will fail)'}</div>
          <div><strong>Current Values:</strong></div>
          <pre className="text-xs mt-1 overflow-auto max-h-20">
            {JSON.stringify(values, null, 2)}
          </pre>
        </div>

        {/* Test Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={testBasicUpdate} 
            disabled={!activityId || fieldState.isUpdating}
            size="sm"
          >
            Test Basic Update (USD)
          </Button>
          
          <Button 
            onClick={testDefaultsHook} 
            disabled={!activityId || defaultsUpdating}
            size="sm"
            variant="outline"
          >
            Test Defaults Hook (EUR)
          </Button>
          
          <Button 
            onClick={testMultipleFields} 
            disabled={!activityId || fieldState.isUpdating || defaultsUpdating}
            size="sm"
            variant="outline"
          >
            Test Multiple Fields
          </Button>

          <Button 
            onClick={clearResults} 
            size="sm"
            variant="ghost"
          >
            Clear Results
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-black text-green-400 p-3 rounded font-mono text-xs max-h-40 overflow-auto">
            <div className="font-bold mb-2">Test Results:</div>
            {testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {new Date().toLocaleTimeString()} - {result}
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {(fieldState.error || defaultsError) && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-red-800 font-medium">Error Details:</div>
            <div className="text-red-600 text-sm mt-1">
              Field State Error: {fieldState.error || 'None'}<br />
              Defaults Error: {defaultsError || 'None'}
            </div>
          </div>
        )}

        {/* Success Info */}
        {fieldState.lastUpdated && !fieldState.error && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-green-800 text-sm">
              ✅ Last successful update: {fieldState.lastUpdated.toLocaleString()}
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="text-yellow-800 font-medium text-sm">Instructions:</div>
          <ol className="text-yellow-700 text-xs mt-1 ml-4 list-decimal space-y-1">
            <li>Ensure you have a valid activity ID (activity must be saved first)</li>
            <li>Click test buttons to verify Supabase integration works</li>
            <li>Check browser network tab for API calls to Supabase</li>
            <li>Verify updates in Supabase dashboard</li>
            <li>If tests pass, proceed with integration</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}