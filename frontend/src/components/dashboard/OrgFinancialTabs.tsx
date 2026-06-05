"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, ListTodo, Wallet, Banknote } from 'lucide-react';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
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

  // In portfolio context, show the filter (me vs my_org) for all tabs. In overview, show on transactions + planned disbursements.
  const showFilter = isPortfolio || activeTab === 'transactions' || activeTab === 'planned-disbursements';

  // Build a filterConfig with the selected value baked in as default
  const activeFilterConfig: TableFilterConfig = {
    ...financialFilter,
    defaultFilter: reportedBy,
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          {isPortfolio ? 'My Financial Data' : "My Organisation\u2019s Data"}
          <HelpTextTooltip size="sm" content={isPortfolio
            ? 'Activities and financial records you have entered'
            : 'Financial data and activities for your organisation'} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-end justify-between gap-4 mb-4">
            <TabsList className="p-1 h-auto bg-background gap-1 border flex flex-wrap">
              <TabsTrigger value="activities" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <ListTodo className="h-4 w-4" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="budgets" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Wallet className="h-4 w-4" />
                Budgets
              </TabsTrigger>
              <TabsTrigger value="planned-disbursements" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Banknote className="h-4 w-4" />
                Planned Disbursements
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <DollarSign className="h-4 w-4" />
                Transactions
              </TabsTrigger>
            </TabsList>

            {showFilter && (
              <div className="space-y-1">
                <Label htmlFor="org-financial-reported-by" className="text-helper text-muted-foreground">Reported by</Label>
                <Select value={reportedBy} onValueChange={(val: ReportedByFilter) => setReportedBy(val)}>
                  <SelectTrigger id="org-financial-reported-by" className="w-[360px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {financialFilter.allowedFilters.map((filter, index) => (
                      <SelectItem key={filter} value={filter}>
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-mono rounded px-1.5 py-0.5 shrink-0">
                            {index + 1}
                          </span>
                          {financialFilter.filterLabels[filter] || filter}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
