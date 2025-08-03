"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Activity, 
  DollarSign,
  Users,
  Calendar,
  Globe,
  FileText 
} from "lucide-react";

interface PortfolioMetrics {
  activeActivities: number;
  completedActivities: number;
  totalBudget: number;
  organizationsWorkedWith: number;
  countriesReached: number;
  documentsCreated: number;
  successRate: number;
  averageProjectDuration: number;
}

interface PortfolioSummaryProps {
  metrics: PortfolioMetrics;
  userRole?: string;
}

export function PortfolioSummary({ metrics, userRole }: PortfolioSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const totalActivities = metrics.activeActivities + metrics.completedActivities;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.activeActivities}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.completedActivities}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">Total budget managed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.successRate)}</div>
            <p className="text-xs text-muted-foreground">Project completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Completion Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Project Completion</span>
              <span>{metrics.completedActivities} of {totalActivities} projects</span>
            </div>
            <Progress 
              value={totalActivities > 0 ? (metrics.completedActivities / totalActivities) * 100 : 0} 
              className="h-2"
            />
          </div>

          {/* Budget Utilization - Mock data for demonstration */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Budget Utilization</span>
              <span>85% utilized</span>
            </div>
            <Progress value={85} className="h-2" />
          </div>

          {/* Quality Score - Mock data for demonstration */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Quality Score</span>
              <span>{formatPercentage(metrics.successRate)}</span>
            </div>
            <Progress value={metrics.successRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Extended Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.organizationsWorkedWith}</div>
            <p className="text-xs text-muted-foreground">Organizations collaborated with</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geographic Reach</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.countriesReached}</div>
            <p className="text-xs text-muted-foreground">Countries reached</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentation</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.documentsCreated}</div>
            <p className="text-xs text-muted-foreground">Documents created</p>
          </CardContent>
        </Card>
      </div>

      {/* Role-specific insights */}
      {userRole && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">{userRole}</Badge>
              Role-Specific Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {userRole === 'super_user' && (
                <>
                  <div>
                    <p className="font-medium">Administrative Oversight</p>
                    <p className="text-muted-foreground">Managing {totalActivities} total activities across the platform</p>
                  </div>
                  <div>
                    <p className="font-medium">System Performance</p>
                    <p className="text-muted-foreground">Platform success rate: {formatPercentage(metrics.successRate)}</p>
                  </div>
                </>
              )}
              {userRole === 'partner_government' && (
                <>
                  <div>
                    <p className="font-medium">Government Coordination</p>
                    <p className="text-muted-foreground">Coordinating with {metrics.organizationsWorkedWith} development partners</p>
                  </div>
                  <div>
                    <p className="font-medium">National Impact</p>
                    <p className="text-muted-foreground">Supporting development across {metrics.countriesReached} regions</p>
                  </div>
                </>
              )}
              {userRole === 'development_partner' && (
                <>
                  <div>
                    <p className="font-medium">Partnership Impact</p>
                    <p className="text-muted-foreground">Contributing to {totalActivities} development initiatives</p>
                  </div>
                  <div>
                    <p className="font-medium">Investment Portfolio</p>
                    <p className="text-muted-foreground">Managing {formatCurrency(metrics.totalBudget)} in development funding</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}