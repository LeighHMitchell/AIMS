"use client";

import { useState, useEffect } from 'react';
import { User, CheckCircle } from 'lucide-react';
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

  // Optimized handlers to avoid full refresh
  const handleAssignmentAdded = (newAssignment: any, type: 'government_focal_point' | 'development_partner_focal_point') => {
    setData(prevData => {
      if (!prevData) return prevData;
      
      if (type === 'government_focal_point') {
        return {
          ...prevData,
          government_focal_points: [...prevData.government_focal_points, newAssignment]
        };
      } else {
        return {
          ...prevData,
          development_partner_focal_points: [...prevData.development_partner_focal_points, newAssignment]
        };
      }
    });
    
    // Update parent component
    if (data) {
      const updatedData = { ...data };
      if (type === 'government_focal_point') {
        updatedData.government_focal_points = [...data.government_focal_points, newAssignment];
      } else {
        updatedData.development_partner_focal_points = [...data.development_partner_focal_points, newAssignment];
      }
      onFocalPointsChange?.(updatedData);
    }
  };

  const handleAssignmentRemoved = (removedContactId: string, type: 'government_focal_point' | 'development_partner_focal_point') => {
    setData(prevData => {
      if (!prevData) return prevData;
      
      if (type === 'government_focal_point') {
        return {
          ...prevData,
          government_focal_points: prevData.government_focal_points.filter(fp => fp.id !== removedContactId)
        };
      } else {
        return {
          ...prevData,
          development_partner_focal_points: prevData.development_partner_focal_points.filter(fp => fp.id !== removedContactId)
        };
      }
    });
    
    // Update parent component
    if (data) {
      const updatedData = { ...data };
      if (type === 'government_focal_point') {
        updatedData.government_focal_points = data.government_focal_points.filter(fp => fp.id !== removedContactId);
      } else {
        updatedData.development_partner_focal_points = data.development_partner_focal_points.filter(fp => fp.id !== removedContactId);
      }
      onFocalPointsChange?.(updatedData);
    }
  };

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
      setError(err instanceof Error ? err.message : 'Failed to load Focal Points');
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
        <AlertDescription>No Focal Points data available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Focal Points Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-32">
        {/* Government Focal Points */}
        <Card className="min-h-[400px]">
          <CardContent className="p-4 h-full flex flex-col">
            <div className="mb-3">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Recipient Government Focal Point(s)
                <HelpTextTooltip content="Government focal points are responsible for reviewing, endorsing, and validating activity data. Multiple focal points can be assigned as needed and will receive notifications about activity updates and changes." />
                {/* Green tick to show focal points are saved */}
                <CheckCircle className="h-5 w-5 text-green-600" />
              </h3>
            </div>
            <div className="flex-1">
              <FocalPointDropdown
                activityId={activityId}
                type="government_focal_point"
                currentAssignments={data.government_focal_points}
                allFocalPointAssignments={[...data.government_focal_points, ...data.development_partner_focal_points]}
                onAssignmentChange={fetchFocalPoints}
                onAssignmentAdded={(newAssignment) => handleAssignmentAdded(newAssignment, 'government_focal_point')}
                onAssignmentRemoved={(contactId) => handleAssignmentRemoved(contactId, 'government_focal_point')}
                placeholder="Select government focal point..."
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Development Partner Focal Points */}
        <Card className="min-h-[400px]">
          <CardContent className="p-4 h-full flex flex-col">
            <div className="mb-3">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5 text-gray-600" />
                Development Partner Focal Point(s)
                <HelpTextTooltip content="Development partner focal points maintain and update activity information for their organizations. Both types of focal points ensure data accuracy and keep activity information current. Multiple focal points can be assigned as needed." />
                {/* Green tick to show focal points are saved */}
                <CheckCircle className="h-5 w-5 text-green-600" />
              </h3>
            </div>
            <div className="flex-1">
              <FocalPointDropdown
                activityId={activityId}
                type="development_partner_focal_point"
                currentAssignments={data.development_partner_focal_points}
                allFocalPointAssignments={[...data.government_focal_points, ...data.development_partner_focal_points]}
                onAssignmentChange={fetchFocalPoints}
                onAssignmentAdded={(newAssignment) => handleAssignmentAdded(newAssignment, 'development_partner_focal_point')}
                onAssignmentRemoved={(contactId) => handleAssignmentRemoved(contactId, 'development_partner_focal_point')}
                placeholder="Select development partner focal point..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 