"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/stagger';
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
      <Card className={`bg-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)] transition-shadow ${className || ''}`}>
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
    <StaggerContainer className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {/* Card 1: Financial Transactions */}
      <StaggerItem>
        <DualMetricCard
          title="Financial Transactions"
          icon={ArrowRightLeft}
          helpText="Financial transactions where your organisation is involved — either as the reporting organisation, provider, or receiver of funds."
          leftMetric={{
            value: stats?.orgTransactionCount ?? 0,
            label: 'Your Organisation',
            tooltip: 'All transactions involving your organisation (as reporter, provider, or receiver)',
          }}
          rightMetric={{
            value: stats?.userTransactionCount ?? 0,
            label: 'By you',
            tooltip: 'Transactions you have personally created or submitted',
          }}
        />
      </StaggerItem>

      {/* Card 2: Budgets */}
      <StaggerItem>
        <DualMetricCard
          title="Budgets"
          icon={Wallet}
          helpText="Budget records across all your organisation's activities. Budgets define planned spending over a given period."
          leftMetric={{
            value: stats?.orgBudgetCount ?? 0,
            label: 'Your Organisation',
            tooltip: 'Total budget records across all your organisation\'s activities',
          }}
          rightMetric={{
            value: stats?.userBudgetCount ?? 0,
            label: 'By you',
            tooltip: 'Budget records you have personally created',
          }}
        />
      </StaggerItem>

      {/* Card 3: Planned Disbursements */}
      <StaggerItem>
        <DualMetricCard
          title="Planned Disbursements"
          icon={Wallet}
          helpText="Planned disbursement records across all your organisation's activities. These define expected fund transfers."
          leftMetric={{
            value: stats?.orgPlannedDisbursementCount ?? 0,
            label: 'Your Organisation',
            tooltip: 'Total planned disbursement records across all your organisation\'s activities',
          }}
          rightMetric={{
            value: stats?.userPlannedDisbursementCount ?? 0,
            label: 'By you',
            tooltip: 'Planned disbursement records you have personally created',
          }}
        />
      </StaggerItem>

      {/* Card 3: Validation Status */}
      <StaggerItem>
        <DualMetricCard
          title="Validation Status"
          icon={ClipboardCheck}
          helpText="Government validation status of your organisation's activities. Activities must be submitted for review and then validated by the relevant authority."
          leftMetric={{
            value: stats?.pendingValidationCount ?? 0,
            label: 'Pending validation',
            tooltip: 'Activities submitted and awaiting government review',
          }}
          rightMetric={{
            value: stats?.validatedCount ?? 0,
            label: 'Validated',
            tooltip: 'Activities reviewed and approved by the government',
          }}
        />
      </StaggerItem>

      {/* Card 4: Activities */}
      <StaggerItem>
        <DualMetricCard
          title="Activities"
          icon={FileText}
          helpText="Publication status of your organisation's activities. Published activities are visible publicly; draft activities are still being prepared."
          leftMetric={{
            value: stats?.publishedCount ?? 0,
            label: 'Published',
            tooltip: 'Activities that have been published and are publicly visible',
          }}
          rightMetric={{
            value: stats?.draftCount ?? 0,
            label: 'Draft',
            tooltip: 'Activities still in draft form, not yet published',
          }}
        />
      </StaggerItem>
    </StaggerContainer>
  );
}
