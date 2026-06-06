"use client"

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSortIcon, sortableHeaderClasses } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  AlertCircle, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Save,
  X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AidTypeSelect } from "@/components/forms/AidTypeSelect";
import { DefaultFinanceTypeSelect } from "@/components/forms/DefaultFinanceTypeSelect";
import { ActivityStatusSelect } from "@/components/forms/ActivityStatusSelect";
import { FlowTypeSelect } from "@/components/forms/FlowTypeSelect";
import { useUser } from "@/hooks/useUser";
import { apiFetch } from '@/lib/api-fetch';
import { formatClinicDate } from './formatters';

// Aid Type mappings
const AID_TYPE_LABELS: Record<string, string> = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Contributions to pooled programmes and funds',
  'B04': 'Basket funds/pooled funding',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

// Finance Type mappings
const FINANCE_TYPE_LABELS: Record<string, string> = {
  '110': 'Standard grant',
  '210': 'Interest subsidy',
  '310': 'Capital subscription on deposit basis',
  '311': 'Capital subscription on encashment basis',
  '410': 'Aid loan excluding debt reorganisation',
  '421': 'Reimbursable grant'
};

// Flow Type mappings
const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'ODA',
  '20': 'OOF',
  '30': 'Private grants',
  '35': 'Private market',
  '40': 'Non flow',
  '50': 'Other flows'
};

// Render an IATI code + label as "[code] Label" with the code in a gray
// monospace badge. The badge sits inline with the label text so they stay on
// the same line and the label wraps naturally beside it when space is tight.
const renderCodeLabel = (code: string, label?: string) => (
  <span className="text-body">
    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap align-middle mr-1.5">{code}</span>
    {label}
  </span>
);

