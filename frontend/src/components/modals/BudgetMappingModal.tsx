"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, AlertCircle, ChevronsUpDown, Check, Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BudgetIdentifierVocabularySelect } from "@/components/forms/BudgetIdentifierVocabularySelect";
import { MultiLingualNarrativeInput } from "@/components/forms/MultiLingualNarrativeInput";
import { CountryBudgetItems, BudgetItem, Narrative } from "@/types/country-budget-items";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { BudgetClassification, ClassificationType, CLASSIFICATION_TYPE_LABELS } from "@/types/aid-on-budget";

interface BudgetMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CountryBudgetItems) => Promise<void>;
  existingData?: CountryBudgetItems;
  usedVocabularies?: string[];
  initialEditIndex?: number; // Index of item to edit immediately when modal opens
}

export function BudgetMappingModal({
  isOpen,
  onClose,
  onSave,
  existingData,
  usedVocabularies = [],
  initialEditIndex
}: BudgetMappingModalProps) {
  const [selectedVocabulary, setSelectedVocabulary] = useState<string>(existingData?.vocabulary || "2");
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(existingData?.budget_items || []);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // State for Chart of Accounts
  const [budgetClassifications, setBudgetClassifications] = useState<BudgetClassification[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);
  const [selectedClassificationType, setSelectedClassificationType] = useState<ClassificationType | "">("");
  const [classificationSearchQuery, setClassificationSearchQuery] = useState("");
  const [classificationDropdownOpen, setClassificationDropdownOpen] = useState(false);

  // Fetch budget classifications
  useEffect(() => {
    if (isOpen) {
      setLoadingClassifications(true);
      fetch('/api/admin/budget-classifications?flat=true')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setBudgetClassifications(data.data);
          }
        })
        .catch(err => {
          console.error('Error fetching budget classifications:', err);
        })
        .finally(() => {
          setLoadingClassifications(false);
        });
    }
  }, [isOpen]);

  // Filter classifications by type and search query
  const filteredClassifications = React.useMemo(() => {
    let filtered = budgetClassifications;

    if (selectedClassificationType) {
      filtered = filtered.filter(c => c.classificationType === selectedClassificationType);
    }

    if (classificationSearchQuery) {
      const query = classificationSearchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        (c.description?.toLowerCase().includes(query) ?? false) ||
        (c.nameLocal?.toLowerCase().includes(query) ?? false)
      );
    }

    return filtered;
  }, [budgetClassifications, selectedClassificationType, classificationSearchQuery]);

  // Get classification types that have items
  const availableClassificationTypes = React.useMemo(() => {
    const types = new Set(budgetClassifications.map(c => c.classificationType));
    return Array.from(types) as ClassificationType[];
  }, [budgetClassifications]);

  // Find selected classification for display
  const selectedClassification = editingItem?.code
    ? budgetClassifications.find(c => c.code === editingItem.code)
    : null;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedVocabulary(existingData?.vocabulary || "2");
      const items = existingData?.budget_items || [];
      setBudgetItems(items);

      // If creating new (no existingData), automatically show the Add Item form
      if (!existingData) {
        setEditingItem({
          code: "",
          percentage: 0,
          description: {}
        });
        setEditingItemIndex(null);
      } else if (initialEditIndex !== undefined && items[initialEditIndex]) {
        // If initialEditIndex is provided, open that item for editing immediately
        setEditingItem({ ...items[initialEditIndex] });
        setEditingItemIndex(initialEditIndex);
      } else {
        setEditingItem(null);
        setEditingItemIndex(null);
      }
    }
  }, [isOpen, existingData, initialEditIndex]);

  const validateBudgetItems = () => {
    if (budgetItems.length === 0) return { isValid: false, error: "At least one budget item is required" };
    
    // Check that all budget items have valid percentages (0-100)
    for (const item of budgetItems) {
      if (item.percentage === null || item.percentage === undefined) {
        return { isValid: false, error: "All budget items must have a percentage value" };
      }
      if (item.percentage < 0 || item.percentage > 100) {
        return { isValid: false, error: `Percentage must be between 0 and 100 (found: ${item.percentage}%)` };
      }
    }
    
    return { isValid: true, error: null };
  };

  const addBudgetItem = () => {
    setEditingItem({
      code: "",
      percentage: 0,
      description: {}
    });
    setEditingItemIndex(null);
    setSelectedClassificationType("");
    setClassificationSearchQuery("");
  };

  const editBudgetItem = (item: BudgetItem, index: number) => {
    setEditingItem({ ...item });
    setEditingItemIndex(index);
    // Find the classification type for this item's code
    const classification = budgetClassifications.find(c => c.code === item.code);
    if (classification) {
      setSelectedClassificationType(classification.classificationType);
    } else {
      setSelectedClassificationType("");
    }
    setClassificationSearchQuery("");
  };

  const saveBudgetItem = () => {
    if (!editingItem) return;

    const newBudgetItems = [...budgetItems];
    if (editingItemIndex !== null) {
      newBudgetItems[editingItemIndex] = editingItem;
    } else {
      newBudgetItems.push(editingItem);
    }

    setBudgetItems(newBudgetItems);
    setEditingItem(null);
    setEditingItemIndex(null);
  };

  const deleteBudgetItem = (index: number) => {
    if (confirm('Are you sure you want to delete this budget item?')) {
      setBudgetItems(budgetItems.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    const validation = validateBudgetItems();
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        vocabulary: selectedVocabulary,
        budget_items: budgetItems
      });
      onClose();
    } catch (error) {
      console.error('Error saving budget mapping:', error);
      alert('Failed to save budget mapping');
    } finally {
      setSaving(false);
    }
  };

  const getPrimaryDescription = (description?: Narrative): string => {
    if (!description) return '-';
    return description.en || description[Object.keys(description)[0]] || '-';
  };

  const validation = validateBudgetItems();
  const percentageSum = budgetItems.reduce((sum, item) => sum + (item.percentage || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingData ? 'Edit Budget Mapping' : 'Add Budget Mapping'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vocabulary Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Budget Identifier Vocabulary *
            </label>
            <BudgetIdentifierVocabularySelect
              value={selectedVocabulary}
              onValueChange={setSelectedVocabulary}
              disabled={!!existingData}
              dropdownId="modal-vocabulary"
            />
          </div>

          {/* Budget Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Budget Items</h4>
              {!editingItem && (
                <Button type="button" variant="outline" size="sm" onClick={addBudgetItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>

            {/* Validation Messages */}
            {!validation.isValid && budgetItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">{validation.error}</div>
                </div>
              </div>
            )}

            {/* Budget Items Table */}
            {budgetItems.length > 0 && !editingItem && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium">Code</TableHead>
                      <TableHead className="font-medium">Percentage</TableHead>
                      <TableHead className="font-medium">Description</TableHead>
                      <TableHead className="font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {item.code}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{item.percentage}%</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {getPrimaryDescription(item.description)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => editBudgetItem(item, index)}
                            >
                              <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteBudgetItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell>
                        <span className={!validation.isValid ? 'text-red-600' : ''}>
                          {percentageSum.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Edit/Add Budget Item Form */}
            {editingItem && (
              <div className="bg-white border border-gray-200 rounded-md p-4 space-y-4">
                <h5 className="text-sm font-medium text-gray-700">
                  {editingItemIndex !== null ? 'Edit Budget Item' : 'Add Budget Item'}
                </h5>

                {/* Classification Type Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Classification Type *
                  </label>
                  <Select
                    value={selectedClassificationType}
                    onValueChange={(value) => {
                      setSelectedClassificationType(value as ClassificationType);
                      // Clear selected code when type changes
                      setEditingItem({ ...editingItem, code: "" });
                      setClassificationSearchQuery("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select classification type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClassificationTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CLASSIFICATION_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Classification Selector */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Budget Classification *
                  </label>
                  {loadingClassifications ? (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading classifications...
                    </div>
                  ) : (
                    <Popover open={classificationDropdownOpen} onOpenChange={setClassificationDropdownOpen}>
                      <PopoverTrigger
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                          !selectedClassification && "text-muted-foreground"
                        )}
                        disabled={!selectedClassificationType}
                      >
                        <span className="truncate">
                          {selectedClassification ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedClassification.code}</span>
                              <span className="font-medium text-foreground">{selectedClassification.name}</span>
                            </span>
                          ) : selectedClassificationType ? (
                            "Select budget classification..."
                          ) : (
                            "Select classification type first"
                          )}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] min-w-[500px] max-h-[400px] p-0 shadow-lg border overflow-hidden"
                        align="start"
                        sideOffset={4}
                      >
                        <Command>
                          <div className="flex items-center border-b px-3 py-2">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                              placeholder="Search classifications..."
                              value={classificationSearchQuery}
                              onChange={(e) => setClassificationSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setClassificationDropdownOpen(false);
                                  setClassificationSearchQuery("");
                                }
                              }}
                              className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                              autoFocus
                            />
                            {classificationSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setClassificationSearchQuery("")}
                                className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                              >
                                <span className="text-xs">×</span>
                              </button>
                            )}
                          </div>
                          <CommandList className="max-h-[320px] overflow-y-auto">
                            <CommandGroup>
                              {filteredClassifications.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  onSelect={() => {
                                    setEditingItem({ ...editingItem, code: c.code });
                                    setClassificationDropdownOpen(false);
                                    setClassificationSearchQuery("");
                                  }}
                                  className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      editingItem.code === c.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.code}</span>
                                      <span className="font-medium text-foreground">{c.name}</span>
                                    </div>
                                    {c.description && (
                                      <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                                        {c.description}
                                      </div>
                                    )}
                                    {c.nameLocal && (
                                      <div className="text-xs text-muted-foreground mt-1 italic">
                                        {c.nameLocal}
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                              {filteredClassifications.length === 0 && (
                                <div className="py-8 text-center">
                                  <div className="text-sm text-muted-foreground">
                                    {budgetClassifications.length === 0
                                      ? "No budget classifications defined yet."
                                      : "No classifications found."}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {budgetClassifications.length === 0
                                      ? "Ask an administrator to set up the Chart of Accounts."
                                      : "Try adjusting your search terms"}
                                  </div>
                                </div>
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Percentage */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Percentage *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editingItem.percentage === null ? '' : editingItem.percentage}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? null : parseFloat(value);
                      setEditingItem({ ...editingItem, percentage: numValue });
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>

                <MultiLingualNarrativeInput
                  value={editingItem.description || {}}
                  onChange={(description) => setEditingItem({ ...editingItem, description })}
                  label="Description"
                  placeholder="Enter a description for this budget item..."
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveBudgetItem}
                    disabled={!selectedClassificationType || !editingItem.code || editingItem.percentage === null || editingItem.percentage === undefined}
                  >
                    {editingItemIndex !== null ? 'Update' : 'Add'} Item
                  </Button>
                </div>
              </div>
            )}

            {budgetItems.length === 0 && !editingItem && (
              <div className="text-center py-8 text-muted-foreground border rounded-md">
                No budget items added yet. Click "Add Item" to get started.
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !validation.isValid || budgetItems.length === 0 || editingItem !== null}
          >
            {saving ? 'Saving...' : 'Save Budget Mapping'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

