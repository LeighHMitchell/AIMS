"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { EmbeddedLocation } from '@/components/maps-v2/EmbeddedAtlasMap';

// Dynamically import EmbeddedAtlasMap to avoid SSR issues
const EmbeddedAtlasMap = dynamic(() => import('@/components/maps-v2/EmbeddedAtlasMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-lg">
      <div className="text-center">
        <Skeleton className="h-8 w-8 rounded-full mx-auto mb-2" />
        <p className="text-sm text-slate-500">Loading map...</p>
      </div>
    </div>
  ),
});

interface ProjectLocation {
  id: string;
  activityId: string;
  activityTitle: string;
  activityIdentifier?: string;
  activityStatus?: string;
  totalBudget?: number;
  currency?: string;
  locationName?: string;
  locationDescription?: string;
  latitude: number;
  longitude: number;
  locationReach?: string;
  locationClass?: string;
  exactness?: string;
}

interface OrgProjectMapProps {
  organizationId: string;
}

export function OrgProjectMap({ organizationId }: OrgProjectMapProps) {
  const [locations, setLocations] = useState<ProjectLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/organizations/${organizationId}/project-locations`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch project locations');
        }

        const data = await response.json();
        setLocations(data.locations || []);
      } catch (err) {
        console.error('Error fetching project locations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project locations');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchLocations();
    }
  }, [organizationId]);

  // Transform locations to EmbeddedAtlasMap format
  const mapLocations: EmbeddedLocation[] = locations.map(loc => ({
    id: loc.id,
    latitude: loc.latitude,
    longitude: loc.longitude,
    name: loc.locationName,
    description: loc.locationDescription,
    activity: {
      id: loc.activityId,
      title: loc.activityTitle,
      status: loc.activityStatus,
      total_budget: loc.totalBudget,
    },
  }));

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Project Locations Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Project Locations Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (locations.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Project Locations Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex flex-col items-center justify-center text-slate-500 bg-slate-50 rounded-lg">
            <MapPin className="h-12 w-12 mb-4 text-slate-300" />
            <p className="text-lg font-medium">No project locations available</p>
            <p className="text-sm mt-1">
              Projects with geographic coordinates will appear on this map
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">
            Project Locations Map
          </CardTitle>
          <div className="text-sm text-slate-600">
            {locations.length} location{locations.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-slate-200">
          <EmbeddedAtlasMap locations={mapLocations} height="500px" />
        </div>
      </CardContent>
    </Card>
  );
}
