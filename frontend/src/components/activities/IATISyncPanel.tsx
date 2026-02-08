import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  RefreshCw,
  Globe,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Loader2,
  Info,
  Calendar,
  Activity,
  Clock,
  History,
  Zap,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { FIELD_MAPPINGS } from '@/lib/iati-field-mapper';

// Sync field groups that match the cron route's hasFieldChanged() keys
const SYNC_FIELD_GROUPS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  status: 'Activity Status',
  dates: 'Dates (planned/actual start & end)',
  transactions: 'Transactions',
  budgets: 'Budgets',
  sectors: 'Sectors',
  organizations: 'Participating Organizations',
  locations: 'Locations',
  contacts: 'Contacts',
  documents: 'Documents',
  countries: 'Recipient Countries',
  planned_disbursements: 'Planned Disbursements',
  policy_markers: 'Policy Markers',
};
import { CompareDataModal } from './CompareDataModal';
import { apiFetch } from '@/lib/api-fetch';

interface IATISyncPanelProps {
  activityId: string;
  iatiIdentifier?: string;
  autoSync?: boolean;
  lastSyncTime?: string;
  syncStatus?: 'live' | 'pending' | 'outdated';
  autoSyncFields?: string[];
  onUpdate?: () => void;
  onAutoSyncChange?: (autoSync: boolean, autoSyncFields: string[]) => void;
  onStateChange?: (state: { isEnabled: boolean; syncStatus: 'live' | 'pending' | 'outdated' }) => void;
  canEdit?: boolean;
}

interface ComparisonField {
  field: string;
  label: string;
  yourData: any;
  iatiData: any;
  isDifferent: boolean;
  importEnabled: boolean;
}

