'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSupabasePage() {
  const [status, setStatus] = useState<string>('Checking connection...');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Check if Supabase client exists
        if (!supabase) {
          setStatus('❌ Supabase client not initialized');
          setError('Supabase client is null - check environment variables');
          setDetails({
            url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          });
          return;
        }

        setStatus('🔄 Testing connection...');

        // Try a simple query
        const { data, error } = await supabase
          .from('activities')
          .select('count')
          .limit(1);

        if (error) {
          setStatus('❌ Connection failed');
          setError(error.message);
          setDetails({
            code: error.code,
            details: error.details,
            hint: error.hint,
            message: error.message
          });
        } else {
          setStatus('✅ Connected successfully!');
          setError(null);
          setDetails({
            message: 'Supabase is working correctly',
            response: data
          });
        }
      } catch (err: any) {
        setStatus('❌ Unexpected error');
        setError(err.message || 'Unknown error');
        setDetails(err);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="text-2xl font-semibold">{status}</div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="text-red-800 font-medium">Error:</div>
              <div className="text-red-600">{error}</div>
            </div>
          )}

          {details && (
            <div className="bg-gray-50 rounded p-4">
              <div className="font-medium mb-2">Details:</div>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}

          <div className="pt-4 border-t">
            <h2 className="font-medium mb-2">Environment Check:</h2>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Supabase URL:</span>{' '}
                <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}
                </span>
              </div>
              <div>
                <span className="font-medium">Anon Key:</span>{' '}
                <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}
                </span>
              </div>
              <div>
                <span className="font-medium">Client Status:</span>{' '}
                <span className={supabase ? 'text-green-600' : 'text-red-600'}>
                  {supabase ? '✅ Initialized' : '❌ Not initialized'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Retry Connection
            </button>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded p-4">
          <div className="font-medium text-yellow-800 mb-2">Troubleshooting Tips:</div>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Check that your .env.local file has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>Verify the Supabase project is active and not paused</li>
            <li>Check if you're behind a firewall or VPN that might block Supabase</li>
            <li>Try accessing your Supabase URL directly in the browser</li>
            <li>Restart the Next.js dev server after changing environment variables</li>
          </ol>
        </div>
      </div>
    </div>
  );
}