import React, { useState } from 'react';
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
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  mapIatiToAims, 
  mapAimsToIati, 
  getAllFieldMappings,
  compareData,
  FIELD_MAPPINGS
} from '@/lib/iati-field-mapper';
import { CompareDataModal } from './CompareDataModal';

interface IATISyncPanelProps {
  activityId: string;
  iatiIdentifier?: string;
  autoSync?: boolean;
  lastSyncTime?: string;
  syncStatus?: 'live' | 'pending' | 'outdated';
  autoSyncFields?: string[];
  onUpdate?: () => void;
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

  // Get field mappings from the mapper utility
  const fieldMappings = getAllFieldMappings();
  const fieldLabels = fieldMappings.reduce((acc, mapping) => {
    acc[mapping.iatiField] = mapping.description || mapping.aimsField;
    return acc;
  }, {} as Record<string, string>);

  // Format sync status display
  const getSyncStatusDisplay = () => {
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
      const response = await fetch(`/api/activities/${activityId}/compare-iati-simple`, {
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
    
    // TODO: Update auto-sync setting in backend
    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auto_sync: checked,
          auto_sync_fields: checked ? Object.keys(fieldLabels) : []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update auto-sync setting');
      }

      toast.success(checked ? 'Auto-sync enabled' : 'Auto-sync disabled');
    } catch (error) {
      console.error('Auto-sync toggle error:', error);
      toast.error('Failed to update auto-sync setting');
      setAutoSync(!checked); // Revert on error
    }
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>IATI Sync</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              {lastSyncTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Last sync: {format(new Date(lastSyncTime), 'dd MMM yyyy HH:mm')}</span>
                </div>
              )}
              <Badge variant={syncStatusDisplay.variant} className="flex items-center gap-1">
                {syncStatusDisplay.icon}
                {syncStatusDisplay.text}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Synchronize this activity with the IATI Datastore to ensure data consistency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    Select which fields should be automatically synced from IATI. 
                    Changes made locally to these fields will be overwritten during sync.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={`auto-${field}`}
                        checked={autoSyncFields.includes(field)}
                        disabled={!canEdit}
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
            const response = await fetch(`/api/activities/${activityId}/import-iati`, {
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
            
            toast.success(`Successfully imported ${result.fields_updated.length} fields`);
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

