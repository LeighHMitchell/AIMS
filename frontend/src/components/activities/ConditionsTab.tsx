'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RequiredDot } from '@/components/ui/required-dot';
import { Label } from '@/components/ui/label';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
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
  Search,
  Pencil
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useConditions } from '@/hooks/use-conditions';
import { toast } from 'sonner';
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
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
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
                <span className="text-helper">×</span>
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
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-body outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
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
                  <span className="text-helper">×</span>
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
                    className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{option.code}</span>
                        <span className="font-medium text-foreground">{option.name}</span>
                      </div>
                      <div className="text-body text-muted-foreground mt-1.5 leading-relaxed">
                        {option.description}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {filteredOptions.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-body text-muted-foreground">
                    No condition types found.
                  </div>
                  <div className="text-helper text-muted-foreground mt-1">
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
  const { confirm, ConfirmDialog } = useConfirmDialog();

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
    if (await confirm({ title: 'Delete this condition?', description: "The condition will be removed. You'll have a moment to undo.", confirmLabel: 'Delete', cancelLabel: 'Keep' })) {
      const snapshot = conditions.find(c => c.id === conditionId);
      setIsDeleting(conditionId);
      const success = await deleteCondition(conditionId);
      setIsDeleting(null);
      if (success) {
        onConditionsChange?.(conditions);
        toast('Condition removed', snapshot ? {
          action: {
            label: 'Undo',
            onClick: async () => {
              try {
                await createCondition({
                  activity_id: activityId,
                  type: (snapshot as any).type,
                  narrative: (snapshot as any).narrative,
                  attached: (snapshot as any).attached,
                } as any);
                toast.success('Condition restored');
              } catch {
                toast.error("Couldn't restore the condition. Please add it again manually.");
              }
            },
          },
        } : undefined);
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
          <h3 className="text-lg font-semibold text-foreground">Conditions</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
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
        <Card className="border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="conditions-attached" className="text-lg font-medium text-foreground">
                  Are conditions attached to this activity?
                </Label>
                <p className="text-body text-muted-foreground mt-1">
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
                <span className="ml-4 text-body font-medium text-foreground">
                  {areConditionsAttached ? 'Yes' : 'No'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Add Condition Modal */}
      <Dialog open={showAddCondition && !readOnly} onOpenChange={(open) => {
        if (!open) {
          setShowAddCondition(false);
          setNewCondition({ type: '1', narrative: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Condition</DialogTitle>
            <DialogDescription>Define a new condition attached to this activity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="condition-type" className="text-body font-medium flex items-center gap-2">
                Condition Type <RequiredDot />
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
              <Label htmlFor="condition-narrative" className="text-body font-medium flex items-center gap-2">
                Description <RequiredDot />
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCondition(false);
                setNewCondition({ type: '1', narrative: '' });
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCondition}
              disabled={!newCondition.narrative.trim() || isCreating}
            >
              <Save className="h-4 w-4 mr-2" />
              {isCreating ? 'Saving...' : 'Save Condition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conditions List */}
      {conditions.length === 0 ? (
        <Card className="border border-border bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold text-foreground">Conditions</CardTitle>
              {!readOnly && (
                <Button
                  size="sm"
                  onClick={() => setShowAddCondition(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Condition
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <img
              src="/images/empty-canal-lock.webp"
              alt="No conditions"
              className="h-32 mx-auto mb-4 opacity-80"
            />
            <h3 className="text-lg font-medium mb-2">No conditions</h3>
            <p className="text-muted-foreground">
              Use the button above to add your first condition.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold text-foreground">Conditions</CardTitle>
              {!readOnly && (
                <Button
                  size="sm"
                  onClick={() => setShowAddCondition(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Condition
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 w-48">Type</TableHead>
                    <TableHead className="py-3 px-4">Description</TableHead>
                    {!readOnly && <TableHead className="py-3 px-4 text-right w-28" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conditions.map((condition, index) => (
                    editingCondition === condition.id && !readOnly ? (
                      <TableRow key={condition.id} className="bg-muted/30">
                        <TableCell colSpan={3} className="py-4 px-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-body font-medium text-foreground">
                                  Condition Type
                                </Label>
                                <ConditionTypeSelect
                                  value={editingValues.type}
                                  onValueChange={(value) => setEditingValues(prev => ({ ...prev, type: value as ConditionType }))}
                                  placeholder="Select condition type"
                                />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-body font-medium text-foreground">
                                  Description
                                </Label>
                                <Textarea
                                  value={editingValues.narrative}
                                  onChange={(e) => setEditingValues(prev => ({ ...prev, narrative: e.target.value }))}
                                  rows={3}
                                  className="w-full"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCondition(null)}
                                disabled={isUpdating === condition.id}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleUpdateCondition(condition.id)}
                                disabled={!editingValues.narrative.trim() || isUpdating === condition.id}
                                size="sm"
                              >
                                {isUpdating === condition.id ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow
                        key={condition.id}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="py-3 px-4 font-medium">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mr-2">{index + 1}</span>
                          {CONDITION_TYPE_LABELS[condition.type]}
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-pre-wrap">
                          {condition.narrative[defaultLanguage] || Object.values(condition.narrative)[0]}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
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
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCondition(condition.id)}
                                disabled={isDeleting === condition.id}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog />
    </div>
  );
}

