import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { MapSkeleton } from '@/components/ui/skeleton-loader';

// Force dynamic rendering - skip static prerendering for this map page
export const dynamic = 'force-dynamic';

// Dynamic import Atlas to avoid SSR issues with MapLibre
const Atlas = dynamicImport(() => import('@/components/Atlas'), {
  ssr: false,
  loading: () => <MapSkeleton height="600px" />
});

export default function AtlasPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Atlas</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Where aid activities are happening across Myanmar.
        </p>
      </div>

      <Suspense fallback={<MapSkeleton height="600px" />}>
        <Atlas />
      </Suspense>
    </MainLayout>
  );
}
