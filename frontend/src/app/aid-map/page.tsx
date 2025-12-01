import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { MapSkeleton } from '@/components/ui/skeleton-loader';

// Force dynamic rendering - skip static prerendering for this map page
export const dynamic = 'force-dynamic';

// Dynamic import AidMap to avoid SSR issues with Leaflet
const AidMap = dynamicImport(() => import('@/components/AidMap'), { 
  ssr: false,
  loading: () => <MapSkeleton height="600px" />
});

export default function AidMapPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Atlas</h1>
        <p className="text-gray-600">
          Interactive map showing the locations of all activities across Myanmar
        </p>
      </div>
      
      <Suspense fallback={<MapSkeleton height="600px" />}>
        <AidMap />
      </Suspense>
    </MainLayout>
  );
}
