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
  Activity,
  ClipboardCheck,
  FileText,
  HelpCircle,
} from 'lucide-react';
import {
  FinancialTransactionsIcon,
  PlannedDisbursementsIcon,
  BudgetsIcon,
} from '@/lib/dashboard-icons';

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
      <Card className={`bg-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)] transition-shadow h-full ${className || ''}`}>
        <CardContent className="p-5">
          {/* Card Title */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`flex items-center gap-2 ${onTitleClick ? 'cursor-pointer hover:text-primary' : ''}`}
              onClick={onTitleClick}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-body font-medium text-muted-foreground">{title}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-body">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Dual Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Metric */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${leftMetric.onClick ? 'cursor-pointer hover:bg-muted rounded-lg p-2 -m-2' : ''}`}
                  onClick={leftMetric.onClick}
                >
                  <p className="text-2xl font-bold text-foreground">
                    {leftMetric.value.toLocaleString()}
                  </p>
                  <p className="text-helper text-muted-foreground mt-1">{leftMetric.label}</p>
                </div>
              </TooltipTrigger>
              {leftMetric.tooltip && (
                <TooltipContent>
                  <p className="text-body">{leftMetric.tooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>

            {/* Right Metric */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${rightMetric.onClick ? 'cursor-pointer hover:bg-muted rounded-lg p-2 -m-2' : ''}`}
                  onClick={rightMetric.onClick}
                >
                  <p className="text-2xl font-bold text-foreground">
                    {rightMetric.value.toLocaleString()}
                  </p>
                  <p className="text-helper text-muted-foreground mt-1">{rightMetric.label}</p>
                </div>
              </TooltipTrigger>
              {rightMetric.tooltip && (
                <TooltipContent>
                  <p className="text-body">{rightMetric.tooltip}</p>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[2fr_1fr_2fr_4fr]">
        <DualMetricCardSkeleton />
        <DualMetricCardSkeleton />
        <DualMetricCardSkeleton />
        <DualMetricCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <p className="text-body text-destructive">Failed to load dashboard statistics: {error}</p>
      </div>
    );
  }

  return (
    <StaggerContainer className="grid gap-3 grid-cols-2 lg:grid-cols-[2fr_1fr_2fr_4fr]">
      {/* Card 1: Financial Transactions */}
      <StaggerItem>
        <DualMetricCard
          title="Financial Transactions"
          icon={FinancialTransactionsIcon}
          helpText="Financial transactions where your organisation is involved — either as the reporting organisation, provider, or receiver of funds."
          leftMetric={{
            value: stats?.orgTransactionCount ?? 0,
            label: 'Your Organisation',
            tooltip: 'All transactions involving your organisation (as reporter, provider, or receiver)',
          }}
          rightMetric={{
            value: stats?.otherOrgTransactionCount ?? 0,
            label: 'Other Organisations',
            tooltip: 'Transactions reported by other organisations where your organisation is a provider or receiver',
          }}
        />
      </StaggerItem>

      {/* Card 2: Budgets */}
      <StaggerItem>
        <TooltipProvider>
          <Card className="bg-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)] transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <BudgetsIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body font-medium text-muted-foreground">Budgets</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-body">Budget records across all your organisation&apos;s activities.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {(stats?.orgBudgetCount ?? 0).toLocaleString()}
              </p>
              <p className="text-helper text-muted-foreground mt-1">Your Organisation</p>
            </CardContent>
          </Card>
        </TooltipProvider>
      </StaggerItem>

      {/* Card 3: Planned Disbursements */}
      <StaggerItem>
        <DualMetricCard
          title="Planned Disbursements"
          icon={PlannedDisbursementsIcon}
          helpText="Planned disbursement records across all your organisation's activities. These define expected fund transfers."
          leftMetric={{
            value: stats?.orgPlannedDisbursementCount ?? 0,
            label: 'Your Organisation',
            tooltip: 'Total planned disbursement records across all your organisation\'s activities',
          }}
          rightMetric={{
            value: stats?.otherOrgPlannedDisbursementCount ?? 0,
            label: 'Other Organisations',
            tooltip: 'Planned disbursements reported by other organisations where your organisation is a provider or receiver',
          }}
        />
      </StaggerItem>

      {/* Card 3: Activities Overview (Validation + Publication + Status) */}
      <StaggerItem className="col-span-2 lg:col-span-1">
        <TooltipProvider>
          <Card className="bg-white hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)] transition-shadow h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-body font-medium text-muted-foreground">Activities</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-body">Overview of your organisation&apos;s activities by publication status, validation status, and activity lifecycle stage.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="grid grid-cols-3 gap-0">
                {/* Section 1: Publication Status */}
                <div className="pr-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{(stats?.publishedCount ?? 0).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Published</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities that have been published and are publicly visible</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{(stats?.draftCount ?? 0).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Draft</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities still in draft form, not yet published</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Section 2: Validation Status */}
                <div className="px-4 border-l border-border min-w-0">
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{(stats?.pendingValidationCount ?? 0).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Pending</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities submitted and awaiting government review</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{(stats?.validatedCount ?? 0).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Validated</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities reviewed and approved by the government</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{(stats?.rejectedCount ?? 0).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Rejected</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities that were reviewed and rejected by the government</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Section 3: Activity Status */}
                <div className="pl-4 border-l border-border min-w-0">
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{(stats?.pipelineCount ?? 0).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Pipeline</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities in the pipeline/planning stage</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{((stats?.implementationCount ?? 0) + (stats?.finalisationCount ?? 0)).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Active</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities in implementation or finalisation stage</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default">
                          <p className="text-2xl font-bold text-foreground">{(stats?.closedCount ?? 0).toLocaleString()}</p>
                          <p className="text-helper text-muted-foreground mt-1">Closed</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-body">Activities that have been closed</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipProvider>
      </StaggerItem>
    </StaggerContainer>
  );
}
