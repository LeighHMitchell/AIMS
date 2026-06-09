"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FinancialCompletenessFilters, SortOption } from "@/components/data-clinic/FinancialCompletenessFilters"
import { FinancialCompletenessChart } from "@/components/data-clinic/FinancialCompletenessChart"
import { ExpandableChartCard } from "@/components/analytics/ExpandableChartCard"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts"

const fmtUsd = (v: number) =>
  `USD ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

// Shaded-header table hover card, consistent with the Overspend by Activity chart.
function OrgOverspendTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload as {
    name: string; label: string; overspend: number
    budgeted: number; disbursed: number; activities: number
  }
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg overflow-hidden max-w-sm">
      <div className="bg-muted px-3 py-2 border-b border-border">
        <p className="font-semibold text-foreground text-body">{d.label}</p>
      </div>
      <div className="p-2">
        <Table className="w-full text-body">
          <TableBody>
            <TableRow>
              <TableCell className="pr-4 text-foreground font-medium">Budgeted</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{fmtUsd(d.budgeted)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pr-4 text-foreground font-medium">Disbursed</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{fmtUsd(d.disbursed)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pr-4 text-foreground font-medium">Overspend</TableCell>
              <TableCell className="text-right font-semibold text-destructive">{fmtUsd(d.overspend)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pr-4 text-foreground font-medium">Activities</TableCell>
              <TableCell className="text-right font-semibold text-foreground">{d.activities}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

interface FinancialCompletenessActivity {
  id: string;
  title: string;
  acronym: string | null;
  iati_identifier: string | null;
  reporting_org_id: string | null;
  reporting_org_name: string | null;
  reporting_org_acronym: string | null;
  total_budgeted_usd: number;
  total_disbursed_usd: number;
  overspend_usd: number;
  budget_period_count: number;
  duration_years: number;
  percentage_spent: number;
}

interface Organization {
  id: string;
  name: string;
  acronym?: string;
}

export function DataClinicFinancialCompleteness() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinancialCompletenessActivity[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  // Filter state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('overspend');

  // Fetch organizations for filter dropdown
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations?limit=500');
        if (response.ok) {
          const result = await response.json();
          const orgs = (result.organizations || result || []).map((org: any) => ({
            id: org.id,
            name: org.name || org.reporting_org_name || 'Unknown Organisation',
            acronym: org.acronym,
          }));
          setOrganizations(orgs);
        }
      } catch (err) {
        console.error('[FinancialCompleteness] Error fetching organizations:', err);
      }
    };
    
    fetchOrganizations();
  }, []);

  // Fetch financial completeness data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedOrgId && selectedOrgId !== 'all') {
        params.set('reporting_org_id', selectedOrgId);
      }
      
      const response = await fetch(`/api/data-clinic/financial-completeness?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial completeness data');
      }
      
      const result = await response.json();
      setData(result.activities || []);
    } catch (err) {
      console.error('[FinancialCompleteness] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedOrgId]);

  // Sort data based on selected sort option
  const sortedData = useMemo(() => {
    const sorted = [...data];
    switch (sortBy) {
      case 'overspend':
        sorted.sort((a, b) => b.overspend_usd - a.overspend_usd);
        break;
      case 'percentage':
        sorted.sort((a, b) => b.percentage_spent - a.percentage_spent);
        break;
      case 'organization':
        sorted.sort((a, b) => (a.reporting_org_name || '').localeCompare(b.reporting_org_name || ''));
        break;
    }
    return sorted;
  }, [data, sortBy]);

  // Total overspend grouped by reporting organisation (top 10)
  const overspendByOrg = useMemo(() => {
    const map = new Map<string, { overspend: number; budgeted: number; disbursed: number; activities: number; acronym: string | null }>()
    for (const a of data) {
      const name = a.reporting_org_name || 'Unattributed'
      const entry = map.get(name) || { overspend: 0, budgeted: 0, disbursed: 0, activities: 0, acronym: a.reporting_org_acronym || null }
      entry.overspend += a.overspend_usd || 0
      entry.budgeted += a.total_budgeted_usd || 0
      entry.disbursed += a.total_disbursed_usd || 0
      entry.activities += 1
      if (!entry.acronym && a.reporting_org_acronym) entry.acronym = a.reporting_org_acronym
      map.set(name, entry)
    }
    return Array.from(map.entries())
      .map(([name, e]) => ({
        name,
        label: e.acronym ? `${name} (${e.acronym})` : name,
        overspend: e.overspend,
        budgeted: e.budgeted,
        disbursed: e.disbursed,
        activities: e.activities,
      }))
      .sort((a, b) => b.overspend - a.overspend)
      .slice(0, 10)
  }, [data])

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedOrgId('all');
    setSortBy('overspend');
  };

  // Error State
  if (error) {
    return (
      <Card className="bg-muted">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Unable to load financial completeness data.</p>
            <p className="text-body text-muted-foreground">{error}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchData}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Success State - No Issues Found
  if (data.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 py-8">
          <CheckCircle2 className="h-10 w-10 text-[hsl(var(--success-icon))]" />
          <div>
            <p className="font-semibold text-green-900 text-lg">
              No financial completeness issues detected.
            </p>
            <p className="text-body text-green-700 mt-1">
              All multi-year activities have appropriate budget coverage, or no activities meet the criteria for this check.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filtersEl = (
    <FinancialCompletenessFilters
      organizations={organizations}
      selectedOrgId={selectedOrgId}
      sortBy={sortBy}
      onOrgChange={setSelectedOrgId}
      onSortChange={setSortBy}
      onClearFilters={handleClearFilters}
    />
  );

  const completenessFooter = (
    <p className="text-body text-muted-foreground leading-relaxed">
      These charts surface multi-year activities (running 365 days or more) that have fewer than two budget
      periods yet have already disbursed more than was budgeted — a pattern that usually means the budget side
      of the activity is incomplete rather than that spending is genuinely out of control. Longer, darker bars
      represent larger or more severe overspends, and the companion chart rolls the same overspend up by
      reporting organisation so you can see which reporters account for most of it. Use the list to find the
      activities and organisations whose budgets need attention, then add or correct their missing budget
      periods so the recorded budgets reflect what is actually being spent — which keeps the financial picture
      in your aid data accurate, complete and easier to trust.
    </p>
  );

  // Data Found - two-column charts
  return (
    <div className="grid gap-6 lg:grid-cols-2 items-stretch">
      <FinancialCompletenessChart
        data={sortedData}
        loading={false}
        collapsedHeight={380}
        sortBy={sortBy}
        expandedControls={filtersEl}
        expandedFooter={completenessFooter}
      />

      <ExpandableChartCard
        title="Overspend by Organisation"
        description="Total overspend (disbursed minus budgeted) per reporting organisation"
        height={380}
        expandedFill
        expandedFooter={completenessFooter}
      >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overspendByOrg}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11, fill: '#334155' }} />
              <RTooltip
                content={<OrgOverspendTooltip />}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 50 }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="overspend" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChartCard>
    </div>
  );
}







