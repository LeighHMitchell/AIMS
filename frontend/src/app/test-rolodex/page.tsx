'use client';

import { useState, useEffect } from 'react';

export default function TestRolodexPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testFetch = async () => {
      try {
        console.log('Testing rolodex API...');
        const response = await fetch('/api/rolodex?limit=5');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Result:', result);
        setData(result);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testFetch();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Rolodex API Test</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">API Response:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
      
      {data?.people && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">People ({data.people.length}):</h2>
          <ul className="space-y-2">
            {data.people.map((person: any) => (
              <li key={person.id} className="p-2 border rounded">
                <div className="font-medium">{person.name}</div>
                <div className="text-sm text-gray-600">{person.email}</div>
                <div className="text-sm text-gray-600">{person.role_label}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}