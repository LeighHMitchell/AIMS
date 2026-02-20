"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgDashboardStats } from '@/hooks/useOrgDashboardStats';
import { useUser } from '@/hooks/useUser';
import { formatDistanceToNow, format } from 'date-fns';
import { Plus, Pencil, CheckCircle, XCircle, HelpCircle, FileText } from 'lucide-react';
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
  const { user } = useUser();
  const { stats, loading, error } = useOrgDashboardStats(organizationId, user?.id);

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
      <a
        href={lastCreated ? `/activities/${lastCreated.id}` : undefined}
        className={lastCreated ? '' : 'pointer-events-none'}
        onClick={(e) => {
          if (!lastCreated) e.preventDefault();
        }}
      >
        <Card
          className={`bg-white transition-all h-full ${
            lastCreated ? 'cursor-pointer hover:shadow-md hover:bg-slate-50' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Plus className="h-4 w-4 text-slate-600" />
              Last Activity Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastCreated ? (
              <div>
                <p className="font-medium text-slate-900 leading-snug" title={lastCreated.title}>
                  {lastCreated.title}
                  {lastCreated.iatiIdentifier && (
                    <> <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap">{lastCreated.iatiIdentifier}</code></>
                  )}
                </p>
                {lastCreated.creatorProfile && (
                  <div className="mt-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">{lastCreated.creatorProfile.name}</span>
                    {lastCreated.creatorProfile.jobTitle && (
                      <span> · {lastCreated.creatorProfile.jobTitle}</span>
                    )}
                    {lastCreated.creatorProfile.department && (
                      <span> · {lastCreated.creatorProfile.department}</span>
                    )}
                  </div>
                )}
                <p
                  className="text-xs text-slate-500 mt-1.5"
                  title={formatTimestamp(lastCreated.timestamp).absolute}
                >
                  {formatTimestamp(lastCreated.timestamp).relative}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No activities created yet</p>
            )}
          </CardContent>
        </Card>
      </a>

      {/* Last Activity Edited */}
      <a
        href={lastEdited ? `/activities/${lastEdited.id}` : undefined}
        className={lastEdited ? '' : 'pointer-events-none'}
        onClick={(e) => {
          if (!lastEdited) e.preventDefault();
        }}
      >
        <Card
          className={`bg-white transition-all h-full ${
            lastEdited ? 'cursor-pointer hover:shadow-md hover:bg-slate-50' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-slate-500" />
              Last Activity Edited
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastEdited ? (
              <>
                <p className="font-medium text-slate-900 leading-snug" title={lastEdited.title}>
                  {lastEdited.title}
                  {lastEdited.iatiIdentifier && (
                    <> <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap">{lastEdited.iatiIdentifier}</code></>
                  )}
                </p>
                {/* Editor details */}
                <div className="mt-2 text-xs text-slate-500">
                  {lastEdited.editedByYou ? (
                    <span className="font-medium text-slate-600">Edited by you</span>
                  ) : (
                    <>
                      <span className="font-medium text-slate-600">
                        {lastEdited.editorProfile?.name || lastEdited.editedByName || 'Colleague'}
                      </span>
                      {lastEdited.editorProfile?.jobTitle && (
                        <span> · {lastEdited.editorProfile.jobTitle}</span>
                      )}
                      {lastEdited.editorProfile?.department && (
                        <span> · {lastEdited.editorProfile.department}</span>
                      )}
                    </>
                  )}
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
      </a>

      {/* Last Validation Event */}
      <a
        href={lastValidation ? `/activities/${lastValidation.activityId}?tab=government-endorsement` : undefined}
        className={lastValidation ? '' : 'pointer-events-none'}
        onClick={(e) => {
          if (!lastValidation) e.preventDefault();
        }}
      >
        <Card
          className={`bg-white transition-all h-full ${
            lastValidation ? 'cursor-pointer hover:shadow-md hover:bg-slate-50' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-slate-600" />
              Last Validation Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastValidation ? (
              <>
                <div className="flex items-start gap-2">
                  <p className="font-medium text-slate-900 leading-snug flex-1" title={lastValidation.activityTitle}>
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
                {lastValidation.iatiIdentifier && (
                  <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded mt-1 inline-block">
                    {lastValidation.iatiIdentifier}
                  </code>
                )}
                {lastValidation.validatorName && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    by <span className="font-medium text-slate-600">{lastValidation.validatorName}</span>
                  </p>
                )}
                {lastValidation.rejectionReason && (
                  <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">
                    &ldquo;{lastValidation.rejectionReason}&rdquo;
                  </p>
                )}
                <p
                  className="text-xs text-slate-500 mt-1"
                  title={formatTimestamp(lastValidation.timestamp).absolute}
                >
                  {formatTimestamp(lastValidation.timestamp).relative}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500 italic">No validation events yet</p>
            )}
          </CardContent>
        </Card>
      </a>
    </div>
  );
}
