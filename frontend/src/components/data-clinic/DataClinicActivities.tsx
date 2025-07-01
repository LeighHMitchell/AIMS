"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Edit2,
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
import { useUser } from "@/hooks/useUser";

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

type Activity = {
  id: string;
  title: string;
  iatiIdentifier?: string;
  default_aid_type?: string;
  default_finance_type?: string;
  flow_type?: string;
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

type DataGap = {
  field: string;
  label: string;
  count: number;
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
  const [dataGaps, setDataGaps] = useState<DataGap[]>([]);
  const [hasIatiFields, setHasIatiFields] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const isSuperUser = user?.role === 'super_user';

  useEffect(() => {
    fetchActivitiesWithGaps();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, selectedFilter, searchQuery]);

  const fetchActivitiesWithGaps = async () => {
    try {
      console.log('[DataClinic] Fetching activities with gaps...');
      const url = showAllActivities 
        ? '/api/data-clinic/activities?missing_fields=true&show_all=true'
        : '/api/data-clinic/activities?missing_fields=true';
      const res = await fetch(url);
      console.log('[DataClinic] Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[DataClinic] API Error:', errorText);
        throw new Error(`Failed to fetch activities: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('[DataClinic] Response data:', data);
      console.log('[DataClinic] Activities count:', data.activities?.length || 0);
      console.log('[DataClinic] Data gaps:', data.dataGaps);
      console.log('[DataClinic] Has IATI fields:', data.hasIatiFields);
      
      setActivities(data.activities || []);
      setDataGaps(data.dataGaps || []);
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
          case 'missing_flow_type':
            return !activity.flow_type;
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
      const res = await fetch(`/api/data-clinic/activities/${activityId}`, {
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
      const res = await fetch('/api/data-clinic/bulk-update', {
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
                onValueChange={(newValue) => handleInlineEdit(activity.id, field, newValue)}
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
                onValueChange={(newValue) => handleInlineEdit(activity.id, field, newValue)}
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
                onValueChange={(newValue) => handleInlineEdit(activity.id, field, newValue)}
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
          <span className="text-sm">
            {field === 'default_aid_type' && AID_TYPE_LABELS[value] ? 
              `${value} - ${AID_TYPE_LABELS[value]}` : 
              field === 'default_finance_type' && FINANCE_TYPE_LABELS[value] ?
              `${value} - ${FINANCE_TYPE_LABELS[value]}` :
              field === 'flow_type' && FLOW_TYPE_LABELS[value] ?
              `${value} - ${FLOW_TYPE_LABELS[value]}` :
              value
            }
          </span>
        ) : (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        )}
        {isSuperUser && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingField({ activityId: activity.id, field })}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  // Re-fetch when showAllActivities changes
  useEffect(() => {
    fetchActivitiesWithGaps();
  }, [showAllActivities]);

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
            <p className="text-sm text-orange-800 mb-3">
              The IATI compliance fields are not yet available in your database. 
              Please run the migration to enable full Data Clinic functionality.
            </p>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <p className="text-sm font-mono text-gray-700">
                psql -h your-host -U your-user -d your-db -f frontend/sql/add_data_clinic_fields.sql
              </p>
            </div>
            <p className="text-xs text-orange-700 mt-2">
              Or run the SQL in your Supabase Dashboard's SQL Editor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Gaps Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Gaps Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataGaps.map((gap) => (
              <div
                key={gap.field}
                className="p-4 rounded-lg border cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedFilter(gap.field)}
              >
                <p className="text-sm text-muted-foreground">{gap.label}</p>
                <p className="text-2xl font-semibold">{gap.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="missing_aid_type">Missing Aid Type</SelectItem>
                <SelectItem value="missing_finance_type">Missing Finance Type</SelectItem>
                <SelectItem value="missing_flow_type">Missing Flow Type</SelectItem>
                <SelectItem value="missing_sector">Missing Sector</SelectItem>
                <SelectItem value="missing_implementing_org">Missing Implementing Org</SelectItem>
                <SelectItem value="missing_start_date">Missing Start Date</SelectItem>
                <SelectItem value="missing_status">Missing Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowAllActivities(!showAllActivities)}
              className={showAllActivities ? "bg-blue-50" : ""}
            >
              {showAllActivities ? "Show Gaps Only" : "Show All"}
            </Button>
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
                <p className="text-sm font-medium">
                  {selectedActivities.size} activities selected
                </p>
                <Select value={bulkEditField} onValueChange={setBulkEditField}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default_aid_type">Aid Type</SelectItem>
                    <SelectItem value="default_finance_type">Finance Type</SelectItem>
                    <SelectItem value="flow_type">Flow Type</SelectItem>
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
              <thead className="border-b bg-gray-50">
                <tr>
                  {isSuperUser && (
                    <th className="p-4 text-left">
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
                  <th className="p-4 text-left text-sm font-medium">Title</th>
                  <th className="p-4 text-left text-sm font-medium">IATI ID</th>
                  <th className="p-4 text-left text-sm font-medium">Aid Type</th>
                  <th className="p-4 text-left text-sm font-medium">Finance Type</th>
                  <th className="p-4 text-left text-sm font-medium">Flow Type</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Sectors</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperUser ? 8 : 7} className="p-8 text-center text-muted-foreground">
                      No activities found with data gaps
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((activity) => (
                    <tr key={activity.id} className="border-b hover:bg-gray-50">
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
                      <td className="p-4 text-sm text-muted-foreground">
                        {activity.iatiIdentifier || '-'}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'default_aid_type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'default_finance_type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'flow_type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(activity, 'activityStatus')}
                      </td>
                      <td className="p-4">
                        {activity.sectors && activity.sectors.length > 0 ? (
                          <span className="text-sm">{activity.sectors.length} sectors</span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
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