// ActivityEditorExample.tsx
// Example usage of the ActivityEditor component

import React from 'react';
import { Toaster } from 'react-hot-toast';
import ActivityEditor from './ActivityEditor';

// Example page component showing how to use ActivityEditor
export default function ActivityEditorPage() {
  // Example activity ID (in real usage, this would come from router params or props)
  const activityId = "89194bc6-dd2e-43dc-aa91-288d32e6765f";

  // Example initial data (optional - component can load without this)
  const initialData = {
    title: "BudgetBridge: Linking Aid and National Plans for Smarter Spending V3",
    description: "An innovative initiative designed to connect international aid allocations with recipient countries' national budgets...",
    collaboration_type: "1", // Bilateral
    activity_status: "2", // Implementation
    planned_start_date: "2025-01-01",
    planned_end_date: "2026-12-31",
    actual_start_date: "",
    actual_end_date: ""
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications container */}
      <Toaster />
      
      {/* Main content */}
      <div className="py-8">
        <ActivityEditor 
          activityId={activityId}
          initialData={initialData}
        />
      </div>
    </div>
  );
}

// Alternative: Simple usage without initial data
export function SimpleActivityEditor({ activityId }: { activityId: string }) {
  return (
    <div>
      <Toaster />
      <ActivityEditor activityId={activityId} />
    </div>
  );
}

// Usage in Next.js page:
/*
// pages/activities/[id]/edit.tsx or app/activities/[id]/edit/page.tsx

import { useRouter } from 'next/router'; // or 'next/navigation' for app router
import ActivityEditor from '@/components/ActivityEditor';
import { Toaster } from 'react-hot-toast';

export default function EditActivityPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Toaster />
      <ActivityEditor activityId={id} />
    </div>
  );
}
*/ 