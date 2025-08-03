"use client"

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  User, 
  Building2, 
  Activity, 
  TrendingUp,
  Calendar,
  Globe,
  FileText,
  Users,
  BarChart3,
  Target,
  Clock
} from "lucide-react";
import { ROLE_LABELS, USER_ROLES } from "@/types/user";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { ActivityContributions } from "@/components/portfolio/ActivityContributions";

export default function PortfolioPage() {
  const { user } = useUser();
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    activeActivities: 0,
    completedActivities: 0,
    totalBudget: 0,
    organizationsWorkedWith: 0,
    countriesReached: 0,
    documentsCreated: 0,
    successRate: 0,
    averageProjectDuration: 0,
  });
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  // Mock data - in a real implementation, this would come from APIs
  useEffect(() => {
    // Simulate loading user's portfolio data
    setPortfolioMetrics({
      activeActivities: 12,
      completedActivities: 28,
      totalBudget: 4500000,
      organizationsWorkedWith: 8,
      countriesReached: 5,
      documentsCreated: 42,
      successRate: 87.5,
      averageProjectDuration: 18,
    });
    setLastLogin(user?.lastLogin || new Date().toISOString());
  }, [user]);

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </MainLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-8 w-8 text-gray-900" />
            <h1 className="text-3xl font-bold">My Portfolio</h1>
          </div>
          <p className="text-muted-foreground">
            Overview of your activities, contributions, and performance metrics
          </p>
        </div>

        {/* User Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* User Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {user.organization?.name || "No organization"}
              </p>
            </CardContent>
          </Card>

          {/* Active Activities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{portfolioMetrics.activeActivities}</div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          {/* Completed Activities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{portfolioMetrics.completedActivities}</div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>

          {/* Portfolio Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioMetrics.totalBudget)}</div>
              <p className="text-xs text-muted-foreground">
                Total budget managed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <PortfolioSummary 
              metrics={portfolioMetrics} 
              userRole={ROLE_LABELS[user.role]} 
            />
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-6">
            <ActivityContributions 
              contributions={[]} 
              userRole={user.role}
            />
          </TabsContent>

          {/* Contributions Tab */}
          <TabsContent value="contributions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recent Contributions
                </CardTitle>
                <CardDescription>
                  Your recent edits, updates, and collaborative work
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Contribution Tracking Coming Soon</p>
                  <p className="text-sm">This section will show your recent edits, comments, and collaborative activities.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Analytics
                </CardTitle>
                <CardDescription>
                  Detailed metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Analytics Dashboard Coming Soon</p>
                  <p className="text-sm">This section will provide detailed analytics and performance metrics.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}