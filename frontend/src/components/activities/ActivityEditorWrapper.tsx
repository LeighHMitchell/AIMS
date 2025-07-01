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
    if (!activityId) {
      setLoading(false);
      return;
    }

    const checkActivity = async () => {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('id')
          .eq('id', activityId)
          .single();

        if (error || !data) {
          setError('Activity not found');
          setTimeout(() => {
            router.push('/activities');
          }, 2000);
          return;
        }

        // Activity exists, proceed with loading
        setLoading(false);
      } catch (err) {
        console.error('Error checking activity:', err);
        setError('Failed to load activity');
      }
    };

    checkActivity();
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