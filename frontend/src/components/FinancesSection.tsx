"use client";
import React, { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet } from "lucide-react";
import TransactionsManager from "@/components/TransactionsManager";
import { Transaction } from "@/types/transaction";
import LinkedTransactionsEditorTab from "@/components/activities/LinkedTransactionsEditorTab";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { categorizeTransactionType } from "@/utils/transactionTypes";

interface FinancesSectionProps {
  activityId?: string;
  activityTitle?: string;
  transactions?: Transaction[];
  onTransactionsChange?: (transactions: Transaction[]) => void;
  defaultFinanceType?: string;
}

// Hero Card Component
interface HeroCardProps {
  title: string;
  value: string;
  subtitle: string;
}

const HeroCard: React.FC<HeroCardProps> = ({ title, value, subtitle }) => {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
    </div>
  );
};

// Transaction Trend Chart Component
interface TransactionTrendChartProps {
  data: any[];
}

const TransactionTrendChart: React.FC<TransactionTrendChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transactions Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <RechartsTooltip 
              formatter={(value: any) => `$${new Intl.NumberFormat().format(value)}`}
            />
            <Legend />
            <Line type="monotone" dataKey="commitment" stroke="#8884d8" name="Commitment" />
            <Line type="monotone" dataKey="disbursement" stroke="#82ca9d" name="Disbursement" />
            <Line type="monotone" dataKey="expenditure" stroke="#ffc658" name="Expenditure" />
            <Line type="monotone" dataKey="incoming" stroke="#ff7c7c" name="Incoming Funds" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Cumulative Disbursement Chart Component
interface CumulativeDisbursementChartProps {
  data: any[];
}

