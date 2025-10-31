"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, getYear, startOfYear, endOfYear } from "date-fns";

interface Transaction {
  transaction_type: string;
  transaction_date: string;
  value: string | number;
  currency?: string;
}

interface Budget {
  period_start: string;
  period_end: string;
  value: string | number;
  currency?: string;
  type?: string;
  status?: string;
}

interface ActivityAnalyticsChartsProps {
  transactions: Transaction[];
  budgets: Budget[];
  startDate?: string;
  endDate?: string;
}

export const ActivityAnalyticsCharts: React.FC<ActivityAnalyticsChartsProps> = ({
  transactions = [],
  budgets = [],
  startDate = undefined,
  endDate = undefined
}) => {
  // Process data for fiscal year analysis (assuming April-March fiscal year)
  const processFiscalYearData = () => {
    const fiscalYearData = new Map<string, {
      fiscalYear: string;
      commitments: number;
      disbursements: number;
      expenditures: number;
      plannedBudget: number;
    }>();

    // Process transactions
    transactions.forEach((transaction: Transaction) => {
      if (!transaction.transaction_date) return;
      
      try {
        const date = parseISO(transaction.transaction_date);
        const year = getYear(date);
        const month = date.getMonth() + 1; // 1-based month
        
        // Fiscal year starts in April (month 4)
        const fiscalYear = month >= 4 ? `FY${year}-${year + 1}` : `FY${year - 1}-${year}`;
        
        if (!fiscalYearData.has(fiscalYear)) {
          fiscalYearData.set(fiscalYear, {
            fiscalYear,
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            plannedBudget: 0
          });
        }
        
        const data = fiscalYearData.get(fiscalYear)!;
        const value = parseFloat(String(transaction.value)) || 0;
        
        if (transaction.transaction_type === "2") {
          data.commitments += value;
        } else if (transaction.transaction_type === "3") {
          data.disbursements += value;
        } else if (transaction.transaction_type === "4") {
          data.expenditures += value;
        }
      } catch (error) {
        console.warn('Invalid transaction date:', transaction.transaction_date);
      }
    });

    // Process budgets
    budgets.forEach((budget: Budget) => {
      if (!budget.period_start) return;
      
      try {
        const date = parseISO(budget.period_start);
        const year = getYear(date);
        const month = date.getMonth() + 1;
        
        const fiscalYear = month >= 4 ? `FY${year}-${year + 1}` : `FY${year - 1}-${year}`;
        
        if (!fiscalYearData.has(fiscalYear)) {
          fiscalYearData.set(fiscalYear, {
            fiscalYear,
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            plannedBudget: 0
          });
        }
        
        const data = fiscalYearData.get(fiscalYear)!;
        data.plannedBudget += parseFloat(String(budget.value)) || 0;
      } catch (error) {
        console.warn('Invalid budget date:', budget.period_start);
      }
    });

    return Array.from(fiscalYearData.values()).sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear));
  };

  // Process data for calendar year analysis
  const processCalendarYearData = () => {
    const calendarYearData = new Map<number, {
      year: number;
      commitments: number;
      disbursements: number;
      expenditures: number;
      plannedBudget: number;
    }>();

    // Process transactions
    transactions.forEach((transaction: Transaction) => {
      if (!transaction.transaction_date) return;
      
      try {
        const date = parseISO(transaction.transaction_date);
        const year = getYear(date);
        
        if (!calendarYearData.has(year)) {
          calendarYearData.set(year, {
            year,
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            plannedBudget: 0
          });
        }
        
        const data = calendarYearData.get(year)!;
        const value = parseFloat(String(transaction.value)) || 0;
        
        if (transaction.transaction_type === "2") {
          data.commitments += value;
        } else if (transaction.transaction_type === "3") {
          data.disbursements += value;
        } else if (transaction.transaction_type === "4") {
          data.expenditures += value;
        }
      } catch (error) {
        console.warn('Invalid transaction date:', transaction.transaction_date);
      }
    });

    // Process budgets
    budgets.forEach((budget: Budget) => {
      if (!budget.period_start) return;
      
      try {
        const date = parseISO(budget.period_start);
        const year = getYear(date);
        
        if (!calendarYearData.has(year)) {
          calendarYearData.set(year, {
            year,
            commitments: 0,
            disbursements: 0,
            expenditures: 0,
            plannedBudget: 0
          });
        }
        
        const data = calendarYearData.get(year)!;
        data.plannedBudget += parseFloat(String(budget.value)) || 0;
      } catch (error) {
        console.warn('Invalid budget date:', budget.period_start);
      }
    });

    return Array.from(calendarYearData.values()).sort((a, b) => a.year - b.year);
  };

  // Process cumulative data
  const processCumulativeData = () => {
    const allDates = new Set<string>();
    
    // Collect all dates
    transactions.forEach((t: Transaction) => {
      if (t.transaction_date) {
        try {
          const date = format(parseISO(t.transaction_date), 'yyyy-MM');
          allDates.add(date);
        } catch (error) {
          // Skip invalid dates
        }
      }
    });

    const sortedDates = Array.from(allDates).sort();
    const cumulativeData: Array<{
      date: string;
      cumulativeCommitments: number;
      cumulativeDisbursements: number;
      cumulativeExpenditures: number;
      cumulativeBudget: number;
    }> = [];

    let cumulativeCommitments = 0;
    let cumulativeDisbursements = 0;
    let cumulativeExpenditures = 0;
    let cumulativeBudget = 0;

    sortedDates.forEach((dateStr: string) => {
      // Add transactions for this month
      transactions.forEach((t: Transaction) => {
        if (!t.transaction_date) return;
        
        try {
          const transactionMonth = format(parseISO(t.transaction_date), 'yyyy-MM');
          if (transactionMonth === dateStr) {
            const value = parseFloat(String(t.value)) || 0;
            
            if (t.transaction_type === "2") {
              cumulativeCommitments += value;
            } else if (t.transaction_type === "3") {
              cumulativeDisbursements += value;
            } else if (t.transaction_type === "4") {
              cumulativeExpenditures += value;
            }
          }
        } catch (error) {
          // Skip invalid dates
        }
      });

      // Add budgets for this month
      budgets.forEach((b: Budget) => {
        if (!b.period_start) return;
        
        try {
          const budgetMonth = format(parseISO(b.period_start), 'yyyy-MM');
          if (budgetMonth === dateStr) {
            cumulativeBudget += parseFloat(String(b.value)) || 0;
          }
        } catch (error) {
          // Skip invalid dates
        }
      });

      cumulativeData.push({
        date: dateStr,
        cumulativeCommitments,
        cumulativeDisbursements,
        cumulativeExpenditures,
        cumulativeBudget
      });
    });

    return cumulativeData;
  };

  const fiscalYearData = processFiscalYearData();
  const calendarYearData = processCalendarYearData();
  const cumulativeData = processCumulativeData();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Financial Breakdown Charts */}
      <Tabs defaultValue="fiscal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fiscal">Fiscal Year</TabsTrigger>
          <TabsTrigger value="calendar">Calendar Year</TabsTrigger>
          <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analysis by Fiscal Year</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={fiscalYearData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fiscalYear" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={false} />
                  <Legend />
                  <Bar dataKey="plannedBudget" fill="#8884d8" name="Planned Budget" />
                  <Bar dataKey="commitments" fill="#82ca9d" name="Commitments" />
                  <Bar dataKey="disbursements" fill="#ffc658" name="Disbursements" />
                  <Bar dataKey="expenditures" fill="#ff7300" name="Expenditures" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analysis by Calendar Year</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={calendarYearData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={false} />
                  <Legend />
                  <Bar dataKey="plannedBudget" fill="#8884d8" name="Planned Budget" />
                  <Bar dataKey="commitments" fill="#82ca9d" name="Commitments" />
                  <Bar dataKey="disbursements" fill="#ffc658" name="Disbursements" />
                  <Bar dataKey="expenditures" fill="#ff7300" name="Expenditures" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cumulative">
          <Card>
            <CardHeader>
              <CardTitle>Cumulative Financial Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={cumulativeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="budget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="commitments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="disbursements" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="expenditures" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff7300" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cumulativeBudget"
                    stackId="1"
                    stroke="#8884d8"
                    fill="url(#budget)"
                    name="Cumulative Budget"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeCommitments"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="url(#commitments)"
                    name="Cumulative Commitments"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeDisbursements"
                    stackId="3"
                    stroke="#ffc658"
                    fill="url(#disbursements)"
                    name="Cumulative Disbursements"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeExpenditures"
                    stackId="4"
                    stroke="#ff7300"
                    fill="url(#expenditures)"
                    name="Cumulative Expenditures"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Useful Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey={(data: any) => {
                    const rate = data.cumulativeCommitments > 0 
                      ? (data.cumulativeDisbursements + data.cumulativeExpenditures) / data.cumulativeCommitments * 100 
                      : 0;
                    return Math.min(rate, 100);
                  }}
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Execution Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget vs Actual Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={[
                  {
                    category: 'Total',
                    budget: budgets.reduce((sum: number, b: Budget) => sum + (parseFloat(String(b.value)) || 0), 0),
                    actual: transactions
                      .filter((t: Transaction) => t.transaction_type === "3" || t.transaction_type === "4")
                      .reduce((sum: number, t: Transaction) => sum + (parseFloat(String(t.value)) || 0), 0)
                  }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={false} />
                <Legend />
                <Bar dataKey="budget" fill="#8884d8" name="Planned Budget" />
                <Bar dataKey="actual" fill="#82ca9d" name="Actual Spending" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};