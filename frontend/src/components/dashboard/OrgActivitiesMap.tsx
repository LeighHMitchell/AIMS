"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface OrgActivitiesMapProps {
  organizationId: string;
}

interface MapMarker {
  id: string;
  activityId: string;
  activityTitle: string;
  latitude: number;
  longitude: number;
  locationName: string;
}

export function OrgActivitiesMap({ organizationId }: OrgActivitiesMapProps) {
  const router = useRouter();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Handle client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch locations via API route
        const params = new URLSearchParams({
          organizationId,
        });

        const response = await fetch(`/api/dashboard/org-locations?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch locations');
        }

        const data = await response.json();
        setMarkers(data.markers || []);
      } catch (err) {
        console.error('[OrgActivitiesMap] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchLocations();
    }
  }, [organizationId]);

  const handleMarkerClick = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  // Calculate map center from markers
  const getMapCenter = (): [number, number] => {
    if (markers.length === 0) {
      return [0, 20]; // Default center (Africa)
    }
    const avgLat = markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length;
    const avgLng = markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length;
    return [avgLat, avgLng];
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Activity Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load map: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-slate-600" />
          Activity Locations
        </CardTitle>
        <CardDescription>
          {markers.length} location{markers.length !== 1 ? 's' : ''} from your activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {markers.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No locations recorded</p>
              <p className="text-xs text-slate-400 mt-1">
                Add locations to your activities to see them here
              </p>
            </div>
          </div>
        ) : isClient ? (
          <div className="h-[300px] rounded-lg overflow-hidden">
            <MapContainer
              center={getMapCenter()}
              zoom={4}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  position={[marker.latitude, marker.longitude]}
                  eventHandlers={{
                    click: () => handleMarkerClick(marker.activityId),
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <p className="font-medium text-sm">{marker.activityTitle}</p>
                      <p className="text-xs text-slate-500 mt-1">{marker.locationName}</p>
                      <button
                        className="text-xs text-blue-600 hover:underline mt-2"
                        onClick={() => handleMarkerClick(marker.activityId)}
                      >
                        View Activity
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <Skeleton className="h-[300px] w-full rounded-lg" />
        )}
      </CardContent>
    </Card>
  );
}
