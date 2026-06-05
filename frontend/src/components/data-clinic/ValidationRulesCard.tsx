"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardCheck,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { convertToCSV, downloadCSV, CSVColumn } from '@/lib/exports';
import type { ValidationRulesResponse } from '@/types/validation-rules';
import { ACTIVITY_STATUS_LABELS } from '@/types/validation-rules';
import { apiFetch } from '@/lib/api-fetch';
import { CopyableIdBadge } from '@/components/ui/copyable-id-badge';

interface ValidationRulesCardProps {
  organizationId: string;
}

// A single, flattened data-quality issue (one failing rule for one activity).
interface DataQualityIssue {
  category: string;
  rule: string;
  activityId: string;
  iatiIdentifier: string;
  title: string;
  status: string;
  details: string;
  /** Activity editor href, deep-linked to the most relevant tab. */
  editHref: string;
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const statusLabel = (status: string): string =>
  ACTIVITY_STATUS_LABELS[status]?.label || status;

/**
 * Flatten every validation-rule failure into a uniform list of issue rows, used
 * by both the consolidated table and the CSV export. Each rule deep-links its
 * Edit action to the relevant Activity Editor tab.
 */
function flattenIssues(data: ValidationRulesResponse): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const href = (id: string, tab?: string) => `/activities/${id}${tab ? `?tab=${tab}` : ''}`;

  // ---- Activity rules ----
  data.activityRules.implementationPastEndDate.forEach((item) => {
    issues.push({
      category: 'Activity', rule: 'Implementation Past End Date',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: `${item.days_past_end} days past end`,
      editHref: href(item.id),
    });
  });
  data.activityRules.implementationWithActualEnd.forEach((item) => {
    issues.push({
      category: 'Activity', rule: 'Implementation With Actual End Date',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: `Actual end: ${formatDate(item.actual_end_date)}`,
      editHref: href(item.id),
    });
  });
  data.activityRules.missingPlannedStart.forEach((item) => {
    issues.push({
      category: 'Activity', rule: 'Missing Planned Start Date',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: '',
      editHref: href(item.id),
    });
  });
  data.activityRules.missingPlannedEnd.forEach((item) => {
    issues.push({
      category: 'Activity', rule: 'Missing Planned End Date',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status),
      details: item.planned_start_date ? `Planned start: ${formatDate(item.planned_start_date)}` : '',
      editHref: href(item.id),
    });
  });
  data.activityRules.closedWithoutActualEnd.forEach((item) => {
    issues.push({
      category: 'Activity', rule: 'Closed Without Actual End Date',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status),
      details: item.planned_end_date ? `Planned end: ${formatDate(item.planned_end_date)}` : '',
      editHref: href(item.id),
    });
  });

  // ---- Transaction rules ----
  data.transactionRules.noCommitmentTransaction.forEach((item) => {
    issues.push({
      category: 'Transaction', rule: 'No Commitment Transaction',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: `Total transactions: ${item.transaction_count}`,
      editHref: href(item.id, 'finances'),
    });
  });

  // ---- Location rules ----
  data.locationRules.percentageNotHundred.forEach((item) => {
    issues.push({
      category: 'Location', rule: "Percentages Not 100%",
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status),
      details: `Total: ${item.total_percentage}% across ${item.location_count} locations`,
      editHref: href(item.id, 'locations'),
    });
  });
  data.locationRules.noLocations.forEach((item) => {
    issues.push({
      category: 'Location', rule: 'No Locations',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: '',
      editHref: href(item.id, 'locations'),
    });
  });
  data.locationRules.mixedAdminLevels.forEach((item) => {
    issues.push({
      category: 'Location', rule: 'Mixed Admin Levels',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status),
      details: `${item.distinct_admin_levels} levels: ${item.admin_levels.join(', ')}`,
      editHref: href(item.id, 'locations'),
    });
  });
  data.locationRules.zeroPercentLocation.forEach((item) => {
    issues.push({
      category: 'Location', rule: 'Zero Percent Location',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: `Location: ${item.location_name}`,
      editHref: href(item.id, 'locations'),
    });
  });

  // ---- Participating Organisation rules ----
  data.participatingOrgRules.noImplementingOrg.forEach((item) => {
    issues.push({
      category: 'Participating Organisation', rule: 'No Implementing Organisation',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: `Participating orgs: ${item.participating_org_count}`,
      editHref: href(item.id, 'stakeholders'),
    });
  });

  // ---- Sector rules ----
  data.sectorRules.sectorPercentageNotHundred.forEach((item) => {
    issues.push({
      category: 'Sector', rule: "Percentages Not 100%",
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status),
      details: `Total: ${item.total_sector_percentage}% across ${item.sector_count} sectors`,
      editHref: href(item.id, 'sectors'),
    });
  });
  data.sectorRules.zeroPercentSector.forEach((item) => {
    issues.push({
      category: 'Sector', rule: 'Zero Percent Sector',
      activityId: item.id, iatiIdentifier: item.iati_identifier || '', title: item.title_narrative,
      status: statusLabel(item.activity_status), details: `Sector: ${item.sector_name} (${item.sector_code})`,
      editHref: href(item.id, 'sectors'),
    });
  });

  return issues;
}

