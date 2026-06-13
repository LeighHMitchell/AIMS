"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgDashboardStats } from '@/hooks/useOrgDashboardStats';
import { useUser } from '@/hooks/useUser';
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo';
import { formatDistanceToNow, format } from 'date-fns';
import { Pencil, CheckCircle, XCircle, HelpCircle, FileText, ExternalLink, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ValidationEventType } from '@/types/dashboard';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger';
import { CopyableIdBadge } from '@/components/ui/copyable-id-badge';

/** Card heading matching the hero cards above: muted label + a (?) help icon
 *  (no leading icon). */
function RecencyHeading({ title, help }: { title: string; help: string }) {
  return (
    <CardTitle className="text-body font-medium text-muted-foreground flex items-center gap-1.5">
      {title}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-body">{help}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </CardTitle>
  );
}

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
    color: 'text-[hsl(var(--success-icon))]',
    bgColor: 'bg-green-50',
    label: 'Validated',
  },
  rejected: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
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
    absolute: format(date, 'd MMM yyyy h:mm a'),
  };
}

export function RecencyCards({ organizationId }: RecencyCardsProps) {
  const { user } = useUser();
  const { stats, loading, error, refetch } = useOrgDashboardStats(organizationId, user?.id);
  const runDelete = useDeleteWithUndo();
  const [hiddenActivityIds, setHiddenActivityIds] = useState<Set<string>>(new Set());

  const deleteActivity = (activityId: string, title: string) => {
    runDelete({
      id: activityId,
      request: {
        endpoint: '/api/activities',
        method: 'DELETE',
        body: { id: activityId, user: user ? { id: user.id } : undefined },
      },
      label: title,
      optimisticRemove: () => {
        setHiddenActivityIds((prev) => {
          const next = new Set(prev);
          next.add(activityId);
          return next;
        });
      },
      restore: () => {
        setHiddenActivityIds((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
      },
      onCommit: async () => {
        await refetch();
        setHiddenActivityIds((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
      },
    });
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
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <p className="text-body text-destructive">Failed to load recency data: {error}</p>
      </div>
    );
  }

  const rawLastCreated = stats?.lastActivityCreated;
  const rawLastEdited = stats?.lastActivityEdited;
  const rawLastValidation = stats?.lastValidationEvent;
  const lastCreated = rawLastCreated && !hiddenActivityIds.has(rawLastCreated.id) ? rawLastCreated : null;
  const lastEdited = rawLastEdited && !hiddenActivityIds.has(rawLastEdited.id) ? rawLastEdited : null;
  const lastValidation = rawLastValidation && !hiddenActivityIds.has(rawLastValidation.activityId) ? rawLastValidation : null;

  return (
    <StaggerContainer className="grid gap-4 md:grid-cols-3">
      {/* Last Activity Created */}
      <StaggerItem>
        <Card className="bg-white transition-all h-full group">
          <CardHeader className="pb-2">
            <RecencyHeading title="Last Activity Created" help="The activity your organisation most recently created." />
          </CardHeader>
          <CardContent>
            {lastCreated ? (
              <div>
                <div className="flex items-start justify-between gap-2">
                  {/* ID first, then Title (Acronym) — all inline, wrapping. */}
                  <p className="min-w-0 flex-1 font-medium text-body text-foreground leading-snug">
                    {lastCreated.iatiIdentifier && (
                      <CopyableIdBadge value={lastCreated.iatiIdentifier} label="Activity ID" className="mr-1.5 align-middle" />
                    )}
                    <a href={`/activities/new?id=${lastCreated.id}`} className="text-foreground hover:text-primary" title={lastCreated.title}>
                      {lastCreated.title}{lastCreated.acronym ? ` (${lastCreated.acronym})` : ''}
                    </a>
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <DropdownMenuItem onClick={() => { window.location.href = `/activities/new?id=${lastCreated.id}`; }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteActivity(lastCreated.id, lastCreated.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {lastCreated.creatorProfile && (
                  <div className="mt-2 text-helper text-muted-foreground">
                    <span>{lastCreated.creatorProfile.name}</span>
                    {lastCreated.creatorProfile.jobTitle && (
                      <span> · {lastCreated.creatorProfile.jobTitle}</span>
                    )}
                    {lastCreated.creatorProfile.department && (
                      <span> · {lastCreated.creatorProfile.department}</span>
                    )}
                  </div>
                )}
                <p
                  className="text-helper text-muted-foreground mt-1.5"
                  title={formatTimestamp(lastCreated.timestamp).absolute}
                >
                  {formatTimestamp(lastCreated.timestamp).relative}
                </p>
              </div>
            ) : (
              <p className="text-body text-muted-foreground italic">No activities created yet</p>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Last Activity Edited */}
      <StaggerItem>
        <Card className="bg-white transition-all h-full group">
          <CardHeader className="pb-2">
            <RecencyHeading title="Last Activity Edited" help="The activity in your organisation's portfolio that was most recently edited, and by whom." />
          </CardHeader>
          <CardContent>
            {lastEdited ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  {/* ID first, then Title (Acronym) — all inline, wrapping. */}
                  <p className="min-w-0 flex-1 font-medium text-body text-foreground leading-snug">
                    {lastEdited.iatiIdentifier && (
                      <CopyableIdBadge value={lastEdited.iatiIdentifier} label="Activity ID" className="mr-1.5 align-middle" />
                    )}
                    <a href={`/activities/new?id=${lastEdited.id}`} className="text-foreground hover:text-primary" title={lastEdited.title}>
                      {lastEdited.title}{lastEdited.acronym ? ` (${lastEdited.acronym})` : ''}
                    </a>
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <DropdownMenuItem onClick={() => { window.location.href = `/activities/new?id=${lastEdited.id}`; }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteActivity(lastEdited.id, lastEdited.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* Editor details */}
                <div className="mt-2 text-helper text-muted-foreground">
                  {lastEdited.editedByYou ? (
                    <span>Edited by you</span>
                  ) : (
                    <>
                      <span>
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
                  className="text-helper text-muted-foreground mt-1"
                  title={formatTimestamp(lastEdited.timestamp).absolute}
                >
                  {formatTimestamp(lastEdited.timestamp).relative}
                </p>
              </>
            ) : (
              <p className="text-body text-muted-foreground italic">No activities edited yet</p>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Last Validation Event */}
      <StaggerItem>
        <Card className="bg-white transition-all h-full group">
          <CardHeader className="pb-2">
            <RecencyHeading title="Last Activity Validated" help="The most recent government validation decision (validated, rejected, or more-info-requested) on one of your organisation's activities." />
          </CardHeader>
          <CardContent>
            {lastValidation ? (
              <>
                <div className="flex items-start gap-2">
                  {/* ID first, then Title (Acronym) — all inline, wrapping. */}
                  <p className="min-w-0 flex-1 font-medium text-body text-foreground leading-snug">
                    {lastValidation.iatiIdentifier && (
                      <CopyableIdBadge value={lastValidation.iatiIdentifier} label="Activity ID" className="mr-1.5 align-middle" />
                    )}
                    <a href={`/activities/new?id=${lastValidation.activityId}&section=government-endorsement`} className="text-foreground hover:text-primary" title={lastValidation.activityTitle}>
                      {lastValidation.activityTitle}{lastValidation.acronym ? ` (${lastValidation.acronym})` : ''}
                    </a>
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {(() => {
                      const config = VALIDATION_EVENT_CONFIG[lastValidation.eventType];
                      return (
                        <Badge className={`text-helper ${config.bgColor} ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      );
                    })()}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <DropdownMenuItem onClick={() => { window.location.href = `/activities/new?id=${lastValidation.activityId}`; }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteActivity(lastValidation.activityId, lastValidation.activityTitle)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {lastValidation.validatorName && (
                  <p className="text-helper text-muted-foreground mt-1.5">
                    by <span>{lastValidation.validatorName}</span>
                  </p>
                )}
                {lastValidation.rejectionReason && (
                  <p className="text-helper text-muted-foreground mt-1 italic line-clamp-2">
                    &ldquo;{lastValidation.rejectionReason}&rdquo;
                  </p>
                )}
                <p
                  className="text-helper text-muted-foreground mt-1"
                  title={formatTimestamp(lastValidation.timestamp).absolute}
                >
                  {formatTimestamp(lastValidation.timestamp).relative}
                </p>
              </>
            ) : (
              <p className="text-body text-muted-foreground italic">No validation events yet</p>
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}
