import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { MainLayout } from '@/components/layout/main-layout';
import { MapSkeleton } from '@/components/ui/skeleton-loader';
import { Globe } from 'lucide-react';

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
      <div className="flex items-center gap-3 mb-6">
        <Globe className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Atlas</h1>
          <p className="text-muted-foreground mt-1">
            Interactive map powered by MapLibre GL for improved performance and WebGL rendering
          </p>
        </div>
      </div>
      
      <Suspense fallback={<MapSkeleton height="600px" />}>
        <Atlas />
      </Suspense>
    </MainLayout>
  );
}
