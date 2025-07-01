'use client';

export default function TestDeploymentPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Deployment Test Page</h1>
      
      <div className="space-y-4">
        <div className="bg-green-100 p-4 rounded">
          <h2 className="font-semibold">✅ Features that should be available:</h2>
          <ul className="list-disc list-inside mt-2">
            <li>Supabase Authentication</li>
            <li>User Profile Management with Avatar Upload</li>
            <li>Analytics Dashboard with Charts</li>
            <li>Activity Logs (fixed)</li>
            <li>All build errors fixed</li>
            <li>Deployment timestamp: {new Date().toISOString()}</li>
          </ul>
        </div>
        
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-semibold">🔍 Quick Links to Test:</h2>
          <ul className="list-disc list-inside mt-2">
            <li><a href="/login" className="text-blue-600 underline">Login Page (Supabase Auth)</a></li>
            <li><a href="/dashboard" className="text-blue-600 underline">Dashboard</a></li>
            <li><a href="/analytics-dashboard" className="text-blue-600 underline">Analytics Dashboard</a></li>
            <li><a href="/activities" className="text-blue-600 underline">Activities List</a></li>
            <li><a href="/settings" className="text-blue-600 underline">User Settings (Profile)</a></li>
          </ul>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="font-semibold">⚡ Latest Commit Info:</h2>
          <p className="font-mono text-sm mt-2">c103d80 - chore: Trigger Vercel deployment</p>
          <p className="text-sm mt-1">All features from the feature branch have been merged to main</p>
        </div>
      </div>
    </div>
  );
} 