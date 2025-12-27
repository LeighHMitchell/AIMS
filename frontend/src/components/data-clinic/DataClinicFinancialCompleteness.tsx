"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FinancialCompletenessFilters, SortOption } from "@/components/data-clinic/FinancialCompletenessFilters"
import { FinancialCompletenessChart } from "@/components/data-clinic/FinancialCompletenessChart"

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

interface Organization {
  id: string;
  name: string;
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
            name: org.name || org.reporting_org_name || 'Unknown Organization'
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

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedOrgId('all');
    setSortBy('overspend');
  };

  // Error State
  if (error) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-8 w-8 text-slate-400" />
          <div>
            <p className="font-medium text-slate-700">Unable to load financial completeness data.</p>
            <p className="text-sm text-slate-500">{error}</p>
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
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <div>
            <p className="font-semibold text-green-900 text-lg">
              No financial completeness issues detected.
            </p>
            <p className="text-sm text-green-700 mt-1">
              All multi-year activities have appropriate budget coverage, or no activities meet the criteria for this check.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Data Found - Show Filters, Chart, and Table
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <p className="text-sm text-amber-800">
            <strong>Criteria:</strong> Activities shown below are multi-year (≥365 days), have fewer than 2 budget periods, 
            and have disbursed more than budgeted. This may indicate incomplete financial reporting.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <FinancialCompletenessFilters
            organizations={organizations}
            selectedOrgId={selectedOrgId}
            sortBy={sortBy}
            onOrgChange={setSelectedOrgId}
            onSortChange={setSortBy}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Chart with Table Toggle */}
      <FinancialCompletenessChart
        data={sortedData}
        loading={false}
      />
    </div>
  );
}






