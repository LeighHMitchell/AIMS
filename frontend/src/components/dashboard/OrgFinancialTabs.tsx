"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, ListTodo, Wallet, Banknote } from 'lucide-react';
import { OrgTransactionsTable } from './OrgTransactionsTable';
import { OrgActivitiesTable } from './OrgActivitiesTable';
import { OrgBudgetsTable } from './OrgBudgetsTable';
import { OrgPlannedDisbursementsTable } from './OrgPlannedDisbursementsTable';

interface OrgFinancialTabsProps {
  organizationId: string;
  userId: string;
}

export function OrgFinancialTabs({ organizationId, userId }: OrgFinancialTabsProps) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-slate-600" />
          My Organisation&apos;s Data
        </CardTitle>
        <CardDescription>
          Financial data and activities for your organisation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="activities" className="flex items-center gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="budgets" className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Budgets
            </TabsTrigger>
            <TabsTrigger value="planned-disbursements" className="flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Planned Disbursements
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            <OrgActivitiesTable organizationId={organizationId} variant="main" embedded />
          </TabsContent>

          <TabsContent value="budgets">
            <OrgBudgetsTable organizationId={organizationId} userId={userId} />
          </TabsContent>

          <TabsContent value="planned-disbursements">
            <OrgPlannedDisbursementsTable organizationId={organizationId} userId={userId} />
          </TabsContent>

          <TabsContent value="transactions">
            <OrgTransactionsTable organizationId={organizationId} embedded />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
