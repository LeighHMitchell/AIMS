"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle } from "lucide-react";
import TransactionsManager from "@/components/TransactionsManager";
import { Transaction } from "@/types/transaction";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityDefaults } from "@/hooks/use-activity-defaults";
import { apiFetch } from '@/lib/api-fetch';

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

  const { values: defaults, updateDefaultField } = useActivityDefaults({ activityId });

  // State for budgets and planned disbursements
  const [budgets, setBudgets] = useState<any[]>([]);
  const [plannedDisbursements, setPlannedDisbursements] = useState<any[]>([]);

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      if (!activityId) return;

      try {
        const response = await apiFetch(`/api/activities/${activityId}/budgets`);
        if (response.ok) {
          const data = await response.json();
          setBudgets(data);
        }
      } catch (error) {
        console.error('Error fetching budgets:', error);
      }
    };

    fetchBudgets();
  }, [activityId]);

  // Fetch planned disbursements
  useEffect(() => {
    const fetchPlannedDisbursements = async () => {
      if (!activityId) return;

      try {
        const response = await apiFetch(`/api/activities/${activityId}/planned-disbursements`);
        if (response.ok) {
          const data = await response.json();
          setPlannedDisbursements(data);
        }
      } catch (error) {
        console.error('Error fetching planned disbursements:', error);
      }
    };

    fetchPlannedDisbursements();
  }, [activityId]);

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

    // Group by transaction type
    const transactionsByType: Record<string, { count: number, total: number, totalUSD: number }> = {};

    transactions.forEach(t => {
      const type = t.transaction_type || 'unknown';
      if (!transactionsByType[type]) {
        transactionsByType[type] = { count: 0, total: 0, totalUSD: 0 };
      }
      transactionsByType[type].count += 1;
      transactionsByType[type].total += (t.value || 0);
      transactionsByType[type].totalUSD += (t.value_usd || t.value || 0);
    });

    const totalPublished = published.reduce((sum, t) => sum + (t.value_usd || t.value || 0), 0);
    const totalCommitted = (transactionsByType['2']?.totalUSD || 0);
    const totalDisbursed = (transactionsByType['3']?.totalUSD || 0);
    const totalReceived = (transactionsByType['12']?.totalUSD || 0);

    // Calculate budget totals
    const totalBudgets = budgets.reduce((sum, b) => sum + (b.usd_value || b.value || 0), 0);

    // Calculate planned disbursement totals
    const totalPlannedDisbursements = plannedDisbursements.reduce((sum, pd) => sum + (pd.usd_value || pd.value || 0), 0);

    return {
      totalPublished,
      totalCommitted,
      totalDisbursed,
      totalReceived,
      totalBudgets,
      totalPlannedDisbursements,
      transactionCount: transactions.length,
      publishedCount: published.length,
      budgetCount: budgets.length,
      plannedDisbursementCount: plannedDisbursements.length,
      transactionsByType
    };
  }, [transactions, budgets, plannedDisbursements]);

  // Transaction type labels
  const getTransactionTypeLabel = (code: string) => {
    const labels: Record<string, string> = {
      '1': 'Incoming Funds',
      '2': 'Outgoing Commitment',
      '3': 'Disbursement',
      '4': 'Expenditure',
      '5': 'Interest Payment',
      '6': 'Loan Repayment',
      '7': 'Reimbursement',
      '8': 'Purchase of Equity',
      '9': 'Sale of Equity',
      '10': 'Credit Guarantee',
      '11': 'Incoming Commitment',
      '12': 'Outgoing Pledge',
      '13': 'Incoming Pledge',
    };
    return labels[code] || `Type ${code}`;
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financialSummary.totalBudgets)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.budgetCount} budgets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Planned Disbursements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(financialSummary.totalPlannedDisbursements)}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.plannedDisbursementCount} planned disbursements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(Object.values(financialSummary.transactionsByType).reduce((sum, t) => sum + t.totalUSD, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {financialSummary.transactionCount} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Financial Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary by Type</CardTitle>
          <CardDescription>
            Breakdown of all financial data including budgets, planned disbursements, and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-medium">Category</th>
                  <th className="text-right py-2 px-4 font-medium">Count</th>
                  <th className="text-right py-2 px-4 font-medium">Total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {/* Budgets */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-2 px-4">Budgets</td>
                  <td className="text-right py-2 px-4">{financialSummary.budgetCount}</td>
                  <td className="text-right py-2 px-4 font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(financialSummary.totalBudgets)}
                  </td>
                </tr>

                {/* Planned Disbursements */}
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-2 px-4">Planned Disbursements</td>
                  <td className="text-right py-2 px-4">{financialSummary.plannedDisbursementCount}</td>
                  <td className="text-right py-2 px-4 font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(financialSummary.totalPlannedDisbursements)}
                  </td>
                </tr>

                {/* Transaction Types */}
                {Object.entries(financialSummary.transactionsByType)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([type, data]) => (
                    <tr key={type} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4">
                        <span className="font-medium">{getTransactionTypeLabel(type)}</span>
                        <span className="text-xs text-muted-foreground ml-2">(Type {type})</span>
                      </td>
                      <td className="text-right py-2 px-4">{data.count}</td>
                      <td className="text-right py-2 px-4 font-medium">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(data.totalUSD)}
                      </td>
                    </tr>
                  ))}

                {/* Total Row */}
                <tr className="bg-surface-muted font-bold">
                  <td className="py-3 px-4">TOTAL (All Transactions)</td>
                  <td className="text-right py-3 px-4">{financialSummary.transactionCount}</td>
                  <td className="text-right py-3 px-4">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(Object.values(financialSummary.transactionsByType).reduce((sum, t) => sum + t.totalUSD, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
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