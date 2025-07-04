"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Activity, 
  Globe, 
  Users,
  TrendingUp,
  Calendar,
  Target,
  FileText
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

interface OrganizationData {
  id: string;
  name: string;
  acronym?: string;
  organisation_type: string;
  country?: string;
  country_represented?: string;
  created_at: string;
  budgets?: Array<{
    value: number;
    currency: string;
    status: string;
    period_start: string;
    period_end: string;
  }>;
  expenditures?: Array<{
    value: number;
    currency: string;
    year: string;
  }>;
  activities?: Array<{
    id: string;
    title: string;
    activity_status: string;
    role: string;
    start_date?: string;
    end_date?: string;
  }>;
  transactions?: Array<{
    value: number;
    transaction_type: string;
    transaction_date: string;
  }>;
}

interface OrganizationDashboardProps {
  organization: OrganizationData;
}

export const OrganizationDashboard: React.FC<OrganizationDashboardProps> = ({
  organization
}) => {
  // Calculate financial metrics
  const calculateFinancials = () => {
    const budgets = organization.budgets || [];
    const expenditures = organization.expenditures || [];
    const transactions = organization.transactions || [];

    const totalBudget = budgets.reduce((sum, b) => sum + b.value, 0);
    const totalExpenditure = expenditures.reduce((sum, e) => sum + e.value, 0);
    
    const commitments = transactions
      .filter(t => t.transaction_type === "2")
      .reduce((sum, t) => sum + t.value, 0);
    
    const disbursements = transactions
      .filter(t => t.transaction_type === "3")
      .reduce((sum, t) => sum + t.value, 0);

    const executionRate = totalBudget > 0 ? (totalExpenditure / totalBudget) * 100 : 0;
    
    return {
      totalBudget,
      totalExpenditure,
      commitments,
      disbursements,
      executionRate: Math.min(executionRate, 100)
    };
  };

  // Calculate activity metrics
  const calculateActivityMetrics = () => {
    const activities = organization.activities || [];
    
    const activeCount = activities.filter(a => 
      a.activity_status === 'implementation' || a.activity_status === 'active'
    ).length;
    
    const completedCount = activities.filter(a => 
      a.activity_status === 'completed' || a.activity_status === 'completion'
    ).length;
    
    const pipelineCount = activities.filter(a => 
      a.activity_status === 'pipeline' || a.activity_status === 'planning'
    ).length;

    // Calculate role distribution
    const roleDistribution = activities.reduce((acc, activity) => {
      acc[activity.role] = (acc[activity.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: activities.length,
      active: activeCount,
      completed: completedCount,
      pipeline: pipelineCount,
      roleDistribution
    };
  };

  // Calculate geographic reach
  const calculateGeographicReach = () => {
    const activities = organization.activities || [];
    // This would need to be enhanced with actual location data from activities
    const uniqueCountries = new Set([organization.country, organization.country_represented].filter(Boolean));
    
    return {
      countries: uniqueCountries.size,
      regions: 1 // Simplified for now
    };
  };

  // Calculate organization age and experience
  const calculateExperience = () => {
    if (!organization.created_at) {
      return {
        yearsActive: 0,
        establishedDate: 'Not available'
      };
    }
    
    try {
      const createdDate = parseISO(organization.created_at);
      const daysSinceCreation = differenceInDays(new Date(), createdDate);
      const yearsActive = Math.floor(daysSinceCreation / 365);
      
      return {
        yearsActive,
        establishedDate: format(createdDate, 'MMM yyyy')
      };
    } catch (error) {
      console.error('Error parsing created_at date:', organization.created_at, error);
      return {
        yearsActive: 0,
        establishedDate: 'Invalid date'
      };
    }
  };

  const financials = calculateFinancials();
  const activityMetrics = calculateActivityMetrics();
  const geographic = calculateGeographicReach();
  const experience = calculateExperience();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'reporting': 'Reporting',
      'funding': 'Funding',
      'implementing': 'Implementing',
      'extending': 'Extending'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Financial Overview Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-800">
            <DollarSign className="h-5 w-5" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-blue-600 font-medium">Total Budget</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(financials.totalBudget)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">Total Expenditure</p>
            <p className="text-xl font-semibold text-blue-800">
              {formatCurrency(financials.totalExpenditure)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">Execution Rate</p>
            <div className="flex items-center gap-2">
              <Progress value={financials.executionRate} className="flex-1 h-2" />
              <span className="text-sm font-semibold text-blue-700">
                {financials.executionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Portfolio Card */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-800">
            <Activity className="h-5 w-5" />
            Activity Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-green-600 font-medium">Total Activities</p>
            <p className="text-2xl font-bold text-green-900">
              {activityMetrics.total}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="font-semibold text-green-800">{activityMetrics.active}</p>
              <p className="text-green-600">Active</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-green-800">{activityMetrics.completed}</p>
              <p className="text-green-600">Completed</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-green-800">{activityMetrics.pipeline}</p>
              <p className="text-green-600">Pipeline</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(activityMetrics.roleDistribution).map(([role, count]) => (
              <Badge key={role} variant="outline" className="text-xs border-green-300 text-green-700">
                {getRoleDisplayName(role)}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Geographic Reach Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-purple-800">
            <Globe className="h-5 w-5" />
            Geographic Reach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-purple-600 font-medium">Countries</p>
            <p className="text-2xl font-bold text-purple-900">
              {geographic.countries}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-600 font-medium">Primary Country</p>
            <p className="text-lg font-semibold text-purple-800">
              {organization.country_represented || organization.country || 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-600 font-medium">Organization Type</p>
            <Badge variant="outline" className="border-purple-300 text-purple-700">
              {organization.organisation_type}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Experience & Performance Card */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-800">
            <TrendingUp className="h-5 w-5" />
            Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-orange-600 font-medium">Years Active</p>
            <p className="text-2xl font-bold text-orange-900">
              {experience.yearsActive}
            </p>
          </div>
          <div>
            <p className="text-sm text-orange-600 font-medium">Established</p>
            <p className="text-lg font-semibold text-orange-800">
              {experience.establishedDate}
            </p>
          </div>
          <div>
            <p className="text-sm text-orange-600 font-medium">Avg. Project Value</p>
            <p className="text-lg font-semibold text-orange-700">
              {activityMetrics.total > 0 
                ? formatCurrency(financials.totalBudget / activityMetrics.total)
                : formatCurrency(0)
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};