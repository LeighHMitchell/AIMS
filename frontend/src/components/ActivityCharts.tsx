import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types/transaction";
import { LEGACY_TRANSACTION_TYPE_MAP } from "@/utils/transactionMigrationHelper";
import { format } from "date-fns";

interface DisbursementGaugeProps {
  totalCommitment: number;
  totalDisbursement: number;
}

export const DisbursementGauge: React.FC<DisbursementGaugeProps> = ({
  totalCommitment,
  totalDisbursement,
}) => {
  const percentage = totalCommitment > 0 ? (totalDisbursement / totalCommitment) * 100 : 0;
  const remainingPercentage = 100 - percentage;

  const data = [
    { name: "Disbursed", value: percentage },
    { name: "Remaining", value: remainingPercentage },
  ];

  const COLORS = ["#3B82F6", "#E5E7EB"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Percent disbursed</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-4">
          <div className="text-3xl font-bold">{percentage.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">
            ${totalDisbursement.toLocaleString()} of ${totalCommitment.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface CumulativeFinanceChartProps {
  transactions: Transaction[];
}

export const CumulativeFinanceChart: React.FC<CumulativeFinanceChartProps> = ({
  transactions,
}) => {
  // Process transactions to create cumulative data
  const processedData = React.useMemo(() => {
    const sortedTransactions = [...transactions]
      .filter(t => t.status === "published" && t.transaction_date) // Filter out transactions without dates
      .filter(t => {
        // Additional validation for valid dates
        try {
          const date = new Date(t.transaction_date);
          return !isNaN(date.getTime());
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        } catch {
          return 0;
        }
      });

    const dataMap = new Map<string, { date: string; commitments: number; disbursements: number; expenditures: number }>();
    let cumulativeCommitments = 0;
    let cumulativeDisbursements = 0;
    let cumulativeExpenditures = 0;

    sortedTransactions.forEach(transaction => {
      try {
        const date = format(new Date(transaction.transaction_date), "yyyy-MM");
      
      // Normalize transaction type to handle both legacy and new types
        const normalizedType = LEGACY_TRANSACTION_TYPE_MAP[transaction.transaction_type] || transaction.transaction_type;
      
      if (normalizedType === "2") { // Outgoing Commitment (was "C")
        cumulativeCommitments += transaction.value;
      } else if (normalizedType === "3") { // Disbursement (was "D")
        cumulativeDisbursements += transaction.value;
      } else if (normalizedType === "4") { // Expenditure (was "E")
        cumulativeExpenditures += transaction.value;
      }

      dataMap.set(date, {
        date,
        commitments: cumulativeCommitments,
        disbursements: cumulativeDisbursements,
        expenditures: cumulativeExpenditures,
      });
      } catch (error) {
        // Skip transactions with invalid dates
        console.warn('[ActivityCharts] Skipping transaction with invalid date:', transaction.transaction_date);
      }
    });

    return Array.from(dataMap.values());
  }, [transactions]);

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(2);
  };

  const formatTooltipValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cumulative Commitments & Disbursements</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={processedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="commitments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="disbursements" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="expenditures" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#475569" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#475569" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
            <YAxis tickFormatter={formatYAxis} stroke="#6B7280" fontSize={12} />
            <Tooltip
              formatter={(value: number) => formatTooltipValue(value)}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="commitments"
              stackId="1"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#commitments)"
              name="Commitments"
            />
            <Area
              type="monotone"
              dataKey="disbursements"
              stackId="2"
              stroke="#64748b"
              fillOpacity={1}
              fill="url(#disbursements)"
              name="Disbursements"
            />
            <Area
              type="monotone"
              dataKey="expenditures"
              stackId="3"
              stroke="#475569"
              fillOpacity={1}
              fill="url(#expenditures)"
              name="Expenditures"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 