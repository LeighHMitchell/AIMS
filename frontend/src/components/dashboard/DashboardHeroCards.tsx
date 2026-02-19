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
  HelpCircle,
} from 'lucide-react';

interface DashboardHeroCardsProps {
  organizationId: string;
  userId: string;
}

interface DualMetricCardProps {
  title: string;
  icon: React.ElementType;
  helpText: string;
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
  className?: string;
}

function DualMetricCard({
  title,
  icon: Icon,
  helpText,
  leftMetric,
  rightMetric,
  onTitleClick,
  className,
}: DualMetricCardProps) {
  return (
    <TooltipProvider>
      <Card className={`bg-white hover:shadow-md transition-shadow ${className || ''}`}>
        <CardContent className="p-5">
          {/* Card Title */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`flex items-center gap-2 ${onTitleClick ? 'cursor-pointer hover:text-primary' : ''}`}
              onClick={onTitleClick}
            >
              <Icon className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">{title}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
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

function DualMetricCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={`bg-white ${className || ''}`}>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <DualMetricCardSkeleton className="lg:col-span-2" />
        <DualMetricCardSkeleton />
        <DualMetricCardSkeleton />
        <DualMetricCardSkeleton />
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Card 1: Budgets & Planned Disbursements (2-col span) */}
      <DualMetricCard
        title="Budgets & Planned Disbursements"
        icon={Wallet}
        helpText="Total budget records and planned disbursement records across all your organisation's activities. Budgets define planned spending; planned disbursements define expected fund transfers."
        className="lg:col-span-2"
        leftMetric={{
          value: stats?.orgBudgetCount ?? 0,
          label: 'Budgets',
          tooltip: 'Total budget records across all your organisation\'s activities',
        }}
        rightMetric={{
          value: stats?.orgPlannedDisbursementCount ?? 0,
          label: 'Planned Disbursements',
          tooltip: 'Total planned disbursement records across all your organisation\'s activities',
        }}
      />

      {/* Card 2: Financial Transactions */}
      <DualMetricCard
        title="Financial Transactions"
        icon={ArrowRightLeft}
        helpText="Financial transactions where your organisation is involved — either as the reporting organisation, provider, or receiver of funds."
        leftMetric={{
          value: stats?.orgTransactionCount ?? 0,
          label: 'Organisation',
          onClick: () => navigateToActivities('tab=transactions'),
          tooltip: 'All transactions involving your organisation (as reporter, provider, or receiver)',
        }}
        rightMetric={{
          value: stats?.userTransactionCount ?? 0,
          label: 'Reported by you',
          onClick: () => navigateToActivities('tab=transactions&createdBy=me'),
          tooltip: 'Transactions you have personally created or submitted',
        }}
      />

      {/* Card 3: Validation Status */}
      <DualMetricCard
        title="Validation Status"
        icon={ClipboardCheck}
        helpText="Government validation status of your organisation's activities. Activities must be submitted for review and then validated by the relevant authority."
        leftMetric={{
          value: stats?.pendingValidationCount ?? 0,
          label: 'Pending validation',
          onClick: () => navigateToActivities('submissionStatuses=submitted'),
          tooltip: 'Activities submitted and awaiting government review',
        }}
        rightMetric={{
          value: stats?.validatedCount ?? 0,
          label: 'Validated',
          onClick: () => navigateToActivities('submissionStatuses=validated'),
          tooltip: 'Activities reviewed and approved by the government',
        }}
        onTitleClick={() => navigateToActivities('submissionStatuses=submitted,validated')}
      />

      {/* Card 4: Activities */}
      <DualMetricCard
        title="Activities"
        icon={FileText}
        helpText="Publication status of your organisation's activities. Published activities are visible publicly; draft activities are still being prepared."
        leftMetric={{
          value: stats?.publishedCount ?? 0,
          label: 'Published',
          onClick: () => navigateToActivities('publicationStatus=published'),
          tooltip: 'Activities that have been published and are publicly visible',
        }}
        rightMetric={{
          value: stats?.draftCount ?? 0,
          label: 'Draft',
          onClick: () => navigateToActivities('publicationStatus=draft'),
          tooltip: 'Activities still in draft form, not yet published',
        }}
        onTitleClick={() => navigateToActivities()}
      />
    </div>
  );
}
