"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, ListTodo, Wallet, Banknote } from 'lucide-react';
import { OrgTransactionsTable } from './OrgTransactionsTable';
import { OrgActivitiesTable } from './OrgActivitiesTable';
import { OrgBudgetsTable } from './OrgBudgetsTable';
import { OrgPlannedDisbursementsTable } from './OrgPlannedDisbursementsTable';
import type { TableFilterConfig, ReportedByFilter } from '@/types/dashboard';

interface OrgFinancialTabsProps {
  organizationId: string;
  userId: string;
  context?: 'overview' | 'portfolio';
}

const OVERVIEW_FILTER: TableFilterConfig = {
  allowedFilters: ['all', 'my_org', 'other_orgs'],
  defaultFilter: 'all',
  filterLabels: {
    all: 'All',
    my_org: 'Reported by my organisation',
    other_orgs: 'Reported by another organisation',
  },
};

const OVERVIEW_FILTER_NO_OTHER: TableFilterConfig = {
  allowedFilters: ['all', 'my_org'],
  defaultFilter: 'all',
  filterLabels: {
    all: 'All',
    my_org: 'Reported by my organisation',
  },
};

const PORTFOLIO_FILTER: TableFilterConfig = {
  allowedFilters: ['me', 'my_org'],
  defaultFilter: 'me',
  filterLabels: {
    me: 'Reported by me',
    my_org: 'Reported by my organisation',
  },
};

export function OrgFinancialTabs({ organizationId, userId, context = 'overview' }: OrgFinancialTabsProps) {
  const isPortfolio = context === 'portfolio';
  const financialFilter = isPortfolio ? PORTFOLIO_FILTER : OVERVIEW_FILTER;
  const [activeTab, setActiveTab] = useState('activities');
  const [reportedBy, setReportedBy] = useState<ReportedByFilter>(financialFilter.defaultFilter);

  // In portfolio context, hide the filter (always "me"). In overview, show on transactions + planned disbursements.
  const showFilter = !isPortfolio && (activeTab === 'transactions' || activeTab === 'planned-disbursements');

  // Build a filterConfig with the selected value baked in as default
  const activeFilterConfig: TableFilterConfig = {
    ...financialFilter,
    defaultFilter: reportedBy,
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-slate-600" />
          {isPortfolio ? 'My Financial Data' : "My Organisation\u2019s Data"}
        </CardTitle>
        <CardDescription>
          {isPortfolio
            ? 'Activities and financial records you have entered'
            : 'Financial data and activities for your organisation'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
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

            {showFilter && (
              <Select value={reportedBy} onValueChange={(val: ReportedByFilter) => setReportedBy(val)}>
                <SelectTrigger className="w-[320px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {financialFilter.allowedFilters.map((filter, index) => (
                    <SelectItem key={filter} value={filter} className="pl-2 [&>span:first-child]:hidden">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{index + 1}</span>
                        {financialFilter.filterLabels[filter] || filter}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="activities">
            <OrgActivitiesTable organizationId={organizationId} userId={userId} variant="main" embedded filterConfig={isPortfolio ? activeFilterConfig : undefined} />
          </TabsContent>

          <TabsContent value="budgets">
            <OrgBudgetsTable organizationId={organizationId} userId={userId} filterConfig={isPortfolio ? activeFilterConfig : undefined} />
          </TabsContent>

          <TabsContent value="planned-disbursements">
            <OrgPlannedDisbursementsTable organizationId={organizationId} userId={userId} filterConfig={activeFilterConfig} />
          </TabsContent>

          <TabsContent value="transactions">
            <OrgTransactionsTable organizationId={organizationId} userId={userId} embedded filterConfig={activeFilterConfig} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
