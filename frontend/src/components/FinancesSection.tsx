"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wallet, CheckCircle, BarChart3 } from "lucide-react";
import TransactionsManager from "@/components/TransactionsManager";
import { Transaction } from "@/types/transaction";
import LinkedTransactionsEditorTab from "@/components/activities/LinkedTransactionsEditorTab";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActivityDefaults } from "@/hooks/use-activity-defaults";
import { useActivityAutosave } from "@/hooks/use-activity-autosave";

interface FinancesSectionProps {
  activityId: string;
  transactions: Transaction[];
  onTransactionsChange: (transactions: Transaction[]) => void;
}

export default function FinancesSection({ 
  activityId, 
  transactions, 
  onTransactionsChange 
}: FinancesSectionProps) {
  const [tab, setTab] = useState("transactions");
  const [currencyMode, setCurrencyMode] = useState<'original' | 'usd'>('usd');
  const [aggregationMode, setAggregationMode] = useState<'quarter' | 'month' | 'year'>('quarter');

  const { values: defaults, updateDefaultField } = useActivityDefaults({ activityId });

  // Check if all default fields are completed
  const allDefaultsCompleted = useMemo(() => {
    if (!defaults) return false;
    return defaults.default_finance_type && 
           defaults.default_aid_type && 
           defaults.default_currency && 
           defaults.default_tied_status && 
           defaults.default_flow_type;
  }, [defaults]);

  // Calculate financial summary
  const financialSummary = useMemo(() => {
    const published = transactions.filter(t => t.status === 'published');
    const committed = transactions.filter(t => t.transaction_type === '2'); // Outgoing Commitment
    const disbursed = transactions.filter(t => t.transaction_type === '3'); // Disbursement
    const received = transactions.filter(t => t.transaction_type === '12'); // Incoming Funds

    const totalPublished = published.reduce((sum, t) => sum + (t.value || 0), 0);
    const totalCommitted = committed.reduce((sum, t) => sum + (t.value || 0), 0);
    const totalDisbursed = disbursed.reduce((sum, t) => sum + (t.value || 0), 0);
    const totalReceived = received.reduce((sum, t) => sum + (t.value || 0), 0);

    return {
      totalPublished,
      totalCommitted,
      totalDisbursed,
      totalReceived,
      transactionCount: transactions.length,
      publishedCount: published.length
    };
  }, [transactions]);

  // Chart data calculation
  const chartDataMemo = useMemo(() => {
    if (!transactions.length) return [];

    // Group transactions by date and aggregate
    const grouped = transactions.reduce((acc, tx) => {
      if (!tx.transaction_date) return acc;
      
      const date = new Date(tx.transaction_date);
      let key: string;
      
      if (aggregationMode === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (aggregationMode === 'year') {
        key = date.getFullYear().toString();
      } else { // quarter
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        key = `${date.getFullYear()}-Q${quarter}`;
      }

      if (!acc[key]) {
        acc[key] = {
          period: key,
          committed: 0,
          disbursed: 0,
          received: 0,
          total: 0
        };
      }

      // For Analytics tab, always use USD values; for other tabs, respect currencyMode
      const value = (tab === 'analytics' || currencyMode === 'usd') && tx.value_usd != null ? tx.value_usd : (parseFloat(tx.value?.toString() || '0') || 0);

             if (tx.transaction_type === '2') { // Outgoing Commitment
         acc[key].committed += value;
       } else if (tx.transaction_type === '3') { // Disbursement
         acc[key].disbursed += value;
       } else if (tx.transaction_type === '12') { // Incoming Funds
         acc[key].received += value;
       }
      
      acc[key].total += value;
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by period
    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }, [transactions, aggregationMode, currencyMode, tab]);

  // Currency distribution for pie chart
  const currencyDistribution = useMemo(() => {
    const distribution = transactions.reduce((acc, tx) => {
      const currency = tx.currency || 'Unknown';
      acc[currency] = (acc[currency] || 0) + (tx.value || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([currency, value]) => ({
      name: currency,
      value
    }));
  }, [transactions]);

  // Organization distribution
  const organizationDistribution = useMemo(() => {
    const distribution = transactions.reduce((acc, tx) => {
      const org = tx.provider_org_name || tx.provider_org_id || 'Unknown';
      acc[org] = (acc[org] || 0) + (tx.value || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([org, value]) => ({
        name: org,
        value
      }));
  }, [transactions]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financialSummary.totalPublished)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.publishedCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Committed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financialSummary.totalCommitted)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financialSummary.totalDisbursed)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financialSummary.totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.transactionCount} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="linked-transactions">Linked Transactions</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="defaults" className="flex items-center gap-2">
            Defaults
            {/* Show checkmark if all default fields are completed */}
            {allDefaultsCompleted && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <TransactionsManager
            activityId={activityId}
            transactions={transactions}
            onTransactionsChange={onTransactionsChange}
            defaultFinanceType={defaults?.default_finance_type || undefined}
            defaultAidType={defaults?.default_aid_type || undefined}
            defaultCurrency={defaults?.default_currency || undefined}
            defaultTiedStatus={defaults?.default_tied_status || undefined}
            defaultFlowType={defaults?.default_flow_type || undefined}
          />
        </TabsContent>

        {/* Linked Transactions Tab */}
        <TabsContent value="linked-transactions">
          <LinkedTransactionsEditorTab 
            activityId={activityId}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Analytics Controls */}
            <div className="flex flex-wrap gap-4 items-center mb-4">
              <span className="text-sm font-medium">Aggregate by:</span>
              <Button
                variant={aggregationMode === 'quarter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAggregationMode('quarter')}
              >
                Quarter
              </Button>
              <Button
                variant={aggregationMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAggregationMode('month')}
              >
                Month
              </Button>
              <Button
                variant={aggregationMode === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAggregationMode('year')}
              >
                Year
              </Button>
              <div className="ml-4 text-sm text-muted-foreground">
                <Badge variant="secondary">Standardized USD Only</Badge>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Series Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Flow Over Time</CardTitle>
                  <CardDescription>
                    Transaction values aggregated by {aggregationMode}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartDataMemo}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => [
                          new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(value),
                          'USD'
                        ]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="committed" 
                        stroke="#0088FE" 
                        strokeWidth={2}
                        name="Committed"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="disbursed" 
                        stroke="#00C49F" 
                        strokeWidth={2}
                        name="Disbursed"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="received" 
                        stroke="#FFBB28" 
                        strokeWidth={2}
                        name="Received"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Currency Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Currency Distribution</CardTitle>
                  <CardDescription>
                    Transaction values by currency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={currencyDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {currencyDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [
                          new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(value),
                          'Value'
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Organization Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Organizations</CardTitle>
                  <CardDescription>
                    Transaction values by organization (top 10)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={organizationDistribution} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <RechartsTooltip 
                        formatter={(value: number) => [
                          new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(value),
                          'Value'
                        ]}
                      />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Types</CardTitle>
                  <CardDescription>
                    Distribution by transaction type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { type: 'Committed', value: financialSummary.totalCommitted },
                      { type: 'Disbursed', value: financialSummary.totalDisbursed },
                      { type: 'Received', value: financialSummary.totalReceived }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => [
                          new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(value),
                          'Value'
                        ]}
                      />
                      <Bar dataKey="value" fill="#82CA9D" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle>Default Financial Settings</CardTitle>
              <CardDescription>
                Set default values for new transactions. These will be automatically applied when creating new transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Finance Type</label>
                                     <input
                     type="text"
                     value={defaults?.default_finance_type || ''}
                     onChange={(e) => updateDefaultField('default_finance_type', e.target.value || null)}
                     className="w-full p-2 border rounded"
                     placeholder="e.g., 110"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Default Aid Type</label>
                   <input
                     type="text"
                     value={defaults?.default_aid_type || ''}
                     onChange={(e) => updateDefaultField('default_aid_type', e.target.value || null)}
                     className="w-full p-2 border rounded"
                     placeholder="e.g., A01"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Default Currency</label>
                   <input
                     type="text"
                     value={defaults?.default_currency || ''}
                     onChange={(e) => updateDefaultField('default_currency', e.target.value || null)}
                     className="w-full p-2 border rounded"
                     placeholder="e.g., USD"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Default Tied Status</label>
                   <input
                     type="text"
                     value={defaults?.default_tied_status || ''}
                     onChange={(e) => updateDefaultField('default_tied_status', e.target.value || null)}
                     className="w-full p-2 border rounded"
                     placeholder="e.g., 3"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Default Flow Type</label>
                   <input
                     type="text"
                     value={defaults?.default_flow_type || ''}
                     onChange={(e) => updateDefaultField('default_flow_type', e.target.value || null)}
                     className="w-full p-2 border rounded"
                     placeholder="e.g., 10"
                   />
                 </div>
               </div>
             </CardContent>
           </Card>
         </TabsContent>
       </Tabs>
     </div>
   );
 } 