export function IATISyncPanel({
  activityId,
  iatiIdentifier: initialIatiId,
  autoSync: initialAutoSync = false,
  lastSyncTime,
  syncStatus = 'pending',
  autoSyncFields = [],
  onUpdate,
  onAutoSyncChange,
  onStateChange,
  canEdit = true
}: IATISyncPanelProps) {
  const [iatiId, setIatiId] = useState(initialIatiId || '');
  const [autoSync, setAutoSync] = useState(initialAutoSync);
  const [isComparing, setIsComparing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [expandedSection, setExpandedSection] = useState(false);

  // Sync Now state
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentLastSyncTime, setCurrentLastSyncTime] = useState(lastSyncTime);

  // Sync History state
  const [showHistory, setShowHistory] = useState(false);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Keep currentLastSyncTime in sync with prop
  useEffect(() => {
    setCurrentLastSyncTime(lastSyncTime);
  }, [lastSyncTime]);

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isEnabled: autoSync,
        syncStatus: syncStatus
      });
    }
  }, [autoSync, syncStatus, onStateChange]);

  // Local state for which sync field groups are enabled
  const [enabledSyncFields, setEnabledSyncFields] = useState<Set<string>>(
    () => new Set(autoSyncFields)
  );
  const [isSavingSyncFields, setIsSavingSyncFields] = useState(false);

  // Keep local state in sync if the prop changes externally (e.g. page reload)
  useEffect(() => {
    setEnabledSyncFields(new Set(autoSyncFields));
  }, [autoSyncFields]);

  // Format sync status display — only show "Synced" when auto-sync is actually on
  const getSyncStatusDisplay = () => {
    if (!autoSync) {
      return {
        icon: <Activity className="h-4 w-4" />,
        text: 'Not Synced',
        variant: 'secondary' as const,
        color: 'text-gray-600'
      };
    }
    switch (syncStatus) {
      case 'live':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: 'Synced',
          variant: 'success' as const,
          color: 'text-green-600'
        };
      case 'outdated':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Outdated',
          variant: 'default' as const,
          color: 'text-yellow-600'
        };
      case 'pending':
      default:
        return {
          icon: <Activity className="h-4 w-4" />,
          text: 'Not Synced',
          variant: 'secondary' as const,
          color: 'text-gray-600'
        };
    }
  };

  const syncStatusDisplay = getSyncStatusDisplay();

  // Handle IATI comparison
  const handleCompare = async () => {
    if (!iatiId && !initialIatiId) {
      toast.error('Please enter an IATI identifier');
      return;
    }

    setIsComparing(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/compare-iati-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iati_identifier: iatiId || initialIatiId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to compare with IATI');
      }

      const result = await response.json();
      setComparisonData(result);
      
      // Initialize selected fields based on differences
      const newSelectedFields: Record<string, boolean> = {};
      if (result.comparison?.differences) {
        Object.keys(result.comparison.differences).forEach(field => {
          newSelectedFields[field] = true; // Auto-select fields with differences
        });
      }
      setSelectedFields(newSelectedFields);
      
      setShowComparisonModal(true);
    } catch (error) {
      console.error('Compare error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to compare with IATI');
    } finally {
      setIsComparing(false);
    }
  };

  // Handle auto-sync toggle
  const handleAutoSyncToggle = async (checked: boolean) => {
    setAutoSync(checked);

    const allFields = Object.keys(SYNC_FIELD_GROUPS);
    const newFields = checked ? allFields : [];

    try {
      const patchBody: any = {
        auto_sync: checked,
        auto_sync_fields: newFields,
      };
      // When disabling auto-sync, reset sync_status so it shows "Not Synced"
      if (!checked) {
        patchBody.sync_status = 'pending';
      }

      const response = await apiFetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody)
      });

      if (!response.ok) {
        throw new Error('Failed to update auto-sync setting');
      }

      // Update local state to reflect all fields enabled (or none)
      setEnabledSyncFields(new Set(newFields));
      // Update local sync status display
      if (!checked) {
        setCurrentLastSyncTime(undefined);
      }
      // Notify parent so state persists across tab switches
      onAutoSyncChange?.(checked, newFields);
      toast.success(checked ? 'Auto-sync enabled for all fields' : 'Auto-sync disabled');
    } catch (error) {
      console.error('Auto-sync toggle error:', error);
      toast.error('Failed to update auto-sync setting');
      setAutoSync(!checked); // Revert on error
    }
  };

  // Handle toggling an individual sync field
  const handleSyncFieldToggle = async (field: string, checked: boolean) => {
    const updated = new Set(enabledSyncFields);
    if (checked) {
      updated.add(field);
    } else {
      updated.delete(field);
    }

    const previousFields = new Set(enabledSyncFields);
    setEnabledSyncFields(updated);
    setIsSavingSyncFields(true);

    try {
      const response = await apiFetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auto_sync_fields: Array.from(updated)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update sync fields');
      }

      const updatedArray = Array.from(updated);
      onAutoSyncChange?.(autoSync, updatedArray);
      toast.success(
        checked
          ? `"${SYNC_FIELD_GROUPS[field]}" will be synced from IATI`
          : `"${SYNC_FIELD_GROUPS[field]}" will keep your local data`
      );
    } catch (error) {
      console.error('Sync field toggle error:', error);
      toast.error('Failed to update sync fields');
      setEnabledSyncFields(previousFields); // Revert on error
    } finally {
      setIsSavingSyncFields(false);
    }
  };

  // Handle manual sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/sync`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      if (result.action === 'updated') {
        const fieldLabels = result.fieldsChanged
          .map((f: string) => SYNC_FIELD_GROUPS[f] || f)
          .join(', ');
        toast.success(`Synced: ${fieldLabels}`);
        onUpdate?.();
      } else if (result.action === 'unchanged') {
        toast.info('No changes found — already up to date');
      } else if (result.action === 'failed') {
        toast.error(result.error || 'Sync failed');
      }

      if (result.lastSyncTime) {
        setCurrentLastSyncTime(result.lastSyncTime);
      }

      // Refresh history if it's open
      if (showHistory) {
        fetchSyncHistory();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch sync history
  const fetchSyncHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/sync-history`);
      if (response.ok) {
        const data = await response.json();
        setSyncHistory(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch sync history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch history when expanded
  useEffect(() => {
    if (showHistory) {
      fetchSyncHistory();
    }
  }, [showHistory]);

  // Sync status banner helpers
  const getSyncBannerConfig = () => {
    if (!autoSync || !currentLastSyncTime) {
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-600',
        icon: <Clock className="h-4 w-4 text-gray-400" />,
        label: autoSync ? 'Never synced with IATI Datastore' : 'Auto-sync is disabled',
        detail: null,
      };
    }

    const syncDate = new Date(currentLastSyncTime);
    const hoursAgo = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);
    const relative = formatDistanceToNow(syncDate, { addSuffix: true });
    const exact = format(syncDate, 'dd MMM yyyy HH:mm');

    if (hoursAgo < 48) {
      return {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-700',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        label: `Last synced ${relative}`,
        detail: exact,
      };
    } else if (hoursAgo < 168) { // 7 days
      return {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-700',
        icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
        label: `Last synced ${relative}`,
        detail: exact,
      };
    } else {
      return {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-600',
        icon: <AlertCircle className="h-4 w-4 text-gray-400" />,
        label: `Last synced ${relative}`,
        detail: exact,
      };
    }
  };

  const syncBanner = getSyncBannerConfig();

  // Format value for display
  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) return 'Not set';
    
    if (field.includes('date') && value) {
      try {
        return format(new Date(value), 'dd MMM yyyy');
      } catch {
        return value.toString();
      }
    }

    if (field === 'sectors' && Array.isArray(value)) {
      return `${value.length} sector${value.length !== 1 ? 's' : ''}`;
    }

    if (field === 'participating_orgs' && Array.isArray(value)) {
      return `${value.length} organization${value.length !== 1 ? 's' : ''}`;
    }

    if (field === 'transactions' && Array.isArray(value)) {
      return `${value.length} transaction${value.length !== 1 ? 's' : ''}`;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value.toString();
  };

  // Prepare comparison fields
  const getComparisonFields = (): ComparisonField[] => {
    if (!comparisonData) return [];

    const fields: ComparisonField[] = [];
    const { your_data, iati_data } = comparisonData;

    // Use field mappings from the mapper utility
    FIELD_MAPPINGS.forEach(mapping => {
      const yourValue = your_data?.[mapping.aimsField];
      const iatiValue = iati_data?.[mapping.iatiField];
      
      // Transform IATI value for comparison if needed
      const transformedIatiValue = mapping.transform 
        ? mapping.transform(iatiValue) 
        : iatiValue;
      
      const isDifferent = JSON.stringify(yourValue) !== JSON.stringify(transformedIatiValue);

      fields.push({
        field: mapping.iatiField,
        label: mapping.description || mapping.aimsField,
        yourData: yourValue,
        iatiData: iatiValue,
        isDifferent,
        importEnabled: selectedFields[mapping.iatiField] || false
      });
    });

    return fields;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>IATI Link</CardTitle>
            </div>
            <CardDescription>
              Synchronize this activity with the IATI Datastore to ensure data consistency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sync Status Banner */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${syncBanner.bg}`}>
              <div className="flex items-center gap-2">
                {syncBanner.icon}
                <span className={`text-sm font-medium ${syncBanner.text}`}>
                  {syncBanner.label}
                </span>
                {syncBanner.detail && (
                  <span className="text-xs text-muted-foreground">({syncBanner.detail})</span>
                )}
              </div>
              <Badge variant={syncStatusDisplay.variant} className="flex items-center gap-1">
                {syncStatusDisplay.icon}
                {syncStatusDisplay.text}
              </Badge>
            </div>

            {/* IATI Identifier Input */}
            <div className="space-y-2">
              <Label htmlFor="iati-identifier">IATI Identifier</Label>
              <div className="flex gap-2">
                <Input
                  id="iati-identifier"
                  placeholder="e.g. MM-GOV-1234"
                  value={iatiId}
                  onChange={(e) => setIatiId(e.target.value)}
                  disabled={!canEdit}
                />
                <Button
                  onClick={handleCompare}
                  disabled={isComparing || !canEdit}
                  className="whitespace-nowrap"
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Compare with IATI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Sync Now Button */}
            {(iatiId || initialIatiId) && (
              <Button
                onClick={handleSyncNow}
                disabled={isSyncing || !canEdit}
                variant="outline"
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing with IATI Datastore...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            )}

            {/* Auto-sync Toggle */}
            <div className="flex items-center justify-between space-x-2 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync" className="text-base cursor-pointer">
                  Enable auto-sync every 24 hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync selected fields with IATI Datastore daily
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSync}
                onCheckedChange={handleAutoSyncToggle}
                disabled={!canEdit}
              />
            </div>

            {/* Auto-sync Configuration */}
            {autoSync && (
              <Collapsible open={expandedSection} onOpenChange={setExpandedSection}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span>Auto-sync configuration</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Checked fields will be overwritten with IATI data during each sync.
                      Uncheck a field to keep your local data and prevent it from being overwritten.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    {Object.entries(SYNC_FIELD_GROUPS).map(([field, label]) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={`auto-${field}`}
                          checked={enabledSyncFields.has(field)}
                          onCheckedChange={(checked) => handleSyncFieldToggle(field, !!checked)}
                          disabled={!canEdit || isSavingSyncFields}
                        />
                        <Label htmlFor={`auto-${field}`} className="text-sm font-normal cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

      {/* Sync History */}
      <Card>
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <CardTitle className="text-base">Sync History</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              ) : syncHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No sync history yet
                </p>
              ) : (
                <div className="space-y-2">
                  {syncHistory.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {log.import_status === 'success' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <Badge variant="outline" className="text-xs font-normal">
                          {log.import_source === 'auto_sync' ? 'Auto sync' : 'Manual sync'}
                        </Badge>
                        {log.error_message && (
                          <span className="text-xs text-red-600 truncate max-w-[200px]" title={log.error_message}>
                            {log.error_message}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {log.import_date
                          ? formatDistanceToNow(new Date(log.import_date), { addSuffix: true })
                          : 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Comparison Modal */}
      <CompareDataModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        comparisonData={comparisonData}
        onImport={async (selectedFieldsArray) => {
          // Convert array to object format expected by the import handler
          const fieldsToImport = selectedFieldsArray.reduce((acc, field) => {
            acc[field] = true;
            return acc;
          }, {} as Record<string, boolean>);

          setIsImporting(true);
          try {
            const response = await apiFetch(`/api/activities/${activityId}/import-iati`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fields: fieldsToImport,
                iati_data: comparisonData.iati_data
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to import IATI data');
            }

            const result = await response.json();
            
            // Enhanced success message with organization info
            let message = `Successfully imported ${result.fields_updated.length} field${result.fields_updated.length !== 1 ? 's' : ''}`;
            
            if (result.summary) {
              const { organizations_created, organizations_linked, transactions_added } = result.summary;
              
              // Add transaction count if any were imported
              if (transactions_added > 0) {
                message += ` (${transactions_added} transaction${transactions_added !== 1 ? 's' : ''})`;
              }
              
              // Add organization info if any were created or linked
              if (organizations_created > 0 || organizations_linked > 0) {
                const orgParts = [];
                if (organizations_created > 0) {
                  orgParts.push(`${organizations_created} new org${organizations_created !== 1 ? 's' : ''} created`);
                }
                if (organizations_linked > 0) {
                  orgParts.push(`${organizations_linked} existing org${organizations_linked !== 1 ? 's' : ''} linked`);
                }
                toast.success(message);
                toast.info(`Organizations: ${orgParts.join(', ')}`, {
                  description: 'Auto-created organizations can be managed in the Organizations section.',
                  duration: 7000
                });
              } else {
                toast.success(message);
              }
            } else {
              toast.success(message);
            }
            
            setShowComparisonModal(false);
            
            // Update the parent component
            if (onUpdate) {
              onUpdate();
            }
          } catch (error) {
            console.error('Import error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to import IATI data');
          } finally {
            setIsImporting(false);
          }
        }}
      />
    </div>
  );
}