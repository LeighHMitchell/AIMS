"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDashboardHeroStats } from '@/hooks/useDashboardHeroStats';
import {
  ClipboardCheck,
  FileText,
  ArrowRightLeft,
  Wallet,
} from 'lucide-react';

interface DashboardHeroCardsProps {
  organizationId: string;
  userId: string;
}

interface DualMetricCardProps {
  title: string;
  icon: React.ElementType;
  leftMetric: {
    value: number;
    label: string;
    onClick?: () => void;
    tooltip?: string;
  };
  rightMetric: {
    value: number;
    label: string;
    onClick?: () => void;
    tooltip?: string;
  };
  onTitleClick?: () => void;
}

function DualMetricCard({
  title,
  icon: Icon,
  leftMetric,
  rightMetric,
  onTitleClick,
}: DualMetricCardProps) {
  return (
    <TooltipProvider>
      <Card className="bg-white hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          {/* Card Title */}
          <div
            className={`flex items-center gap-2 mb-4 ${onTitleClick ? 'cursor-pointer hover:text-primary' : ''}`}
            onClick={onTitleClick}
          >
            <Icon className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">{title}</span>
          </div>

          {/* Dual Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Metric */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${leftMetric.onClick ? 'cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2' : ''}`}
                  onClick={leftMetric.onClick}
                >
                  <p className="text-2xl font-bold text-slate-900">
                    {leftMetric.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{leftMetric.label}</p>
                </div>
              </TooltipTrigger>
              {leftMetric.tooltip && (
                <TooltipContent>
                  <p className="text-sm">{leftMetric.tooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Right Metric */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${rightMetric.onClick ? 'cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2' : ''}`}
                  onClick={rightMetric.onClick}
                >
                  <p className="text-2xl font-bold text-slate-900">
                    {rightMetric.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{rightMetric.label}</p>
                </div>
              </TooltipTrigger>
              {rightMetric.tooltip && (
                <TooltipContent>
                  <p className="text-sm">{rightMetric.tooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function DualMetricCardSkeleton() {
  return (
    <Card className="bg-white">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardHeroCards({ organizationId, userId }: DashboardHeroCardsProps) {
  const router = useRouter();
  const { stats, loading, error } = useDashboardHeroStats(organizationId, userId);

  // Navigation handlers
  const navigateToActivities = (filter?: string) => {
    if (filter) {
      router.push(`/activities?${filter}`);
    } else {
      router.push('/activities');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <DualMetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">Failed to load dashboard statistics: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Validation Status */}
      <DualMetricCard
        title="Validation Status"
        icon={ClipboardCheck}
        leftMetric={{
          value: stats?.pendingValidationCount ?? 0,
          label: 'Pending validation',
          onClick: () => navigateToActivities('submissionStatuses=submitted'),
          tooltip: 'Activities submitted for government review',
        }}
        rightMetric={{
          value: stats?.validatedCount ?? 0,
          label: 'Validated',
          onClick: () => navigateToActivities('submissionStatuses=validated'),
          tooltip: 'Activities approved by government',
        }}
        onTitleClick={() => navigateToActivities('submissionStatuses=submitted,validated')}
      />

      {/* Card 2: Activities */}
      <DualMetricCard
        title="Activities"
        icon={FileText}
        leftMetric={{
          value: stats?.publishedCount ?? 0,
          label: 'Published',
          onClick: () => navigateToActivities('publicationStatus=published'),
          tooltip: 'Activities with published or public state',
        }}
        rightMetric={{
          value: stats?.draftCount ?? 0,
          label: 'Draft',
          onClick: () => navigateToActivities('publicationStatus=draft'),
          tooltip: 'Activities not yet published',
        }}
        onTitleClick={() => navigateToActivities()}
      />

      {/* Card 3: Financial Transactions */}
      <DualMetricCard
        title="Financial Transactions"
        icon={ArrowRightLeft}
        leftMetric={{
          value: stats?.orgTransactionCount ?? 0,
          label: 'Organisation',
          onClick: () => navigateToActivities('tab=transactions'),
          tooltip: 'All transactions reported by your organisation',
        }}
        rightMetric={{
          value: stats?.userTransactionCount ?? 0,
          label: 'Reported by you',
          onClick: () => navigateToActivities('tab=transactions&createdBy=me'),
          tooltip: 'Transactions you have created or submitted',
        }}
      />

      {/* Card 4: Budgets & Planned Disbursements */}
      <DualMetricCard
        title="Budgets & Disbursements"
        icon={Wallet}
        leftMetric={{
          value: stats?.orgBudgetAndDisbursementCount ?? 0,
          label: 'Organisation',
          tooltip: `Budgets: ${stats?.orgBudgetCount ?? 0}\nPlanned Disbursements: ${stats?.orgPlannedDisbursementCount ?? 0}`,
        }}
        rightMetric={{
          value: stats?.userBudgetAndDisbursementCount ?? 0,
          label: 'Reported by you',
          tooltip: `Budgets: ${stats?.userBudgetCount ?? 0}\nPlanned Disbursements: ${stats?.userPlannedDisbursementCount ?? 0}`,
        }}
      />
    </div>
  );
}
