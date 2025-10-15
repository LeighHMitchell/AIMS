"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BudgetIdentifierVocabularySelect } from "@/components/forms/BudgetIdentifierVocabularySelect";
import { BudgetIdentifierSelect } from "@/components/forms/BudgetIdentifierSelect";
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

interface BudgetMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CountryBudgetItems) => Promise<void>;
  existingData?: CountryBudgetItems;
  usedVocabularies?: string[];
}

export function BudgetMappingModal({
  isOpen,
  onClose,
  onSave,
  existingData,
  usedVocabularies = []
}: BudgetMappingModalProps) {
  const [selectedVocabulary, setSelectedVocabulary] = useState<string>(existingData?.vocabulary || "2");
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(existingData?.budget_items || []);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedVocabulary(existingData?.vocabulary || "2");
      setBudgetItems(existingData?.budget_items || []);
      
      // If creating new (no existingData), automatically show the Add Item form
      if (!existingData) {
        setEditingItem({
          code: "",
          percentage: 0,
          description: {}
        });
        setEditingItemIndex(null);
      } else {
        setEditingItem(null);
        setEditingItemIndex(null);
      }
    }
  }, [isOpen, existingData]);

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
  };

  const editBudgetItem = (item: BudgetItem, index: number) => {
    setEditingItem({ ...item });
    setEditingItemIndex(index);
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
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteBudgetItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Budget Code *
                    </label>
                    <BudgetIdentifierSelect
                      value={editingItem.code}
                      onValueChange={(code) => setEditingItem({ ...editingItem, code })}
                      vocabulary={selectedVocabulary}
                      dropdownId="modal-budget-code"
                    />
                  </div>

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
                    disabled={!editingItem.code || editingItem.percentage === null || editingItem.percentage === undefined}
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

