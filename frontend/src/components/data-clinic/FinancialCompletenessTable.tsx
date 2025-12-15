"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Columns, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import {
  formatCurrencyFull,
  formatPercentage,
  getSeverity,
  Severity
} from "@/utils/calculateFinancialCompleteness"
import Link from "next/link"

interface FinancialCompletenessActivity {
  id: string;
  title: string;
  iati_identifier: string | null;
  reporting_org_id: string | null;
  reporting_org_name: string | null;
  total_budgeted_usd: number;
  total_disbursed_usd: number;
  overspend_usd: number;
  budget_period_count: number;
  duration_years: number;
  percentage_spent: number;
}

interface FinancialCompletenessTableProps {
  data: FinancialCompletenessActivity[];
  onRowClick?: (activity: FinancialCompletenessActivity) => void;
}

type ColumnKey = 'title' | 'iati_identifier' | 'organization' | 'budgeted' | 'disbursed' | 'overspend' | 'percentage' | 'budget_periods' | 'duration';

const COLUMNS: { key: ColumnKey; label: string; defaultVisible: boolean }[] = [
  { key: 'title', label: 'Activity Title', defaultVisible: true },
  { key: 'iati_identifier', label: 'IATI Identifier', defaultVisible: true },
  { key: 'organization', label: 'Organisation', defaultVisible: true },
  { key: 'budgeted', label: 'Budgeted USD', defaultVisible: true },
  { key: 'disbursed', label: 'Disbursed USD', defaultVisible: true },
  { key: 'overspend', label: 'Overspend USD', defaultVisible: true },
  { key: 'percentage', label: '% Spent', defaultVisible: true },
  { key: 'budget_periods', label: 'Budget Periods', defaultVisible: true },
  { key: 'duration', label: 'Duration (Years)', defaultVisible: false },
];

const PAGE_SIZE = 10;

function SeverityBadge({ severity }: { severity: Severity }) {
  switch (severity) {
    case 'mild':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          Mild
        </Badge>
      );
    case 'moderate':
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
          Moderate
        </Badge>
      );
    case 'severe':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Severe
        </Badge>
      );
    default:
      return null;
  }
}

export function FinancialCompletenessTable({ data, onRowClick }: FinancialCompletenessTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(item =>
      item.title.toLowerCase().includes(query) ||
      (item.iati_identifier && item.iati_identifier.toLowerCase().includes(query)) ||
      (item.reporting_org_name && item.reporting_org_name.toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

  // Paginate data
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const toggleColumn = (key: ColumnKey) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleColumns(newVisible);
  };

  return (
    <div className="space-y-4">
      {/* Search and Column Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {COLUMNS.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visibleColumns.has(column.key)}
                onCheckedChange={() => toggleColumn(column.key)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 bg-white z-10">
              {visibleColumns.has('title') && (
                <TableHead className="bg-white min-w-[200px]">Activity Title</TableHead>
              )}
              {visibleColumns.has('iati_identifier') && (
                <TableHead className="bg-white">IATI Identifier</TableHead>
              )}
              {visibleColumns.has('organization') && (
                <TableHead className="bg-white">Organisation</TableHead>
              )}
              {visibleColumns.has('budgeted') && (
                <TableHead className="bg-white text-right">Budgeted USD</TableHead>
              )}
              {visibleColumns.has('disbursed') && (
                <TableHead className="bg-white text-right">Disbursed USD</TableHead>
              )}
              {visibleColumns.has('overspend') && (
                <TableHead className="bg-white text-right">Overspend USD</TableHead>
              )}
              {visibleColumns.has('percentage') && (
                <TableHead className="bg-white text-right">% Spent</TableHead>
              )}
              {visibleColumns.has('budget_periods') && (
                <TableHead className="bg-white text-center">Budget Periods</TableHead>
              )}
              {visibleColumns.has('duration') && (
                <TableHead className="bg-white text-center">Duration (Years)</TableHead>
              )}
              <TableHead className="bg-white text-center">Severity</TableHead>
              <TableHead className="bg-white w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.size + 2}
                  className="h-24 text-center text-slate-500"
                >
                  {searchQuery ? 'No activities match your search' : 'No activities to display'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => {
                const severity = getSeverity(item.percentage_spent);
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => onRowClick?.(item)}
                  >
                    {visibleColumns.has('title') && (
                      <TableCell className="font-medium max-w-[300px]">
                        <span className="line-clamp-2">{item.title}</span>
                      </TableCell>
                    )}
                    {visibleColumns.has('iati_identifier') && (
                      <TableCell className="font-mono text-sm text-slate-600">
                        {item.iati_identifier || '—'}
                      </TableCell>
                    )}
                    {visibleColumns.has('organization') && (
                      <TableCell className="text-slate-600">
                        {item.reporting_org_name || '—'}
                      </TableCell>
                    )}
                    {visibleColumns.has('budgeted') && (
                      <TableCell className="text-right font-medium">
                        {formatCurrencyFull(item.total_budgeted_usd)}
                      </TableCell>
                    )}
                    {visibleColumns.has('disbursed') && (
                      <TableCell className="text-right font-medium">
                        {formatCurrencyFull(item.total_disbursed_usd)}
                      </TableCell>
                    )}
                    {visibleColumns.has('overspend') && (
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrencyFull(item.overspend_usd)}
                      </TableCell>
                    )}
                    {visibleColumns.has('percentage') && (
                      <TableCell className="text-right font-medium">
                        {formatPercentage(item.percentage_spent)}
                      </TableCell>
                    )}
                    {visibleColumns.has('budget_periods') && (
                      <TableCell className="text-center">
                        {item.budget_period_count}
                      </TableCell>
                    )}
                    {visibleColumns.has('duration') && (
                      <TableCell className="text-center">
                        {item.duration_years}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <SeverityBadge severity={severity} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/activities/${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, filteredData.length)} of {filteredData.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}




