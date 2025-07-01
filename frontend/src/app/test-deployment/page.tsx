'use client';

export default function TestDeploymentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Deployment Test</h1>
          <p className="mt-2 text-gray-600">Vercel deployment from main branch</p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-500">Features:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ Supabase Authentication</li>
              <li>✅ User Migration Complete</li>
              <li>✅ All Build Errors Fixed</li>
              <li>✅ Root Directory: frontend</li>
              <li>✅ Environment Variables Set</li>
            </ul>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Last updated: {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  );
} 