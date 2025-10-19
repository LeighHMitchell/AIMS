"use client";

import React from "react";
import { Plus, Edit2, Trash2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountryBudgetItems, Narrative } from "@/types/country-budget-items";
import { BUDGET_IDENTIFIER_VOCABULARIES } from "@/data/budget-identifier-vocabulary";
import { BudgetMappingModal } from "@/components/modals/BudgetMappingModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface BudgetMappingTabProps {
  activityId: string;
  onDataChange?: (count: number) => void;
}

export default function BudgetMappingTab({ activityId, onDataChange }: BudgetMappingTabProps) {
  const [countryBudgetItems, setCountryBudgetItems] = React.useState<CountryBudgetItems[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBudgetMapping, setEditingBudgetMapping] = React.useState<CountryBudgetItems | undefined>(undefined);

  // Load existing data
  React.useEffect(() => {
    loadCountryBudgetItems();
  }, [activityId]);

  const loadCountryBudgetItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activities/${activityId}/country-budget-items`);
      if (response.ok) {
        const data = await response.json();
        const items = data.country_budget_items || [];
        setCountryBudgetItems(items);
        onDataChange?.(items.length);
      }
    } catch (err) {
      console.error('Error loading budget mappings:', err);
      setError('Failed to load budget mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingBudgetMapping(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (cbi: CountryBudgetItems) => {
    setEditingBudgetMapping(cbi);
    setIsModalOpen(true);
  };

  const handleSave = async (data: CountryBudgetItems) => {
    try {
      setSaving(true);
      setError(null);

      const payload: CountryBudgetItems = {
        vocabulary: data.vocabulary,
        budget_items: data.budget_items,
        activity_id: activityId
      };

      const response = await fetch(`/api/activities/${activityId}/country-budget-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save budget mapping');
      }

      await loadCountryBudgetItems();
      setIsModalOpen(false);
      setEditingBudgetMapping(undefined);
    } catch (err: any) {
      console.error('Error saving budget mapping:', err);
      setError(err.message || 'Failed to save budget mapping');
      throw err; // Re-throw so modal can handle it
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vocabularyCode: string) => {
    if (!confirm('Are you sure you want to delete all budget items for this vocabulary?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/activities/${activityId}/country-budget-items?vocabulary=${vocabularyCode}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete budget mapping');
      }

      await loadCountryBudgetItems();
    } catch (err) {
      console.error('Error deleting budget mapping:', err);
      setError('Failed to delete budget mapping');
    } finally {
      setSaving(false);
    }
  };

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const getPrimaryDescription = (description?: Narrative): string => {
    if (!description) return '-';
    return description.en || description[Object.keys(description)[0]] || '-';
  };

  const getVocabularyName = (code: string): string => {
    return BUDGET_IDENTIFIER_VOCABULARIES.find(v => v.code === code)?.name || code;
  };

  const usedVocabularies = countryBudgetItems.map(cbi => cbi.vocabulary);
  const availableVocabularies = BUDGET_IDENTIFIER_VOCABULARIES.filter(
    v => !v.withdrawn && !usedVocabularies.includes(v.code)
  );

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-end">
            <Skeleton className="h-10 w-48" />
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Skeleton for first budget mapping */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
                <div className="flex-1">
                  <Skeleton className="h-5 w-64 mb-2" />
                  <Skeleton className="h-4 w-16 mt-1" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-10" />
                </div>
              </div>
              <div className="rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="font-medium">Code</TableHead>
                      <TableHead className="font-medium">Percentage</TableHead>
                      <TableHead className="font-medium">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell></TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-full max-w-md" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Skeleton for second budget mapping */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
                <div className="flex-1">
                  <Skeleton className="h-5 w-56 mb-2" />
                  <Skeleton className="h-4 w-16 mt-1" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-10" />
                </div>
              </div>
              <div className="rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="font-medium">Code</TableHead>
                      <TableHead className="font-medium">Percentage</TableHead>
                      <TableHead className="font-medium">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2].map((i) => (
                      <TableRow key={i}>
                        <TableCell></TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-full max-w-md" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
        </div>
      </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-end">
            {availableVocabularies.length > 0 && (
              <Button onClick={handleAddNew} disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                Add Budget Mapping
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {countryBudgetItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="mb-4">No budget mappings added yet.</p>
              {availableVocabularies.length > 0 ? (
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget Mapping
                </Button>
              ) : (
                <p className="text-sm text-gray-500">
                  All available vocabularies have been used
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {countryBudgetItems.map((cbi) => {
                const percentageSum = cbi.budget_items.reduce((sum, item) => sum + item.percentage, 0);

                return (
                  <div key={cbi.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-white px-4 py-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{getVocabularyName(cbi.vocabulary)}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {percentageSum.toFixed(2)}%
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(cbi)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(cbi.vocabulary)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-md border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-medium w-12"></TableHead>
                            <TableHead className="font-medium">Code</TableHead>
                            <TableHead className="font-medium">Percentage</TableHead>
                            <TableHead className="font-medium">Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cbi.budget_items.map((item, index) => {
                            const rowId = `${cbi.id}-${index}`;
                            const isExpanded = expandedRows.has(rowId);
                            const hasMultipleLanguages = item.description && Object.keys(item.description).length > 1;

                            return (
                              <React.Fragment key={index}>
                                <TableRow>
                                  <TableCell>
                                    {hasMultipleLanguages && (
                                      <button
                                        onClick={() => toggleRowExpansion(rowId)}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </button>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {item.code}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm">{item.percentage}%</TableCell>
                                  <TableCell className="text-sm text-gray-600">{getPrimaryDescription(item.description)}</TableCell>
                                </TableRow>
                                {isExpanded && hasMultipleLanguages && item.description && (
                                  <TableRow>
                                    <TableCell colSpan={4} className="bg-gray-50">
                                      <div className="pl-8 py-2 space-y-2">
                                        <p className="text-xs font-medium text-gray-500 uppercase">Translations:</p>
                                        {Object.entries(item.description).filter(([lang]) => lang !== 'en').map(([lang, text]) => (
                                          <div key={lang} className="text-sm">
                                            <span className="font-mono text-xs text-gray-500">{lang}:</span>{' '}
                                            <span className="text-gray-700">{text}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Mapping Modal */}
      <BudgetMappingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudgetMapping(undefined);
        }}
        onSave={handleSave}
        existingData={editingBudgetMapping}
        usedVocabularies={usedVocabularies}
      />
    </>
  );
}