type Activity = {
  id: string;
  title: string;
  iatiIdentifier?: string;
  default_aid_type?: string;
  default_finance_type?: string;
  default_flow_type?: string;
  activityStatus?: string;
  sectors?: any[];
  participatingOrgs?: any[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
};

export function DataClinicActivities() {
  const { user } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ activityId: string; field: string } | null>(null);
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [hasIatiFields, setHasIatiFields] = useState(true);
  const [sortField, setSortField] = useState<'title' | 'iati' | 'aid' | 'finance' | 'flow' | 'status' | 'start' | 'sectors'>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedActivities = useMemo(() => {
    const startDate = (a: Activity) =>
      a.plannedStartDate || a.actualStartDate || a.planned_start_date || a.actual_start_date || '';
    return [...filteredActivities].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '') * dir;
        case 'iati':
          return (a.iatiIdentifier || '').localeCompare(b.iatiIdentifier || '') * dir;
        case 'aid':
          return (a.default_aid_type || '').localeCompare(b.default_aid_type || '') * dir;
        case 'finance':
          return (a.default_finance_type || '').localeCompare(b.default_finance_type || '') * dir;
        case 'flow':
          return (a.default_flow_type || '').localeCompare(b.default_flow_type || '') * dir;
        case 'status':
          return (a.activityStatus || '').localeCompare(b.activityStatus || '') * dir;
        case 'start':
          return (String(startDate(a)) < String(startDate(b)) ? -1 : 1) * dir;
        case 'sectors':
          return ((a.sectors?.length || 0) - (b.sectors?.length || 0)) * dir;
        default:
          return 0;
      }
    });
  }, [filteredActivities, sortField, sortDirection]);

  const isSuperUser = user?.role === 'super_user';

  useEffect(() => {
    fetchActivitiesWithGaps();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, selectedFilter, searchQuery]);

  const fetchActivitiesWithGaps = async () => {
    try {
      const url = '/api/data-clinic/activities?missing_fields=true';
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[DataClinic] API Error:', errorText);
        throw new Error(`Failed to fetch activities: ${res.status}`);
      }
      
      const data = await res.json();
      
      setActivities(data.activities || []);
      setHasIatiFields(data.hasIatiFields !== false); // Default to true if not specified
      
      if (data.message) {
        toast.info(data.message);
      }
    } catch (error) {
      console.error('[DataClinic] Error fetching activities:', error);
      toast.error('Failed to load activities. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Apply field filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(activity => {
        switch (selectedFilter) {
          case 'missing_aid_type':
            return !activity.default_aid_type;
          case 'missing_finance_type':
            return !activity.default_finance_type;
                case 'missing_default_flow_type':
        return !activity.default_flow_type;
          case 'missing_sector':
            return !activity.sectors || activity.sectors.length === 0;
          case 'missing_implementing_org':
            return !activity.participatingOrgs || 
                   !activity.participatingOrgs.some((org: any) => org.role === '4');
          case 'missing_start_date':
            return !activity.plannedStartDate && !activity.actualStartDate;
          case 'missing_status':
            return !activity.activityStatus;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.iatiIdentifier?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredActivities(filtered);
  };

  const handleInlineEdit = async (activityId: string, field: string, value: string) => {
    try {
      const res = await apiFetch(`/api/data-clinic/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, userId: user?.id })
      });

      if (!res.ok) throw new Error('Failed to update activity');

      // Update local state
      setActivities(prev => prev.map(activity => 
        activity.id === activityId ? { ...activity, [field]: value } : activity
      ));

      toast.success('Activity updated successfully');
      setEditingField(null);
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkEditField || !bulkEditValue || selectedActivities.size === 0) {
      toast.error('Please select activities and provide a field and value');
      return;
    }

    try {
      const res = await apiFetch('/api/data-clinic/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'activity',
          field: bulkEditField,
          value: bulkEditValue,
          ids: Array.from(selectedActivities),
          user_id: user?.id
        })
      });

      if (!res.ok) throw new Error('Failed to bulk update');

      toast.success(`Updated ${selectedActivities.size} activities`);
      setSelectedActivities(new Set());
      setBulkEditField('');
      setBulkEditValue('');
      fetchActivitiesWithGaps(); // Refresh data
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to bulk update activities');
    }
  };

  const renderFieldValue = (activity: Activity, field: string) => {
    const value = activity[field];
    
    if (editingField?.activityId === activity.id && editingField?.field === field) {
      switch (field) {
        case 'default_aid_type':
          return (
            <div className="flex items-center gap-2">
              <AidTypeSelect
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(activity.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'default_finance_type':
          return (
            <div className="flex items-center gap-2">
              <DefaultFinanceTypeSelect
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(activity.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'default_flow_type':
          return (
            <div className="flex items-center gap-2">
              <FlowTypeSelect
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(activity.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'activityStatus':
          return (
            <div className="flex items-center gap-2">
              <ActivityStatusSelect
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(activity.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={value || ''}
                onChange={(e) => handleInlineEdit(activity.id, field, e.target.value)}
                className="w-32"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
      }
    }

    // Display value with edit button for super users
    return (
      <div className="flex items-center gap-2">
        {value ? (
          field === 'default_aid_type' ? renderCodeLabel(value, AID_TYPE_LABELS[value]) :
          field === 'default_finance_type' ? renderCodeLabel(value, FINANCE_TYPE_LABELS[value]) :
          field === 'default_flow_type' ? renderCodeLabel(value, FLOW_TYPE_LABELS[value]) :
          <span className="text-body">{value}</span>
        ) : (
          <Badge
            variant="outline"
            className={`text-helper border border-red-500 text-red-600 bg-transparent ${isSuperUser ? 'cursor-pointer hover:bg-red-50' : ''}`}
            onClick={isSuperUser ? () => setEditingField({ activityId: activity.id, field }) : undefined}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        )}
      </div>
    );
  };

  // Start date spans two columns (planned OR actual) — show the effective date,
  // edit writes to planned_start_date. Missing only when both are absent.
  const renderStartDate = (activity: Activity) => {
    const start = activity.plannedStartDate || activity.actualStartDate ||
      activity.planned_start_date || activity.actual_start_date;

    if (editingField?.activityId === activity.id && editingField?.field === 'planned_start_date') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={start ? String(start).slice(0, 10) : ''}
            onChange={(e) => handleInlineEdit(activity.id, 'planned_start_date', e.target.value)}
            className="w-40"
            autoFocus
          />
          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {start ? (
          <span className="text-body whitespace-nowrap">{formatClinicDate(String(start))}</span>
        ) : (
          <Badge
            variant="outline"
            className={`text-helper border border-red-500 text-red-600 bg-transparent ${isSuperUser ? 'cursor-pointer hover:bg-red-50' : ''}`}
            onClick={isSuperUser ? () => setEditingField({ activityId: activity.id, field: 'planned_start_date' }) : undefined}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Migration Warning */}
      {!hasIatiFields && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg text-orange-900">Database Migration Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-body text-orange-800 mb-3">
              The IATI compliance fields are not yet available in your database. 
              Please run the migration to enable full Data Clinic functionality.
            </p>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <p className="text-sm font-mono text-foreground">
                psql -h your-host -U your-user -d your-db -f frontend/sql/add_data_clinic_fields.sql
              </p>
            </div>
            <p className="text-helper text-orange-700 mt-2">
              Or run the SQL in your Supabase Dashboard's SQL Editor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by missing field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activities</SelectItem>
                <SelectItem value="missing_aid_type">Missing Default Aid Type</SelectItem>
                <SelectItem value="missing_finance_type">Missing Default Finance Type</SelectItem>
                <SelectItem value="missing_default_flow_type">Missing Default Flow Type</SelectItem>
                <SelectItem value="missing_sector">Missing Sector</SelectItem>
                <SelectItem value="missing_implementing_org">Missing Implementing Org</SelectItem>
                <SelectItem value="missing_start_date">Missing Start Date</SelectItem>
                <SelectItem value="missing_status">Missing Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => fetchActivitiesWithGaps()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions for Super Users */}
          {isSuperUser && selectedActivities.size > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-4">
                <p className="text-body font-medium">
                  {selectedActivities.size} activities selected
                </p>
                <Select value={bulkEditField} onValueChange={setBulkEditField}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default_aid_type">Default Aid Type</SelectItem>
                    <SelectItem value="default_finance_type">Default Finance Type</SelectItem>
                    <SelectItem value="default_flow_type">Default Flow Type</SelectItem>
                    <SelectItem value="activityStatus">Activity Status</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter value"
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-[200px]"
                />
                <Button onClick={handleBulkUpdate}>
                  <Save className="h-4 w-4 mr-2" />
                  Apply to Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  {isSuperUser && (
                    <th className="h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground">
                      <Checkbox
                        checked={selectedActivities.size === filteredActivities.length && filteredActivities.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedActivities(new Set(filteredActivities.map(a => a.id)));
                          } else {
                            setSelectedActivities(new Set());
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('title')}>
                    <div className="flex items-center gap-1">Title {getSortIcon('title', sortField, sortDirection)}</div>
                  </th>
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('iati')}>
                    <div className="flex items-center gap-1">IATI ID {getSortIcon('iati', sortField, sortDirection)}</div>
                  </th>
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('aid')}>
                    <div className="flex items-center gap-1">Default Aid Type {getSortIcon('aid', sortField, sortDirection)}</div>
                  </th>
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('finance')}>
                    <div className="flex items-center gap-1">Default Finance Type {getSortIcon('finance', sortField, sortDirection)}</div>
                  </th>
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('flow')}>
                    <div className="flex items-center gap-1">Default Flow Type {getSortIcon('flow', sortField, sortDirection)}</div>
                  </th>
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">Status {getSortIcon('status', sortField, sortDirection)}</div>
                  </th>
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('start')}>
                    <div className="flex items-center gap-1">Start Date {getSortIcon('start', sortField, sortDirection)}</div>
                  </th>
                  <th className={`h-12 px-4 py-3 text-left align-top text-body font-medium text-muted-foreground ${sortableHeaderClasses}`} onClick={() => handleSort('sectors')}>
                    <div className="flex items-center gap-1">Sectors {getSortIcon('sectors', sortField, sortDirection)}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedActivities.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperUser ? 9 : 8} className="p-8 text-center text-muted-foreground">
                      No activities found with data gaps
                    </td>
                  </tr>
                ) : (
                  sortedActivities.map((activity) => (
                    <tr key={activity.id} className="border-b hover:bg-muted/50">
                      {isSuperUser && (
                        <td className="p-4">
                          <Checkbox
                            checked={selectedActivities.has(activity.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedActivities);
                              if (checked) {
                                newSelected.add(activity.id);
                              } else {
                                newSelected.delete(activity.id);
                              }
                              setSelectedActivities(newSelected);
                            }}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-medium truncate max-w-xs">
                                {activity.title}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{activity.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="p-4">
                        {activity.iatiIdentifier
                          ? <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{activity.iatiIdentifier}</span>
                          : <span className="text-body text-muted-foreground">-</span>
                        }
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'default_aid_type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'default_finance_type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'default_flow_type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'activityStatus')}
                      </td>
                      <td className="p-4">
                        {renderStartDate(activity)}
                      </td>
                      <td className="p-4">
                        {activity.sectors && activity.sectors.length > 0 ? (
                          <span className="text-body">{activity.sectors.length} sectors</span>
                        ) : (
                          <Badge variant="outline" className="text-helper border border-red-500 text-red-600 bg-transparent">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 