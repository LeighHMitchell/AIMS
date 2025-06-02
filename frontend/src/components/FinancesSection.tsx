"use client";
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock } from "lucide-react";
import TransactionsManager from "@/components/TransactionsManager";
import { Transaction } from "@/types/transaction";

interface FinancesSectionProps {
  activityId?: string;
  transactions?: Transaction[];
  onTransactionsChange?: (transactions: Transaction[]) => void;
}

export default function FinancesSection({ 
  activityId = "new", 
  transactions = [], 
  onTransactionsChange = () => {} 
}: FinancesSectionProps) {
  const [tab, setTab] = useState("transactions");

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold">Finances</h2>
        <span className="flex items-center gap-1 text-xs font-normal bg-gray-100 text-gray-700 rounded px-2 py-1">
          <Lock className="w-3 h-3" /> IATI Standard
        </span>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="iati">IATI Sync</TabsTrigger>
          <TabsTrigger value="defaults">Default Settings</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <TransactionsManager 
            activityId={activityId}
            transactions={transactions}
            onTransactionsChange={onTransactionsChange}
          />
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets">
          <div className="bg-white rounded-lg shadow p-8 text-gray-400 text-center">
            [Budgets functionality coming soon]
          </div>
        </TabsContent>

        {/* IATI Sync Tab */}
        <TabsContent value="iati">
          <div className="bg-white rounded-lg shadow p-8 text-gray-400 text-center flex flex-col items-center gap-2">
            <Lock className="w-6 h-6 text-gray-400 mb-2" />
            <span>IATI Sync is enabled for this activity.</span>
            <span>Status: <span className="font-semibold text-green-600">Ready for sync</span></span>
          </div>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <div className="bg-white rounded-lg shadow p-8 text-gray-400 text-center">
            [Default settings have been moved to the transaction entry form]
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 