const CumulativeDisbursementChart: React.FC<CumulativeDisbursementChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cumulative Disbursement</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <RechartsTooltip 
              formatter={(value: any) => `$${new Intl.NumberFormat().format(value)}`}
            />
            <Legend />
            <Line type="monotone" dataKey="cumulativeDisbursement" stroke="#82ca9d" name="Total Disbursed" />
            <Line type="monotone" dataKey="cumulativeExpenditure" stroke="#ffc658" name="Total Spent" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default function FinancesSection({ 
  activityId = "new", 
  activityTitle,
  transactions = [], 
  onTransactionsChange = () => {},
  defaultFinanceType
}: FinancesSectionProps) {
  const [tab, setTab] = useState("transactions");

  // Helper function to safely format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return "";
    }
  };

  // Calculate hero card data
  const heroCardData = useMemo(() => {
    const totalDisbursed = transactions
      .filter(t => categorizeTransactionType(t.transaction_type) === 'disbursement')
      .reduce((sum, t) => {
        const value = parseFloat(t.value?.toString() || '0') || 0;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    
    const totalExpenditure = transactions
      .filter(t => categorizeTransactionType(t.transaction_type) === 'expenditure')
      .reduce((sum, t) => {
        const value = parseFloat(t.value?.toString() || '0') || 0;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    
    const totalCommitment = transactions
      .filter(t => categorizeTransactionType(t.transaction_type) === 'commitment')
      .reduce((sum, t) => {
        const value = parseFloat(t.value?.toString() || '0') || 0;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    
    const outstandingCommitments = totalCommitment - totalDisbursed;
    
    const mostRecentDate = transactions
      .map(t => new Date(t.transaction_date || 0))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    return {
      totalDisbursed,
      totalExpenditure,
      outstandingCommitments,
      mostRecentDate: mostRecentDate ? formatDate(mostRecentDate.toISOString()) : 'No transactions'
    };
  }, [transactions]);

  // Calculate chart data
  const chartData = useMemo(() => {
    // Group transactions by quarter
    const transactionsByPeriod = new Map<string, {
      commitment: number;
      disbursement: number;
      expenditure: number;
      incoming: number;
    }>();
    
    // Sort transactions by date first
    const sortedTransactions = [...transactions]
      .filter(t => t.transaction_date)
      .sort((a, b) => {
        const dateA = new Date(a.transaction_date || 0);
        const dateB = new Date(b.transaction_date || 0);
        return dateA.getTime() - dateB.getTime();
      });
    
    sortedTransactions.forEach(tx => {
      const date = new Date(tx.transaction_date || 0);
      if (isNaN(date.getTime())) return;
      
      // Get quarter key (e.g., "Q1 2024")
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const periodKey = `Q${quarter} ${date.getFullYear()}`;
      
      const value = parseFloat(tx.value?.toString() || '0') || 0;
      const category = categorizeTransactionType(tx.transaction_type);
      
      // Initialize period if not exists
      if (!transactionsByPeriod.has(periodKey)) {
        transactionsByPeriod.set(periodKey, {
          commitment: 0,
          disbursement: 0,
          expenditure: 0,
          incoming: 0
        });
      }
      
      const periodData = transactionsByPeriod.get(periodKey)!;
      
      switch (category) {
        case 'commitment':
          periodData.commitment += value;
          break;
        case 'disbursement':
          periodData.disbursement += value;
          break;
        case 'expenditure':
          periodData.expenditure += value;
          break;
        case 'incoming':
          periodData.incoming += value;
          break;
      }
    });
    
    // Convert to array format for charts
    const trendData = Array.from(transactionsByPeriod.entries())
      .sort((a, b) => {
        // Sort by year and quarter
        const [qA, yearA] = a[0].split(' ');
        const [qB, yearB] = b[0].split(' ');
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return parseInt(qA.substring(1)) - parseInt(qB.substring(1));
      })
      .map(([period, data]) => ({
        period,
        ...data
      }));
    
    // Generate cumulative data
    let runningDisbursement = 0;
    let runningExpenditure = 0;
    
    const cumulativeChartData = trendData.map(item => {
      runningDisbursement += item.disbursement;
      runningExpenditure += item.expenditure;
      
      return {
        period: item.period,
        cumulativeDisbursement: runningDisbursement,
        cumulativeExpenditure: runningExpenditure
      };
    });
    
    return {
      trendData,
      cumulativeData: cumulativeChartData
    };
  }, [transactions]);

  return (
    <div className="max-w-6xl">
      {/* Hero Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <HeroCard 
          title="Total Disbursed" 
          value={`$${new Intl.NumberFormat().format(heroCardData.totalDisbursed)}`}
          subtitle="Across all disbursement transactions" 
        />
        <HeroCard 
          title="Total Expenditure" 
          value={`$${new Intl.NumberFormat().format(heroCardData.totalExpenditure)}`}
          subtitle="Spent by implementing organisations" 
        />
        <HeroCard 
          title="Outstanding Commitments" 
          value={`$${new Intl.NumberFormat().format(heroCardData.outstandingCommitments)}`}
          subtitle="Funds committed but not yet spent" 
        />
        <HeroCard 
          title="Most Recent Transaction" 
          value={heroCardData.mostRecentDate}
          subtitle="Latest financial activity" 
        />
      </div>

      <div className="flex items-center gap-2 mt-6 mb-4">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <span className="text-lg font-semibold text-muted-foreground">Finances</span>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="linked-transactions">Linked Transactions</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <TransactionsManager 
            activityId={activityId}
            activityTitle={activityTitle}
            transactions={transactions}
            onTransactionsChange={onTransactionsChange}
            defaultFinanceType={defaultFinanceType}
          />
          
          {/* Dual Charts Section */}
          {transactions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <TransactionTrendChart data={chartData.trendData} />
              <CumulativeDisbursementChart data={chartData.cumulativeData} />
            </div>
          )}
        </TabsContent>

        {/* Linked Transactions Tab */}
        <TabsContent value="linked-transactions">
          <LinkedTransactionsEditorTab 
            activityId={activityId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 