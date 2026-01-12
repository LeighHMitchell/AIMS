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
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { convertToCSV, downloadCSV, CSVColumn } from '@/lib/csv-utils';
import type {
  ValidationRulesResponse,
  ImplementationPastEndDateActivity,
  ImplementationWithActualEndActivity,
  MissingPlannedStartActivity,
  MissingPlannedEndActivity,
  ClosedWithoutActualEndActivity,
  NoCommitmentActivity,
  PercentageNotHundredActivity,
  NoLocationsActivity,
  MixedAdminLevelsActivity,
  ZeroPercentLocationActivity,
  NoImplementingOrgActivity,
  SectorPercentageNotHundredActivity,
  ZeroPercentSectorActivity,
} from '@/types/validation-rules';
import { ACTIVITY_STATUS_LABELS } from '@/types/validation-rules';

interface ValidationRulesCardProps {
  organizationId: string;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusInfo = ACTIVITY_STATUS_LABELS[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
      {statusInfo.label}
    </span>
  );
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

// Validation rule table component
interface RuleTableProps<T> {
  title: string;
  description: string;
  items: T[];
  columns: { header: string; accessor: (item: T) => React.ReactNode; className?: string }[];
  onEditClick: (activityId: string) => void;
}

function RuleTable<T extends { id: string }>({
  title,
  description,
  items,
  columns,
  onEditClick,
}: RuleTableProps<T>) {
  if (items.length === 0) {
    return null; // Don't render empty tables
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              {title}
              <Badge variant="destructive">{items.length}</Badge>
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead key={idx} className={col.className}>
                {col.header}
              </TableHead>
            ))}
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50">
              {columns.map((col, idx) => (
                <TableCell key={idx} className={col.className}>
                  {col.accessor(item)}
                </TableCell>
              ))}
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900"
                  onClick={() => onEditClick(item.id)}
                >
                  Edit
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ValidationRulesCard({ organizationId }: ValidationRulesCardProps) {
  const router = useRouter();
  const [data, setData] = useState<ValidationRulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/data-clinic/validation-rules?organization_id=${organizationId}`);
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

  const handleEditClick = (activityId: string) => {
    router.push(`/activities/${activityId}`);
  };

  const handleDownloadCSV = () => {
    if (!data) return;

    try {
      // Flatten all validation failures into a single CSV
      const allFailures: any[] = [];

      // Activity rules
      data.activityRules.implementationPastEndDate.forEach(item => {
        allFailures.push({
          rule_category: 'Activity',
          rule_name: 'Implementation Past End Date',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `${item.days_past_end} days past end`,
        });
      });

      data.activityRules.implementationWithActualEnd.forEach(item => {
        allFailures.push({
          rule_category: 'Activity',
          rule_name: 'Implementation With Actual End Date',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `Actual end: ${formatDate(item.actual_end_date)}`,
        });
      });

      data.activityRules.missingPlannedStart.forEach(item => {
        allFailures.push({
          rule_category: 'Activity',
          rule_name: 'Missing Planned Start Date',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: '',
        });
      });

      data.activityRules.missingPlannedEnd.forEach(item => {
        allFailures.push({
          rule_category: 'Activity',
          rule_name: 'Missing Planned End Date',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: item.planned_start_date ? `Planned start: ${formatDate(item.planned_start_date)}` : '',
        });
      });

      data.activityRules.closedWithoutActualEnd.forEach(item => {
        allFailures.push({
          rule_category: 'Activity',
          rule_name: 'Closed Without Actual End Date',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: item.planned_end_date ? `Planned end: ${formatDate(item.planned_end_date)}` : '',
        });
      });

      // Transaction rules
      data.transactionRules.noCommitmentTransaction.forEach(item => {
        allFailures.push({
          rule_category: 'Transaction',
          rule_name: 'No Commitment Transaction',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `Total transactions: ${item.transaction_count}`,
        });
      });

      // Location rules
      data.locationRules.percentageNotHundred.forEach(item => {
        allFailures.push({
          rule_category: 'Location',
          rule_name: 'Percentages Not 100%',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `Total: ${item.total_percentage}% across ${item.location_count} locations`,
        });
      });

      data.locationRules.noLocations.forEach(item => {
        allFailures.push({
          rule_category: 'Location',
          rule_name: 'No Locations',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: '',
        });
      });

      data.locationRules.mixedAdminLevels.forEach(item => {
        allFailures.push({
          rule_category: 'Location',
          rule_name: 'Mixed Admin Levels',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `${item.distinct_admin_levels} levels: ${item.admin_levels.join(', ')}`,
        });
      });

      data.locationRules.zeroPercentLocation.forEach(item => {
        allFailures.push({
          rule_category: 'Location',
          rule_name: 'Zero Percent Location',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `Location: ${item.location_name}`,
        });
      });

      // Participating Organisation rules
      data.participatingOrgRules.noImplementingOrg.forEach(item => {
        allFailures.push({
          rule_category: 'Participating Organisation',
          rule_name: 'No Implementing Organisation',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `Participating orgs: ${item.participating_org_count}`,
        });
      });

      // Sector rules
      data.sectorRules.sectorPercentageNotHundred.forEach(item => {
        allFailures.push({
          rule_category: 'Sector',
          rule_name: 'Percentages Not 100%',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `Total: ${item.total_sector_percentage}% across ${item.sector_count} sectors`,
        });
      });

      data.sectorRules.zeroPercentSector.forEach(item => {
        allFailures.push({
          rule_category: 'Sector',
          rule_name: 'Zero Percent Sector',
          activity_id: item.id,
          iati_identifier: item.iati_identifier || '',
          title: item.title_narrative,
          status: ACTIVITY_STATUS_LABELS[item.activity_status]?.label || item.activity_status,
          details: `Sector: ${item.sector_name} (${item.sector_code})`,
        });
      });

      if (allFailures.length === 0) {
        toast.info('No validation failures to export');
        return;
      }

      const columns: CSVColumn<typeof allFailures[0]>[] = [
        { header: 'Rule Category', accessor: 'rule_category' },
        { header: 'Rule Name', accessor: 'rule_name' },
        { header: 'Activity ID', accessor: 'activity_id' },
        { header: 'IATI Identifier', accessor: 'iati_identifier' },
        { header: 'Title', accessor: 'title' },
        { header: 'Status', accessor: 'status' },
        { header: 'Details', accessor: 'details' },
      ];

      const csv = convertToCSV(allFailures, columns);
      downloadCSV(csv, 'validation_rule_failures');
      toast.success(`Exported ${allFailures.length} validation failures`);
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
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
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
            <AlertCircle className="h-5 w-5 text-red-500" />
            Validation Rules Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load validation rules data: {error}</p>
          <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalIssues = data.counts.total;

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[#7b95a7]" />
              Validation Rules Check
              {totalIssues > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Activities and transactions failing data quality rules
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            disabled={totalIssues === 0}
            title="Download all failures as CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {totalIssues === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium text-slate-700">All validation rules pass!</p>
            <p className="text-sm text-slate-500 mt-1">
              Great job! All your activities meet the data quality requirements.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Activity Rules */}
            <RuleTable<ImplementationPastEndDateActivity>
              title="Implementation Past End Date"
              description="Activities under implementation but past their planned end date"
              items={data.activityRules.implementationPastEndDate}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Planned End Date',
                  accessor: (item) => formatDate(item.planned_end_date),
                  className: 'w-[130px]',
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
                {
                  header: 'Days Past End',
                  accessor: (item) => (
                    <Badge variant="destructive">{item.days_past_end} days</Badge>
                  ),
                  className: 'w-[120px]',
                },
              ]}
              onEditClick={handleEditClick}
            />

            <RuleTable<ImplementationWithActualEndActivity>
              title="Implementation With Actual End Date"
              description="Activities in implementation status that have an actual end date set"
              items={data.activityRules.implementationWithActualEnd}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
                {
                  header: 'Actual End Date',
                  accessor: (item) => formatDate(item.actual_end_date),
                  className: 'w-[130px]',
                },
                {
                  header: 'Last Updated',
                  accessor: (item) => formatDate(item.updated_at),
                  className: 'w-[130px]',
                },
              ]}
              onEditClick={handleEditClick}
            />

            <RuleTable<MissingPlannedStartActivity>
              title="Missing Planned Start Date"
              description="Activities without a planned start date"
              items={data.activityRules.missingPlannedStart}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
                {
                  header: 'Created',
                  accessor: (item) => formatDate(item.created_at),
                  className: 'w-[130px]',
                },
                {
                  header: 'Last Updated',
                  accessor: (item) => formatDate(item.updated_at),
                  className: 'w-[130px]',
                },
              ]}
              onEditClick={handleEditClick}
            />

            <RuleTable<MissingPlannedEndActivity>
              title="Missing Planned End Date"
              description="Activities without a planned end date"
              items={data.activityRules.missingPlannedEnd}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Planned Start',
                  accessor: (item) => formatDate(item.planned_start_date),
                  className: 'w-[130px]',
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
                {
                  header: 'Last Updated',
                  accessor: (item) => formatDate(item.updated_at),
                  className: 'w-[130px]',
                },
              ]}
              onEditClick={handleEditClick}
            />

            <RuleTable<ClosedWithoutActualEndActivity>
              title="Closed Without Actual End Date"
              description="Closed activities that don't have an actual end date"
              items={data.activityRules.closedWithoutActualEnd}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Planned End',
                  accessor: (item) => formatDate(item.planned_end_date),
                  className: 'w-[130px]',
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
                {
                  header: 'Last Updated',
                  accessor: (item) => formatDate(item.updated_at),
                  className: 'w-[130px]',
                },
              ]}
              onEditClick={handleEditClick}
            />

            {/* Transaction Rules */}
            <RuleTable<NoCommitmentActivity>
              title="No Commitment Transaction"
              description="Activities without any commitment transactions"
              items={data.transactionRules.noCommitmentTransaction}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Total Transactions',
                  accessor: (item) => item.transaction_count,
                  className: 'w-[140px]',
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=finances`)}
            />

            {/* Location Rules */}
            <RuleTable<PercentageNotHundredActivity>
              title="Percentages Don't Sum to 100%"
              description="Activities where location percentages don't add up to 100%"
              items={data.locationRules.percentageNotHundred}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Total %',
                  accessor: (item) => (
                    <Badge variant="destructive">{item.total_percentage.toFixed(1)}%</Badge>
                  ),
                  className: 'w-[100px]',
                },
                {
                  header: 'Locations',
                  accessor: (item) => item.location_count,
                  className: 'w-[100px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=locations`)}
            />

            <RuleTable<NoLocationsActivity>
              title="No Locations"
              description="Activities without any linked locations"
              items={data.locationRules.noLocations}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=locations`)}
            />

            <RuleTable<MixedAdminLevelsActivity>
              title="Mixed Admin Levels"
              description="Activities with locations at different administrative levels"
              items={data.locationRules.mixedAdminLevels}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Admin Levels',
                  accessor: (item) => (
                    <div className="flex gap-1 flex-wrap">
                      {item.admin_levels.map((level, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          Level {level}
                        </Badge>
                      ))}
                    </div>
                  ),
                  className: 'w-[150px]',
                },
                {
                  header: 'Locations',
                  accessor: (item) => item.location_count,
                  className: 'w-[100px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=locations`)}
            />

            <RuleTable<ZeroPercentLocationActivity>
              title="Zero Percent Location"
              description="Activities with locations that have 0% allocation"
              items={data.locationRules.zeroPercentLocation}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Location',
                  accessor: (item) => item.location_name,
                  className: 'w-[200px]',
                },
                {
                  header: 'Percentage',
                  accessor: () => (
                    <Badge variant="destructive">0%</Badge>
                  ),
                  className: 'w-[100px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=locations`)}
            />

            {/* Participating Organisation Rules */}
            <RuleTable<NoImplementingOrgActivity>
              title="No Implementing Organisation"
              description="Activities without an implementing organisation"
              items={data.participatingOrgRules.noImplementingOrg}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Status',
                  accessor: (item) => <StatusBadge status={item.activity_status} />,
                  className: 'w-[120px]',
                },
                {
                  header: 'Participating Orgs',
                  accessor: (item) => item.participating_org_count,
                  className: 'w-[140px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=stakeholders`)}
            />

            {/* Sector Rules */}
            <RuleTable<SectorPercentageNotHundredActivity>
              title="Sector Percentages Don't Sum to 100%"
              description="Activities where sector percentage allocations don't total 100%"
              items={data.sectorRules.sectorPercentageNotHundred}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Total %',
                  accessor: (item) => (
                    <Badge variant="destructive">{item.total_sector_percentage.toFixed(1)}%</Badge>
                  ),
                  className: 'w-[100px]',
                },
                {
                  header: 'Sectors',
                  accessor: (item) => item.sector_count,
                  className: 'w-[100px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=sectors`)}
            />

            <RuleTable<ZeroPercentSectorActivity>
              title="Zero Percent Sector"
              description="Activities with sectors that have 0% allocation"
              items={data.sectorRules.zeroPercentSector}
              columns={[
                {
                  header: 'Activity',
                  accessor: (item) => (
                    <div>
                      <p className="font-medium text-slate-900 line-clamp-1">{item.title_narrative}</p>
                      {item.iati_identifier && (
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {item.iati_identifier}
                        </code>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Sector',
                  accessor: (item) => (
                    <div>
                      <p className="text-slate-900">{item.sector_name}</p>
                      <code className="text-xs font-mono text-slate-500">{item.sector_code}</code>
                    </div>
                  ),
                  className: 'w-[200px]',
                },
                {
                  header: 'Percentage',
                  accessor: () => (
                    <Badge variant="destructive">0%</Badge>
                  ),
                  className: 'w-[100px]',
                },
              ]}
              onEditClick={(id) => router.push(`/activities/${id}?tab=sectors`)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
