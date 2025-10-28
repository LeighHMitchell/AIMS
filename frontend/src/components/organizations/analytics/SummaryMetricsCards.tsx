"use client";

import React from 'react';
import { HeroCard } from '@/components/ui/hero-card';
import { Activity, DollarSign, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface YearMetrics {
  activeProjects: number;
  commitments: number;
  disbursements: number;
  expenditures: number;
}

interface SummaryMetricsCardsProps {
  currentYear: YearMetrics;
  previousYear: YearMetrics;
  currency?: string;
}

export function SummaryMetricsCards({
  currentYear,
  previousYear,
  currency = 'USD'
}: SummaryMetricsCardsProps) {
  
  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatDelta = (current: number, previous: number) => {
    const delta = current - previous;
    const deltaPercent = calculateDelta(current, previous);
    const isPositive = delta >= 0;
    
    return {
      delta,
      deltaPercent,
      isPositive,
      display: `${isPositive ? '+' : ''}${delta.toLocaleString()} (${isPositive ? '+' : ''}${deltaPercent.toFixed(1)}%)`
    };
  };

  const projectsDelta = formatDelta(currentYear.activeProjects, previousYear.activeProjects);
  const commitmentsDelta = formatDelta(currentYear.commitments, previousYear.commitments);
  const disbursementsDelta = formatDelta(currentYear.disbursements, previousYear.disbursements);
  const expendituresDelta = formatDelta(currentYear.expenditures, previousYear.expenditures);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Active Projects */}
      <div className="relative">
        <HeroCard
          title="Active Projects"
          staticValue={currentYear.activeProjects}
          currency=""
          subtitle="in current portfolio"
          variant={projectsDelta.isPositive ? 'success' : 'default'}
          helpText="Total number of active projects in the organization's portfolio"
        />
        {previousYear.activeProjects > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {projectsDelta.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={projectsDelta.isPositive ? 'text-green-600' : 'text-red-600'}>
              {projectsDelta.display} from previous year
            </span>
          </div>
        )}
      </div>

      {/* Total Commitments */}
      <div className="relative">
        <HeroCard
          title="Total Commitments"
          staticValue={currentYear.commitments}
          currency={currency}
          subtitle="committed funds (2025)"
          variant="default"
          helpText="Total financial commitments made by or to the organization in 2025"
        />
        {previousYear.commitments > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {commitmentsDelta.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={commitmentsDelta.isPositive ? 'text-green-600' : 'text-red-600'}>
              {commitmentsDelta.isPositive ? '+' : ''}{commitmentsDelta.deltaPercent.toFixed(1)}% from 2024
            </span>
          </div>
        )}
      </div>

      {/* Total Disbursements */}
      <div className="relative">
        <HeroCard
          title="Total Disbursements"
          staticValue={currentYear.disbursements}
          currency={currency}
          subtitle="funds disbursed (2025)"
          variant="default"
          helpText="Total funds disbursed to or from the organization in 2025"
        />
        {previousYear.disbursements > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {disbursementsDelta.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={disbursementsDelta.isPositive ? 'text-green-600' : 'text-red-600'}>
              {disbursementsDelta.isPositive ? '+' : ''}{disbursementsDelta.deltaPercent.toFixed(1)}% from 2024
            </span>
          </div>
        )}
      </div>

      {/* Total Expenditures */}
      <div className="relative">
        <HeroCard
          title="Total Expenditures"
          staticValue={currentYear.expenditures}
          currency={currency}
          subtitle="total spent (2025)"
          variant="default"
          helpText="Total expenditures reported by the organization in 2025"
        />
        {previousYear.expenditures > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {expendituresDelta.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={expendituresDelta.isPositive ? 'text-green-600' : 'text-red-600'}>
              {expendituresDelta.isPositive ? '+' : ''}{expendituresDelta.deltaPercent.toFixed(1)}% from 2024
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

