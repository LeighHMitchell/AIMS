/**
 * Multi-Activity Preview Component
 * Displays activities from IATI XML with selection and import mode controls
 */

import React, { useState, useMemo } from 'react';
import { ActivityMetadata } from '@/lib/xml-parser';
import { ExistingActivityInfo } from '@/lib/iati-activity-lookup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  Building2,
  Calendar,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface MultiActivityPreviewProps {
  activities: ActivityMetadata[];
  existingActivities: Map<string, ExistingActivityInfo>;
  onActivitySelect: (indices: number[]) => void;
  onImportMode: (mode: 'update_current' | 'create_new' | 'bulk_create') => void;
  currentActivityId: string;
}

type FilterMode = 'all' | 'new' | 'existing';

export function MultiActivityPreview({
  activities,
  existingActivities,
  onActivitySelect,
  onImportMode,
  currentActivityId,
}: MultiActivityPreviewProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [importMode, setImportMode] = useState<'update_current' | 'create_new' | 'bulk_create'>('create_new');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

  // Filter activities based on current filter and search
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply filter mode
    if (filterMode === 'new') {
      filtered = filtered.filter(a => !existingActivities.has(a.iatiIdentifier));
    } else if (filterMode === 'existing') {
      filtered = filtered.filter(a => existingActivities.has(a.iatiIdentifier));
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.iatiIdentifier.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.reportingOrg.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities, filterMode, searchQuery, existingActivities]);

  // Statistics
  const stats = useMemo(() => {
    const newCount = activities.filter(a => !existingActivities.has(a.iatiIdentifier)).length;
    const existingCount = activities.filter(a => existingActivities.has(a.iatiIdentifier)).length;
    
    return { newCount, existingCount, total: activities.length };
  }, [activities, existingActivities]);

  // Handle selection
  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
    onActivitySelect(Array.from(newSelected));
  };

  const selectAll = () => {
    const allIndices = new Set(filteredActivities.map(a => a.index));
    setSelectedIndices(allIndices);
    onActivitySelect(Array.from(allIndices));
  };

  const selectNewOnly = () => {
    const newIndices = new Set(
      filteredActivities
        .filter(a => !existingActivities.has(a.iatiIdentifier))
        .map(a => a.index)
    );
    setSelectedIndices(newIndices);
    onActivitySelect(Array.from(newIndices));
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
    onActivitySelect([]);
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedIndices);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIndices(newExpanded);
  };

  // Handle import mode change
  const handleImportModeChange = (mode: 'update_current' | 'create_new' | 'bulk_create') => {
    setImportMode(mode);
    onImportMode(mode);

    // If switching to update_current, limit to one selection
    if (mode === 'update_current' && selectedIndices.size > 1) {
      const firstIndex = Array.from(selectedIndices)[0];
      setSelectedIndices(new Set([firstIndex]));
      onActivitySelect([firstIndex]);
    }
  };

  // Helper to get activity status text
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      '1': 'Pipeline/Identification',
      '2': 'Implementation',
      '3': 'Completion',
      '4': 'Post-completion',
      '5': 'Cancelled',
      '6': 'Suspended',
    };
    return statusMap[status] || status || 'Unknown';
  };

  // Helper to format budget
  const formatBudget = (budget: number): string => {
    if (budget === 0) return 'No budget';
    if (budget >= 1000000) return `$${(budget / 1000000).toFixed(2)}M`;
    if (budget >= 1000) return `$${(budget / 1000).toFixed(0)}K`;
    return `$${budget.toFixed(0)}`;
  };

  return (
    <div className="space-y-4">
      {/* Statistics Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex gap-6">
          <div className="text-sm">
            <span className="font-medium">Total:</span> {stats.total}
          </div>
          <div className="text-sm text-green-600">
            <span className="font-medium">New:</span> {stats.newCount}
          </div>
          <div className="text-sm text-blue-600">
            <span className="font-medium">Existing:</span> {stats.existingCount}
          </div>
          <div className="text-sm text-purple-600">
            <span className="font-medium">Selected:</span> {selectedIndices.size}
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={filterMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('all')}
          >
            All
          </Button>
          <Button
            variant={filterMode === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('new')}
          >
            New ({stats.newCount})
          </Button>
          <Button
            variant={filterMode === 'existing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('existing')}
          >
            Existing ({stats.existingCount})
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={selectAll}>
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={selectNewOnly}>
          <Plus className="h-3 w-3 mr-1" />
          Select New Only
        </Button>
        <Button variant="outline" size="sm" onClick={deselectAll}>
          Deselect All
        </Button>
      </div>

      {/* Import Mode Selection */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <Label className="text-sm font-medium mb-2 block">Import Mode</Label>
        <RadioGroup value={importMode} onValueChange={handleImportModeChange as any}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="update_current" id="update_current" disabled={selectedIndices.size !== 1} />
            <Label htmlFor="update_current" className={selectedIndices.size !== 1 ? 'text-gray-400' : ''}>
              <RefreshCw className="inline h-3 w-3 mr-1" />
              Update Current Activity (select exactly 1)
            </Label>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="create_new" id="create_new" disabled={selectedIndices.size !== 1} />
            <Label htmlFor="create_new" className={selectedIndices.size !== 1 ? 'text-gray-400' : ''}>
              <Plus className="inline h-3 w-3 mr-1" />
              Create New Activity (select exactly 1)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bulk_create" id="bulk_create" disabled={selectedIndices.size < 1} />
            <Label htmlFor="bulk_create" className={selectedIndices.size < 1 ? 'text-gray-400' : ''}>
              <Plus className="inline h-3 w-3 mr-1" />
              Bulk Create Activities (selected: {selectedIndices.size})
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Activity List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-4 space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No activities match your filters
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const isExisting = existingActivities.has(activity.iatiIdentifier);
              const existingInfo = existingActivities.get(activity.iatiIdentifier);
              const isSelected = selectedIndices.has(activity.index);
              const isExpanded = expandedIndices.has(activity.index);

              return (
                <Card 
                  key={activity.index}
                  className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(activity.index)}
                        className="mt-1"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">
                              {activity.title}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                              {activity.iatiIdentifier}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {isExisting ? (
                              <Badge variant="secondary" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Already Exists
                              </Badge>
                            ) : (
                              <Badge variant="default" className="text-xs">
                                <Plus className="h-3 w-3 mr-1" />
                                New
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{activity.reportingOrg.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {activity.plannedDates.start || 'No start'} → {activity.plannedDates.end || 'No end'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{formatBudget(activity.budget)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            <span>{activity.transactionCount} transactions</span>
                          </div>
                        </div>

                        {activity.status && (
                          <div className="text-xs text-gray-500">
                            Status: {getStatusText(activity.status)}
                          </div>
                        )}

                        {/* Collapsible Details */}
                        {activity.description && (
                          <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(activity.index)}>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 text-xs mt-2">
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Hide Details
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    View Details
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                                <p className="font-medium mb-1">Description:</p>
                                <p className="whitespace-pre-wrap">{activity.description}</p>
                                {isExisting && existingInfo && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="font-medium mb-1">Existing Activity Info:</p>
                                    <p>Title: {existingInfo.title}</p>
                                    <p>Last Updated: {new Date(existingInfo.lastUpdated).toLocaleDateString()}</p>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}















