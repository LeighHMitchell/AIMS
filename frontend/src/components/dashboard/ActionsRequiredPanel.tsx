"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActionsRequired } from '@/hooks/useActionsRequired';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  History,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import type { ActionType } from '@/types/dashboard';

interface ActionsRequiredPanelProps {
  organizationId: string;
  userId?: string;
  limit?: number;
}

// Action type configuration
const ACTION_CONFIG: Record<ActionType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badgeVariant: 'destructive' | 'warning' | 'default' | 'secondary' | 'outline';
  label: string;
}> = {
  validation_returned: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    badgeVariant: 'destructive',
    label: 'Validation Returned',
  },
  missing_data: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    badgeVariant: 'warning',
    label: 'Missing Data',
  },
  closing_soon: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    badgeVariant: 'default',
    label: 'Closing Soon',
  },
  out_of_date: {
    icon: History,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    badgeVariant: 'secondary',
    label: 'Needs Update',
  },
  new_comment: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    badgeVariant: 'outline',
    label: 'New Comment',
  },
};

// Get the deep link for an action
function getActionLink(action: { type: ActionType; activityId: string; metadata?: Record<string, unknown> }): string {
  const { type, activityId, metadata } = action;

  switch (type) {
    case 'validation_returned':
      return `/activities/${activityId}?tab=government-endorsement`;
    case 'missing_data':
      return `/activities/${activityId}?tab=overview`;
    case 'closing_soon':
      return `/activities/${activityId}?tab=overview`;
    case 'out_of_date':
      return `/activities/${activityId}?tab=overview`;
    case 'new_comment':
      return `/activities/${activityId}?tab=comments`;
    default:
      return `/activities/${activityId}`;
  }
}

// Get the CTA text for an action
function getActionCTA(type: ActionType): string {
  switch (type) {
    case 'validation_returned':
      return 'View reviewer comments';
    case 'missing_data':
      return 'Complete required fields';
    case 'closing_soon':
      return 'Review activity';
    case 'out_of_date':
      return 'Update activity';
    case 'new_comment':
      return 'Reply to comment';
    default:
      return 'View activity';
  }
}

export function ActionsRequiredPanel({
  organizationId,
  userId,
  limit = 7,
}: ActionsRequiredPanelProps) {
  const router = useRouter();
  const { actions, total, hasMore, loading, error } = useActionsRequired(
    organizationId,
    userId,
    limit
  );

  const handleActionClick = (activityId: string, type: ActionType, metadata?: Record<string, unknown>) => {
    const link = getActionLink({ type, activityId, metadata });
    router.push(link);
  };

  const handleViewAll = () => {
    router.push('/activities?filter=actions-required');
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Actions Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load actions: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (actions.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Actions Required
          </CardTitle>
          <CardDescription>
            Tasks that need your attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium text-slate-700">All caught up!</p>
            <p className="text-sm text-slate-500 mt-1">
              You have no pending actions at the moment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Actions Required
              {total > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {total}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Tasks that need your attention, sorted by priority
            </CardDescription>
          </div>
          {hasMore && (
            <Button variant="outline" size="sm" onClick={handleViewAll}>
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => {
            const config = ACTION_CONFIG[action.type];
            const Icon = config.icon;

            return (
              <div
                key={action.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${config.bgColor} hover:border-slate-300`}
                onClick={() => handleActionClick(action.activityId, action.type, action.metadata)}
              >
                <div className={`p-2 rounded-full bg-white ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={config.badgeVariant} className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm text-slate-900 truncate">
                    {action.activityTitle}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {action.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-slate-600 hover:text-slate-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(action.activityId, action.type, action.metadata);
                  }}
                >
                  {getActionCTA(action.type)}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
