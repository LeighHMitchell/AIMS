'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { ActivityEditorSkeleton } from './ActivityEditorSkeleton';
import { supabase } from '@/lib/supabase';

interface ActivityEditorWrapperProps {
  activityId?: string;
  children: React.ReactNode;
}

export function ActivityEditorWrapper({ activityId, children }: ActivityEditorWrapperProps) {
  const [loading, setLoading] = useState(!!activityId);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // OPTIMIZATION: Remove redundant activity existence check
    // The main activity loading will handle not found errors
    setLoading(false);
  }, [activityId, router]);

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-muted-foreground text-sm">Redirecting to activities list...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <ActivityEditorSkeleton />
      </MainLayout>
    );
  }

  return <>{children}</>;
} 