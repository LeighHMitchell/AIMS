"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Building2, 
  User, 
  Calendar,
  TrendingUp,
  Wallet,
  Target,
  Clock
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

interface Transaction {
  transaction_type: string;
  value: string | number;
  value_usd?: number;
}

interface Budget {
  value: string | number;
  usd_value?: number;
}

interface ActivityHeroCardsProps {
  activity: {
    id: string;
    title: string;
    created_by_org_name?: string;
    created_by_org_acronym?: string;
    createdBy?: { id: string; name: string; role: string };
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    activityStatus?: string;
    transactions?: Transaction[];
    budgets?: Budget[];
  };
  partners?: Array<{ id: string; name: string; acronym?: string; code?: string }>;
}

export const ActivityHeroCards: React.FC<ActivityHeroCardsProps> = ({ 
  activity, 
  partners = [] 
}) => {
  // Calculate financial metrics
  const calculateFinancials = () => {
    const transactions = activity?.transactions || [];
    
    const totalCommitment = transactions
      .filter((t: Transaction) => t.transaction_type === "2")
      .reduce((sum: number, t: Transaction) => sum + (parseFloat(String(t.value_usd)) || 0), 0);
    
    const totalDisbursement = transactions
      .filter((t: Transaction) => t.transaction_type === "3")
      .reduce((sum: number, t: Transaction) => sum + (parseFloat(String(t.value_usd)) || 0), 0);
    
    const totalExpenditure = transactions
      .filter((t: Transaction) => t.transaction_type === "4")
      .reduce((sum: number, t: Transaction) => sum + (parseFloat(String(t.value_usd)) || 0), 0);

    const totalSpent = totalDisbursement + totalExpenditure;
    
    // Calculate planned budget from budgets
    const budgets = activity?.budgets || [];
    const totalPlannedBudget = budgets.reduce((sum: number, b: Budget) => sum + (parseFloat(String(b.usd_value)) || 0), 0);
    
    return {
      totalCommitment,
      totalDisbursement,
      totalExpenditure,
      totalSpent,
      totalPlannedBudget: totalPlannedBudget > 0 ? totalPlannedBudget : totalCommitment
    };
  };

  // Calculate activity progress based on dates
  const calculateActivityProgress = () => {
    const startDate = activity?.actualStartDate || activity?.plannedStartDate;
    const endDate = activity?.actualEndDate || activity?.plannedEndDate;
    
    if (!startDate || !endDate) return { progress: 0, status: "No dates set" };
    
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const now = new Date();
      
      const totalDays = differenceInDays(end, start);
      const elapsedDays = differenceInDays(now, start);
      
      if (elapsedDays < 0) {
        return { progress: 0, status: "Not started" };
      } else if (elapsedDays > totalDays) {
        return { progress: 100, status: "Completed" };
      } else {
        const progress = Math.round((elapsedDays / totalDays) * 100);
        return { progress, status: "In progress" };
      }
    } catch (error) {
      return { progress: 0, status: "Invalid dates" };
    }
  };

  const financials = calculateFinancials();
  const activityProgress = calculateActivityProgress();

  // Find creator organization
  const creatorOrg = partners.find(p => p.id === activity.createdBy?.id) || 
    { id: '', name: activity.created_by_org_name || 'Unknown Organization', acronym: activity.created_by_org_acronym };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Funds Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-800">
            <Wallet className="h-5 w-5" />
            Total Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-blue-600 font-medium">Total Budgeted</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(financials.totalPlannedBudget)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">Total Committed</p>
            <p className="text-xl font-semibold text-blue-800">
              {formatCurrency(financials.totalCommitment)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">Total Spent</p>
            <p className="text-xl font-semibold text-blue-700">
              {formatCurrency(financials.totalSpent)}
            </p>
            <p className="text-xs text-blue-500">
              Disbursement: {formatCurrency(financials.totalDisbursement)} | 
              Expenditure: {formatCurrency(financials.totalExpenditure)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organization & Creator Card */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-800">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-green-600 font-medium">Reporting Organization</p>
            <p className="text-lg font-bold text-green-900">
              {creatorOrg.acronym || creatorOrg.code || creatorOrg.name}
            </p>
            {activity.created_by_org_acronym && (
              <p className="text-sm text-green-700">
                {activity.created_by_org_name}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-green-600 font-medium">Reported by</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-700" />
              <p className="text-sm font-semibold text-green-800">
                {activity.createdBy?.name || 'Unknown User'}
              </p>
            </div>
            {activity.createdBy?.role && (
              <Badge variant="outline" className="text-xs mt-1 border-green-300 text-green-700">
                {activity.createdBy.role}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Progress Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-purple-800">
            <Clock className="h-5 w-5" />
            Activity Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-purple-600 font-medium">Timeline Progress</p>
              <Badge 
                variant="outline" 
                className="text-xs border-purple-300 text-purple-700"
              >
                {activityProgress.status}
              </Badge>
            </div>
            <Progress 
              value={activityProgress.progress} 
              className="h-3 bg-purple-200"
            />
            <p className="text-2xl font-bold text-purple-900 mt-2">
              {activityProgress.progress}%
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-purple-600" />
              <span className="text-purple-600">Start:</span>
              <span className="text-purple-800 font-medium">
                {formatDate(activity.actualStartDate || activity.plannedStartDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-purple-600" />
              <span className="text-purple-600">End:</span>
              <span className="text-purple-800 font-medium">
                {formatDate(activity.actualEndDate || activity.plannedEndDate)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Performance Card */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-800">
            <TrendingUp className="h-5 w-5" />
            Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-orange-600 font-medium">Execution Rate</p>
            <p className="text-2xl font-bold text-orange-900">
              {financials.totalCommitment > 0 
                ? Math.round((financials.totalSpent / financials.totalCommitment) * 100)
                : 0}%
            </p>
            <p className="text-xs text-orange-700">
              of committed funds spent
            </p>
          </div>
          <div>
            <p className="text-sm text-orange-600 font-medium">Disbursement Rate</p>
            <p className="text-xl font-semibold text-orange-800">
              {financials.totalCommitment > 0 
                ? Math.round((financials.totalDisbursement / financials.totalCommitment) * 100)
                : 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-orange-600 font-medium">Remaining Budget</p>
            <p className="text-lg font-semibold text-orange-700">
              {formatCurrency(Math.max(0, financials.totalCommitment - financials.totalSpent))}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};