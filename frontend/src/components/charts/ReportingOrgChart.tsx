import React, { useState, useEffect, useMemo } from "react";
import { DATA_COLORS, CHART_STRUCTURE_COLORS } from "@/lib/chart-colors";
import { Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AnalyticsFilters {
  donor: string;
  aidType: string;
  financeType: string;
  flowType: string;
  timePeriod: 'year' | 'quarter';
  topN: string;
}

interface ChartDataPoint {
  organization: string;
  acronym: string;
  budget: number;
  disbursements: number;
  expenditures: number;
  totalSpending: number;
  iati_id?: string;
  org_type?: string;
}

type SortField = 'organization' | 'budget' | 'disbursements' | 'expenditures' | 'totalSpending';
type SortDirection = 'asc' | 'desc';

interface ReportingOrgChartProps {
  filters: AnalyticsFilters;
  onDataChange?: (data: any[]) => void;
}

export const ReportingOrgChart: React.FC<ReportingOrgChartProps> = ({
  filters,
  onDataChange,
}) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [sortField, setSortField] = useState<SortField>('organization');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch chart data whenever filters change
  useEffect(() => {
    fetchChartData();
  }, [filters]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        donor: filters.donor,
        aidType: filters.aidType,
        financeType: filters.financeType,
        flowType: filters.flowType,
        topN: filters.topN,
      });

      const response = await fetch(`/api/analytics/reporting-org?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const chartData = result.data || [];
      setData(chartData);
      setCurrency(result.currency || 'USD');
      onDataChange?.(chartData);
    } catch (error) {
      console.error('Error fetching reporting org chart data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
      toast.error('Failed to load reporting organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 text-gray-400" />
      : <ArrowDown className="h-4 w-4 text-gray-400" />;
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'organization':
          aValue = a.organization.toLowerCase();
          bValue = b.organization.toLowerCase();
          break;
        case 'budget':
          aValue = a.budget;
          bValue = b.budget;
          break;
        case 'disbursements':
          aValue = a.disbursements;
          bValue = b.disbursements;
          break;
        case 'expenditures':
          aValue = a.expenditures;
          bValue = b.expenditures;
          break;
        case 'totalSpending':
          aValue = a.totalSpending;
          bValue = b.totalSpending;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const formatCurrency = (value: number) => {
    return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading organization data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm">Try adjusting your filters to see results.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-muted/50 border-b border-border/70">
            <TableRow>
              <TableHead
                className="text-sm font-medium text-foreground/90 py-3 px-3 cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap"
                style={{ width: '25%' }}
                onClick={() => handleSort('organization')}
              >
                <div className="flex items-center gap-1">
                  <span>Organization</span>
                  {getSortIcon('organization')}
                </div>
              </TableHead>
              <TableHead className="text-sm font-medium text-foreground/90 py-3 px-3 whitespace-nowrap" style={{ width: '15%' }}>
                Organisation Type
              </TableHead>
              <TableHead
                className="text-sm font-medium text-foreground/90 py-3 px-3 text-right cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap"
                style={{ width: '15%' }}
                onClick={() => handleSort('budget')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Budget</span>
                  {getSortIcon('budget')}
                </div>
              </TableHead>
              <TableHead
                className="text-sm font-medium text-foreground/90 py-3 px-3 text-right cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap"
                style={{ width: '15%' }}
                onClick={() => handleSort('disbursements')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Disbursements</span>
                  {getSortIcon('disbursements')}
                </div>
              </TableHead>
              <TableHead
                className="text-sm font-medium text-foreground/90 py-3 px-3 text-right cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap"
                style={{ width: '15%' }}
                onClick={() => handleSort('expenditures')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Expenditures</span>
                  {getSortIcon('expenditures')}
                </div>
              </TableHead>
              <TableHead
                className="text-sm font-medium text-foreground/90 py-3 px-3 text-right cursor-pointer hover:bg-muted/30 transition-colors whitespace-nowrap"
                style={{ width: '15%' }}
                onClick={() => handleSort('totalSpending')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Spending</span>
                  {getSortIcon('totalSpending')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((org, index) => (
              <TableRow key={index} className="hover:bg-gray-50">
                <TableCell className="py-3 px-3">
                  <div className="flex flex-col">
                    <div className="font-medium text-gray-900">
                      {org.organization} {org.acronym && org.acronym !== org.organization && `(${org.acronym})`}
                    </div>
                    {org.iati_id && (
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        {org.iati_id}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-3 text-sm text-gray-600">
                  {org.org_type || '—'}
                </TableCell>
                <TableCell className="py-3 px-3 text-sm text-right text-gray-900">
                  {formatCurrency(org.budget)}
                </TableCell>
                <TableCell className="py-3 px-3 text-sm text-right text-gray-900">
                  {formatCurrency(org.disbursements)}
                </TableCell>
                <TableCell className="py-3 px-3 text-sm text-right text-gray-900">
                  {formatCurrency(org.expenditures)}
                </TableCell>
                <TableCell className="py-3 px-3 text-sm text-right font-medium text-gray-900">
                  {formatCurrency(org.totalSpending)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Table info */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          <strong>Showing:</strong> {filters.topN === 'all' ? 'All' : `Top ${filters.topN}`} organizations by total budget |
          <strong> Currency:</strong> {currency} |
          <strong> Organizations:</strong> {data.length}
        </p>
      </div>
    </div>
  );
};