const CATEGORY_BADGE: Record<string, string> = {
  Activity: 'bg-blue-50 text-blue-700',
  Transaction: 'bg-emerald-50 text-emerald-700',
  Location: 'bg-amber-50 text-amber-700',
  'Participating Organisation': 'bg-violet-50 text-violet-700',
  Sector: 'bg-rose-50 text-rose-700',
};

export function ValidationRulesCard({ organizationId }: ValidationRulesCardProps) {
  const router = useRouter();
  const [data, setData] = useState<ValidationRulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/data-clinic/validation-rules?organization_id=${organizationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch validation rules data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('[ValidationRulesCard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId, fetchData]);

  const handleDownloadCSV = () => {
    if (!data) return;
    try {
      const issues = flattenIssues(data);
      if (issues.length === 0) {
        toast.info('No validation failures to export');
        return;
      }
      const columns: CSVColumn<DataQualityIssue>[] = [
        { header: 'Rule Category', accessor: 'category' },
        { header: 'Rule Name', accessor: 'rule' },
        { header: 'Activity ID', accessor: 'activityId' },
        { header: 'IATI Identifier', accessor: 'iatiIdentifier' },
        { header: 'Title', accessor: 'title' },
        { header: 'Status', accessor: 'status' },
        { header: 'Details', accessor: 'details' },
      ];
      const csv = convertToCSV(issues, columns);
      downloadCSV(csv, 'validation_rule_failures');
      toast.success(`Exported ${issues.length} validation failures`);
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV');
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Data Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body text-destructive">Failed to load validation rules data: {error}</p>
          <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalIssues = data.counts.total;

  if (totalIssues === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#7b95a7]" />
            Data Quality
          </CardTitle>
          <CardDescription>
            Activities and transactions failing data quality rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-lg font-medium text-foreground">All data quality checks pass!</p>
            <p className="text-body text-muted-foreground mt-1">
              Great job! All your activities meet the data quality requirements.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const issues = flattenIssues(data);

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#7b95a7]" />
            Data Quality
            <Badge variant="destructive" className="ml-2">
              {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
            </Badge>
          </h2>
          <p className="text-body text-muted-foreground mt-0.5">
            Activities and transactions failing data quality rules
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleDownloadCSV}
          disabled={totalIssues === 0}
          title="Export CSV"
          aria-label="Export CSV"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Consolidated issues table */}
      <div className="border border-border rounded-lg overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead className="w-[180px]">Category</TableHead>
              <TableHead className="w-[230px]">Issue</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[64px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue, idx) => (
              <TableRow key={`${issue.activityId}-${issue.category}-${issue.rule}-${idx}`} className="hover:bg-muted">
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground leading-snug">{issue.title}</p>
                    {issue.iatiIdentifier && (
                      <CopyableIdBadge value={issue.iatiIdentifier} label="Activity ID" className="mt-0.5" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`whitespace-nowrap border-0 ${CATEGORY_BADGE[issue.category] || 'bg-muted text-muted-foreground'}`}>
                    {issue.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-body text-foreground">{issue.rule}</TableCell>
                <TableCell className="text-body text-muted-foreground">{issue.details || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="whitespace-nowrap">{issue.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(issue.editHref)}
                    title="Edit activity"
                    aria-label="Edit activity"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
