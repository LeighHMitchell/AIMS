'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ScrollText, 
  Plus, 
  Trash2, 
  AlertCircle,
  Info,
  Save,
  ChevronsUpDown,
  Check,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConditions } from '@/hooks/use-conditions';
import { 
  ConditionsTabProps, 
  ConditionType, 
  CONDITION_TYPE_LABELS,
  CONDITION_TYPE_DESCRIPTIONS 
} from '@/types/conditions';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

// Condition type options for the styled select
const CONDITION_TYPE_OPTIONS = [
  {
    code: '1',
    name: 'Policy',
    description: 'The condition attached requires a particular policy to be implemented by the recipient'
  },
  {
    code: '2', 
    name: 'Performance',
    description: 'The condition attached requires certain outputs or outcomes to be achieved by the recipient'
  },
  {
    code: '3',
    name: 'Fiduciary', 
    description: 'The condition attached requires use of certain public financial management or public accountability measures by the recipient'
  }
] as const;

// Styled Condition Type Select Component (like Collaboration Type)
interface ConditionTypeSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function ConditionTypeSelect({
  value,
  onValueChange,
  placeholder = "Select condition type...",
  disabled = false,
  className,
}: ConditionTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedOption = CONDITION_TYPE_OPTIONS.find(option => option.code === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return CONDITION_TYPE_OPTIONS;
    
    const query = searchQuery.toLowerCase();
    return CONDITION_TYPE_OPTIONS.filter(option => 
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      query.replace('#', '') === option.code
    );
  }, [searchQuery]);

  return (
    <div className={cn("pb-6", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
              !selectedOption && "text-muted-foreground"
            )}
            disabled={disabled}
          >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedOption.code}</span>
                <span className="font-medium">{selectedOption.name}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedOption && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.("");
                }}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Clear selection"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onValueChange?.("");
                  }
                }}
              >
                <span className="text-xs">×</span>
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search condition types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {searchQuery && (
                <span
                  onClick={() => setSearchQuery("")}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Clear search"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSearchQuery("");
                    }
                  }}
                >
                  <span className="text-xs">×</span>
                </span>
              )}
            </div>
            <CommandList>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.code}
                    onSelect={() => {
                      onValueChange?.(option.code);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{option.code}</span>
                        <span className="font-medium text-foreground">{option.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {option.description}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {filteredOptions.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No condition types found.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search terms
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ConditionsTab({ 
  activityId, 
  readOnly = false,
  defaultLanguage = 'en',
  className,
  onConditionsChange
}: ConditionsTabProps) {
  const { 
    conditions, 
    loading, 
    error, 
    createCondition, 
    updateCondition, 
    deleteCondition,
    updateAttachedStatus,
    fetchConditions
  } = useConditions(activityId);

  // Check if activity is saved
  const isActivitySaved = activityId && activityId !== 'new';

  // Local state for new condition form
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [newCondition, setNewCondition] = useState<{
    type: ConditionType;
    narrative: string;
  }>({
    type: '1',
    narrative: ''
  });

  // Local state for editing conditions
  const [editingCondition, setEditingCondition] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{
    type: ConditionType;
    narrative: string;
  }>({
    type: '1',
    narrative: ''
  });

  // Loading states for async operations
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);


  // Determine if conditions are attached (all conditions should have same value)
  const areConditionsAttached = conditions.length > 0 ? conditions[0].attached : true;

  // Handle creating a new condition
  const handleCreateCondition = async () => {
    if (!newCondition.narrative.trim()) {
      return;
    }

    setIsCreating(true);
    const success = await createCondition({
      activity_id: activityId,
      type: newCondition.type,
      narrative: { [defaultLanguage]: newCondition.narrative },
      attached: areConditionsAttached
    });
    setIsCreating(false);

    if (success) {
      setNewCondition({ type: '1', narrative: '' });
      setShowAddCondition(false);
      onConditionsChange?.(conditions);
    }
  };

  // Handle deleting a condition
  const handleDeleteCondition = async (conditionId: string) => {
    if (window.confirm('Are you sure you want to delete this condition?')) {
      setIsDeleting(conditionId);
      const success = await deleteCondition(conditionId);
      setIsDeleting(null);
      if (success) {
        onConditionsChange?.(conditions);
      }
    }
  };

  // Handle updating a condition
  const handleUpdateCondition = async (conditionId: string) => {
    if (!editingValues.narrative.trim()) {
      return;
    }

    setIsUpdating(conditionId);
    const success = await updateCondition(conditionId, {
      type: editingValues.type,
      narrative: { [defaultLanguage]: editingValues.narrative }
    });
    setIsUpdating(null);

    if (success) {
      setEditingCondition(null);
      onConditionsChange?.(conditions);
    }
  };

  // Handle toggling attached status
  const handleToggleAttached = async (attached: boolean) => {
    await updateAttachedStatus(attached);
    onConditionsChange?.(conditions);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Conditions</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Conditions</h3>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load conditions: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show message if activity not saved yet
  if (!isActivitySaved) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please save the activity first before adding conditions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>

      {/* Attached Status Toggle */}
      {conditions.length > 0 && (
        <Card className="border-2 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="conditions-attached" className="text-base font-medium text-gray-900">
                  Are conditions attached to this activity?
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Toggle whether the conditions listed below apply to this activity
                </p>
              </div>
              {!readOnly && (
                <Switch
                  id="conditions-attached"
                  checked={areConditionsAttached}
                  onCheckedChange={handleToggleAttached}
                  className="ml-4"
                />
              )}
              {readOnly && (
                <span className="ml-4 text-sm font-medium text-gray-700">
                  {areConditionsAttached ? 'Yes' : 'No'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Add Condition Button */}
      {!readOnly && !showAddCondition && (
        <Button 
          onClick={() => setShowAddCondition(true)} 
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Condition
        </Button>
      )}

      {/* Add Condition Form */}
      {showAddCondition && !readOnly && (
        <Card className="border-2 border-gray-400 bg-gray-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-900">Add New Condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="condition-type" className="text-base font-medium text-gray-900 flex items-center gap-2">
                Condition Type *
                <HelpTextTooltip>
                  Select the type of condition based on IATI standard
                </HelpTextTooltip>
              </Label>
              <ConditionTypeSelect
                value={newCondition.type}
                onValueChange={(value) => setNewCondition(prev => ({ ...prev, type: value as ConditionType }))}
                placeholder="Select condition type"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition-narrative" className="text-base font-medium text-gray-900">
                Description *
              </Label>
              <Textarea
                id="condition-narrative"
                value={newCondition.narrative}
                onChange={(e) => setNewCondition(prev => ({ ...prev, narrative: e.target.value }))}
                placeholder="Describe the condition requirements..."
                rows={4}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button 
                onClick={handleCreateCondition}
                disabled={!newCondition.narrative.trim() || isCreating}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400 px-6"
              >
                <Save className="h-4 w-4 mr-2" />
                {isCreating ? 'Saving...' : 'Save Condition'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowAddCondition(false);
                  setNewCondition({ type: '1', narrative: '' });
                }}
                disabled={isCreating}
                className="text-gray-600"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conditions List */}
      {conditions.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <ScrollText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No conditions yet</h4>
          <p className="text-gray-600 mb-4">
            Add conditions that must be met for this activity
          </p>
          {!readOnly && (
            <Button 
              onClick={() => setShowAddCondition(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Condition
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {conditions.map((condition, index) => (
            <Card key={condition.id} className="border-2 border-gray-200">
              <CardContent className="pt-6">
                {editingCondition === condition.id && !readOnly ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-medium text-gray-900">
                        Condition Type
                      </Label>
                      <ConditionTypeSelect
                        value={editingValues.type}
                        onValueChange={(value) => setEditingValues(prev => ({ ...prev, type: value as ConditionType }))}
                        placeholder="Select condition type"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-medium text-gray-900">
                        Description
                      </Label>
                      <Textarea
                        value={editingValues.narrative}
                        onChange={(e) => setEditingValues(prev => ({ ...prev, narrative: e.target.value }))}
                        rows={4}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleUpdateCondition(condition.id)}
                        disabled={!editingValues.narrative.trim() || isUpdating === condition.id}
                        size="sm"
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
                      >
                        {isUpdating === condition.id ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCondition(null)}
                        disabled={isUpdating === condition.id}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-lg font-bold text-gray-900">{index + 1}.</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-gray-200 text-gray-800 border border-gray-400">
                          {CONDITION_TYPE_LABELS[condition.type]}
                        </span>
                      </div>
                      <p className="text-gray-900 ml-7 whitespace-pre-wrap">
                        {condition.narrative[defaultLanguage] || Object.values(condition.narrative)[0]}
                      </p>
                    </div>
                    
                    {!readOnly && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCondition(condition.id);
                            setEditingValues({
                              type: condition.type,
                              narrative: condition.narrative[defaultLanguage] || Object.values(condition.narrative)[0] || ''
                            });
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCondition(condition.id)}
                          disabled={isDeleting === condition.id}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

