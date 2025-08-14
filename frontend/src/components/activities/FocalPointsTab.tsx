"use client";

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FocalPointDropdown } from './FocalPointDropdown';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';

interface FocalPointsTabProps {
  activityId: string;
  onFocalPointsChange?: (focalPoints: FocalPointsResponse | null) => void;
}

interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  organisation?: string;
  type: string;
  role?: string;
}

interface FocalPointsResponse {
  government_focal_points: Contact[];
  development_partner_focal_points: Contact[];
}

export default function FocalPointsTab({ activityId, onFocalPointsChange }: FocalPointsTabProps) {
  const [data, setData] = useState<FocalPointsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFocalPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[FocalPointsTab] Fetching focal points for activity ID:', activityId);
      const response = await fetch(`/api/activities/${activityId}/focal-points`);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[FocalPointsTab] API Error:', response.status, errorBody);
        throw new Error(`Failed to fetch focal points: ${response.status} - ${errorBody}`);
      }
      
      const result = await response.json();
      console.log('[FocalPointsTab] Received focal points:', result);
      setData(result);
      onFocalPointsChange?.(result);
    } catch (err) {
      console.error('[AIMS] Error fetching focal points:', err);
      setError(err instanceof Error ? err.message : 'Failed to load focal points');
      onFocalPointsChange?.(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activityId && activityId !== 'undefined' && activityId !== 'null') {
      fetchFocalPoints();
    } else {
      setLoading(false);
      setError('No activity ID provided');
      onFocalPointsChange?.(null);
    }
  }, [activityId, onFocalPointsChange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No focal points data available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Focal Points</h2>
        <p className="text-gray-600">
          Assign individuals who are responsible for the activity, for keeping it up to date, and for validating data entered.
        </p>
      </div>

      {/* Focal Points Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Government Focal Points */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Recipient Government Focal Point(s)
                <HelpTextTooltip content="Government focal points are responsible for reviewing, endorsing, and validating activity data. Multiple focal points can be assigned as needed and will receive notifications about activity updates and changes." />
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                The government official(s) responsible for reviewing or endorsing this activity.
              </p>
            </div>
            <FocalPointDropdown
              activityId={activityId}
              type="government_focal_point"
              currentAssignments={data.government_focal_points}
              onAssignmentChange={fetchFocalPoints}
              placeholder="Select government focal point..."
            />
          </CardContent>
        </Card>
        
        {/* Development Partner Focal Points */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Development Partner Focal Point(s)
                <HelpTextTooltip content="Development partner focal points maintain and update activity information for their organizations. Both types of focal points ensure data accuracy and keep activity information current. Multiple focal points can be assigned as needed." />
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                The main contact(s) responsible for maintaining or updating this activity on behalf of the development partner organisation(s).
              </p>
            </div>
            <FocalPointDropdown
              activityId={activityId}
              type="development_partner_focal_point"
              currentAssignments={data.development_partner_focal_points}
              onAssignmentChange={fetchFocalPoints}
              placeholder="Select development partner focal point..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 