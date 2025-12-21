"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgDashboardStats } from '@/hooks/useOrgDashboardStats';
import { useUser } from '@/hooks/useUser';
import { formatDistanceToNow, format } from 'date-fns';
import { Plus, Edit, CheckCircle, XCircle, HelpCircle, FileText } from 'lucide-react';
import type { ValidationEventType } from '@/types/dashboard';

interface RecencyCardsProps {
  organizationId: string;
}

// Validation event type configuration
const VALIDATION_EVENT_CONFIG: Record<ValidationEventType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  validated: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Validated',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Rejected',
  },
  more_info_requested: {
    icon: HelpCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'More Info Requested',
  },
  submitted: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Submitted',
  },
};

// Format timestamp for display
function formatTimestamp(timestamp: string): { relative: string; absolute: string } {
  const date = new Date(timestamp);
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    absolute: format(date, 'MMM d, yyyy h:mm a'),
  };
}

export function RecencyCards({ organizationId }: RecencyCardsProps) {
  const router = useRouter();
  const { user } = useUser();
  const { stats, loading, error } = useOrgDashboardStats(organizationId, user?.id);

  const handleCardClick = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">Failed to load recency data: {error}</p>
      </div>
    );
  }

  const lastCreated = stats?.lastActivityCreated;
  const lastEdited = stats?.lastActivityEdited;
  const lastValidation = stats?.lastValidationEvent;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Last Activity Created */}
      <Card
        className={`bg-white transition-all ${
          lastCreated ? 'cursor-pointer hover:shadow-md hover:bg-slate-50' : ''
        }`}
        onClick={() => lastCreated && handleCardClick(lastCreated.id)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Plus className="h-4 w-4 text-green-600" />
            Last Activity Created
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastCreated ? (
            <>
              <p className="font-medium text-slate-900 truncate" title={lastCreated.title}>
                {lastCreated.title}
              </p>
              <p
                className="text-xs text-slate-500 mt-1"
                title={formatTimestamp(lastCreated.timestamp).absolute}
              >
                {formatTimestamp(lastCreated.timestamp).relative}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500 italic">No activities created yet</p>
          )}
        </CardContent>
      </Card>

      {/* Last Activity Edited */}
      <Card
        className={`bg-white transition-all ${
          lastEdited ? 'cursor-pointer hover:shadow-md hover:bg-slate-50' : ''
        }`}
        onClick={() => lastEdited && handleCardClick(lastEdited.id)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Edit className="h-4 w-4 text-blue-600" />
            Last Activity Edited
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastEdited ? (
            <>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 truncate flex-1" title={lastEdited.title}>
                  {lastEdited.title}
                </p>
                <Badge variant={lastEdited.editedByYou ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {lastEdited.editedByYou ? 'You' : lastEdited.editedByName || 'Colleague'}
                </Badge>
              </div>
              <p
                className="text-xs text-slate-500 mt-1"
                title={formatTimestamp(lastEdited.timestamp).absolute}
              >
                {formatTimestamp(lastEdited.timestamp).relative}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500 italic">No activities edited yet</p>
          )}
        </CardContent>
      </Card>

      {/* Last Validation Event */}
      <Card
        className={`bg-white transition-all ${
          lastValidation ? 'cursor-pointer hover:shadow-md hover:bg-slate-50' : ''
        }`}
        onClick={() => lastValidation && router.push(`/activities/${lastValidation.activityId}?tab=government-endorsement`)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-purple-600" />
            Last Validation Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastValidation ? (
            <>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 truncate flex-1" title={lastValidation.activityTitle}>
                  {lastValidation.activityTitle}
                </p>
                {(() => {
                  const config = VALIDATION_EVENT_CONFIG[lastValidation.eventType];
                  return (
                    <Badge className={`text-xs shrink-0 ${config.bgColor} ${config.color} border-0`}>
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>
              <p
                className="text-xs text-slate-500 mt-1"
                title={formatTimestamp(lastValidation.timestamp).absolute}
              >
                {formatTimestamp(lastValidation.timestamp).relative}
              </p>
              {lastValidation.validatingAuthority && (
                <p className="text-xs text-slate-400 mt-0.5">
                  by {lastValidation.validatingAuthority}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 italic">No validation events yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
