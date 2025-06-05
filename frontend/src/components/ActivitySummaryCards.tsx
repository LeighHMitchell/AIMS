"use client"

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Globe,
  Eye,
  DollarSign,
  TrendingUp,
  BarChart3,
  Activity as ActivityIcon,
  Filter,
  PieChart
} from "lucide-react";
import { Transaction, LEGACY_TRANSACTION_TYPE_MAP } from "@/types/transaction";

interface Activity {
  id: string;
  title: string;
  activityStatus?: string;
  publicationStatus?: string;
  status?: string;
  transactions?: Transaction[];
  createdAt: string;
  updatedAt: string;
}

interface ActivitySummaryCardsProps {
  allActivities: Activity[];
  filteredActivities: Activity[];
  currentPageActivities: Activity[];
  hasFiltersApplied: boolean;
}

const ActivitySummaryCards: React.FC<ActivitySummaryCardsProps> = ({
  allActivities,
  filteredActivities,
  currentPageActivities,
  hasFiltersApplied
}) => {
  // Calculate totals for transactions
  const calculateFinancialTotals = (activities: Activity[]) => {
    let totalCommitment = 0;
    let totalDisbursement = 0;

    activities.forEach(activity => {
      if (activity.transactions) {
        const actualTransactions = activity.transactions.filter(t => t.status === "actual");
        
        actualTransactions.forEach(transaction => {
          const normalizedType = LEGACY_TRANSACTION_TYPE_MAP[transaction.type] || transaction.type;
          if (normalizedType === "C") {
            totalCommitment += transaction.value;
          } else if (normalizedType === "D") {
            totalDisbursement += transaction.value;
          }
        });
      }
    });

    return { totalCommitment, totalDisbursement };
  };

  // Calculate status breakdown
  const calculateStatusBreakdown = (activities: Activity[]) => {
    const statusCounts: Record<string, number> = {
      planning: 0,
      implementation: 0,
      completed: 0,
      cancelled: 0,
      draft: 0,
      published: 0
    };

    activities.forEach(activity => {
      // Activity status
      const activityStatus = activity.activityStatus || 
        (activity.status && !["published", "draft"].includes(activity.status) ? activity.status : "planning");
      statusCounts[activityStatus] = (statusCounts[activityStatus] || 0) + 1;

      // Publication status
      const publicationStatus = activity.publicationStatus || 
        (activity.status === "published" ? "published" : "draft");
      statusCounts[publicationStatus] = (statusCounts[publicationStatus] || 0) + 1;
    });

    return statusCounts;
  };

  // Memoized calculations
  const globalMetrics = useMemo(() => {
    const financials = calculateFinancialTotals(allActivities);
    const statusBreakdown = calculateStatusBreakdown(allActivities);
    return {
      totalActivities: allActivities.length,
      ...financials,
      statusBreakdown
    };
  }, [allActivities]);

  const visibleMetrics = useMemo(() => {
    const financials = calculateFinancialTotals(currentPageActivities);
    const statusBreakdown = calculateStatusBreakdown(currentPageActivities);
    return {
      totalActivities: currentPageActivities.length,
      ...financials,
      statusBreakdown
    };
  }, [currentPageActivities]);

  const filteredMetrics = useMemo(() => {
    const financials = calculateFinancialTotals(filteredActivities);
    const statusBreakdown = calculateStatusBreakdown(filteredActivities);
    return {
      totalActivities: filteredActivities.length,
      ...financials,
      statusBreakdown
    };
  }, [filteredActivities]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value >= 1000000 ? 'compact' : 'standard',
      compactDisplay: 'short'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate disbursement progress
  const globalDisbursementRate = globalMetrics.totalCommitment > 0 
    ? (globalMetrics.totalDisbursement / globalMetrics.totalCommitment) * 100 
    : 0;
  
  const visibleDisbursementRate = visibleMetrics.totalCommitment > 0 
    ? (visibleMetrics.totalDisbursement / visibleMetrics.totalCommitment) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Global Activity Count */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              Total System Activities
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xl font-semibold text-gray-900">
            {formatNumber(globalMetrics.totalActivities)}
          </div>
          <p className="text-xs text-muted-foreground">
            Across all organizations
          </p>
        </CardContent>
      </Card>

      {/* Visible Activity Count */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-green-600" />
              {hasFiltersApplied ? "Filtered" : "Visible"} Activities
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xl font-semibold text-gray-900">
            {formatNumber(visibleMetrics.totalActivities)}
          </div>
          <p className="text-xs text-muted-foreground">
            {hasFiltersApplied 
              ? `${formatNumber(filteredMetrics.totalActivities)} match filters`
              : "Currently displayed"
            }
          </p>
        </CardContent>
      </Card>

      {/* Global Committed Funds */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-purple-600" />
              Total System Committed
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xl font-semibold text-gray-900">
            {formatCurrency(globalMetrics.totalCommitment)}
          </div>
          <div className="mt-1.5">
            <Progress 
              value={globalDisbursementRate} 
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {globalDisbursementRate.toFixed(1)}% disbursed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visible Committed Funds */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-orange-600" />
              {hasFiltersApplied ? "Filtered" : "Visible"} Committed
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xl font-semibold text-gray-900">
            {formatCurrency(visibleMetrics.totalCommitment)}
          </div>
          <div className="mt-1.5">
            <Progress 
              value={visibleDisbursementRate} 
              className="h-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {visibleDisbursementRate.toFixed(1)}% disbursed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Disbursed Funds */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              Total System Disbursed
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xl font-semibold text-gray-900">
            {formatCurrency(globalMetrics.totalDisbursement)}
          </div>
          <p className="text-xs text-muted-foreground">
            Funds transferred
          </p>
        </CardContent>
      </Card>

      {/* Visible Disbursed Funds */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-teal-600" />
              {hasFiltersApplied ? "Filtered" : "Visible"} Disbursed
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xl font-semibold text-gray-900">
            {formatCurrency(visibleMetrics.totalDisbursement)}
          </div>
          <p className="text-xs text-muted-foreground">
            Current view total
          </p>
        </CardContent>
      </Card>

      {/* Global Status Breakdown */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-600" />
              System Activity Status
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Planning</span>
              <Badge variant="default" className="text-xs rounded-md px-2 py-0.5">
                {formatNumber(globalMetrics.statusBreakdown.planning || 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Implementation</span>
              <Badge variant="secondary" className="text-xs rounded-md px-2 py-0.5">
                {formatNumber(globalMetrics.statusBreakdown.implementation || 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Published</span>
              <Badge variant="success" className="text-xs rounded-md px-2 py-0.5">
                {formatNumber(globalMetrics.statusBreakdown.published || 0)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visible Status Breakdown */}
      <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-pink-600" />
              {hasFiltersApplied ? "Filtered" : "Visible"} Status
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Planning</span>
              <Badge variant="default" className="text-xs rounded-md px-2 py-0.5">
                {formatNumber(visibleMetrics.statusBreakdown.planning || 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Implementation</span>
              <Badge variant="secondary" className="text-xs rounded-md px-2 py-0.5">
                {formatNumber(visibleMetrics.statusBreakdown.implementation || 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Published</span>
              <Badge variant="success" className="text-xs rounded-md px-2 py-0.5">
                {formatNumber(visibleMetrics.statusBreakdown.published || 0)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivitySummaryCards; 