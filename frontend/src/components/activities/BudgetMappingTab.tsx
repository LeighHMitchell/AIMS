"use client";

import React from "react";
import { Plus, Edit2, Trash2, AlertCircle, ChevronDown, ChevronRight, Sparkles, Check, RefreshCw, Info } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { BudgetStatusField } from "@/components/activities/BudgetStatusField";
import { BudgetStatusType } from "@/types/activity-budget-status";
import { ClassificationType, CLASSIFICATION_TYPE_LABELS, BudgetClassification } from "@/types/aid-on-budget";
import { toast } from "sonner";

interface BudgetMappingTabProps {
  activityId: string;
  userId?: string;
  budgetStatus?: BudgetStatusType;
  onBudgetPercentage?: number | null;
  budgetStatusNotes?: string | null;
  onActivityChange?: (field: string, value: any) => void;
  onDataChange?: (count: number) => void;
  totalBudgetUSD?: number | null;
}

interface SectorInfo {
  code: string;
  name: string;
  percentage: number;
  categoryCode: string;
  categoryName: string;
}

interface SuggestionItem {
  classificationCode: string;
  classificationName: string;
  classificationId: string;
  totalPercentage: number;
  sourceSectors: Array<{
    code: string;
    name: string;
    percentage: number;
    isFromCategory: boolean;
  }>;
}

interface SuggestionsData {
  hasSectors: boolean;
  sectors: SectorInfo[];
  suggestionsByType: Record<ClassificationType, SuggestionItem[]>;
  unmappedSectors: Array<{
    code: string;
    name: string;
    percentage: number;
    missingTypes: ClassificationType[];
  }>;
  coveragePercent: number;
  existingMappings: {
    hasAuto: boolean;
    hasManual: boolean;
    count: number;
  };
  message?: string;
}

export default function BudgetMappingTab({
  activityId,
  userId,
  budgetStatus = "unknown",
  onBudgetPercentage,
  budgetStatusNotes,
  onActivityChange,
  onDataChange,
  totalBudgetUSD,
}: BudgetMappingTabProps) {
  const [countryBudgetItems, setCountryBudgetItems] = React.useState<CountryBudgetItems[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  // Suggestions state
  const [suggestions, setSuggestions] = React.useState<SuggestionsData | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [applyingSuggestions, setApplyingSuggestions] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBudgetMapping, setEditingBudgetMapping] = React.useState<CountryBudgetItems | undefined>(undefined);
  const [editingItemIndex, setEditingItemIndex] = React.useState<number | undefined>(undefined);

  // Budget classifications for lookup
  const [budgetClassifications, setBudgetClassifications] = React.useState<BudgetClassification[]>([]);

  // Load existing data, suggestions, and classifications
  React.useEffect(() => {
    loadCountryBudgetItems();
    loadSuggestions();
    loadBudgetClassifications();
  }, [activityId]);

  const loadBudgetClassifications = async () => {
    try {
      const response = await fetch('/api/admin/budget-classifications?flat=true');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setBudgetClassifications(data.data);
        }
      }
    } catch (err) {
      console.error('Error loading budget classifications:', err);
    }
  };

  // Helper to look up classification details by code
  const getClassificationByCode = (code: string): BudgetClassification | undefined => {
    return budgetClassifications.find(c => c.code === code);
  };

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

  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const response = await fetch(`/api/activities/${activityId}/budget-suggestions`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error('Error loading suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleApplySuggestions = async (overwriteExisting: boolean = false) => {
    try {
      setApplyingSuggestions(true);
      const response = await fetch(`/api/activities/${activityId}/budget-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwriteExisting }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Applied ${data.created} budget mappings from sectors`);
        await loadCountryBudgetItems();
        await loadSuggestions();
        // Collapse the suggestions card after applying
        setShowSuggestions(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to apply suggestions');
      }
    } catch (err) {
      console.error('Error applying suggestions:', err);
      toast.error('Failed to apply suggestions');
    } finally {
      setApplyingSuggestions(false);
    }
  };

  const handleAddNew = () => {
    setEditingBudgetMapping(undefined);
    setEditingItemIndex(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (cbi: CountryBudgetItems, itemIndex?: number) => {
    setEditingBudgetMapping(cbi);
    setEditingItemIndex(itemIndex);
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
      await loadSuggestions();
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

  const formatUSD = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateUSDValue = (percentage: number): number | null => {
    if (!totalBudgetUSD || totalBudgetUSD <= 0) return null;
    return (percentage / 100) * totalBudgetUSD;
  };

  const usedVocabularies = countryBudgetItems.map(cbi => cbi.vocabulary);
  const availableVocabularies = BUDGET_IDENTIFIER_VOCABULARIES.filter(
    v => !v.withdrawn && !usedVocabularies.includes(v.code)
  );

  // Check if there are suggestions to show
  const hasSuggestions = suggestions?.hasSectors &&
    Object.values(suggestions.suggestionsByType || {}).some(arr => arr.length > 0);

  // Classification type display order
  const classificationTypeOrder: ClassificationType[] = ['administrative', 'functional', 'functional_cofog', 'economic', 'programme'];

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
            {/* Skeleton for suggestions */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-32 w-full" />
            </div>

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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Budget Status Section */}
      {userId && onActivityChange && (
        <Card className="bg-white mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Government Budget Status</CardTitle>
            <CardDescription>
              Set whether this activity is reflected in the government budget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BudgetStatusField
              activityId={activityId}
              userId={userId}
              budgetStatus={budgetStatus}
              onBudgetPercentage={onBudgetPercentage}
              budgetStatusNotes={budgetStatusNotes}
              onActivityChange={onActivityChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Sector-Based Suggestions Section */}
      {suggestions && (
        <Card className="bg-white mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-2 ${hasSuggestions ? 'cursor-pointer' : ''}`}
                onClick={() => hasSuggestions && setShowSuggestions(!showSuggestions)}
              >
                {hasSuggestions && (
                  showSuggestions ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )
                )}
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Suggested Budget Mappings</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {hasSuggestions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSuggestions}
                    disabled={loadingSuggestions}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>
              {suggestions.hasSectors
                ? `Based on ${suggestions.sectors.length} sector${suggestions.sectors.length !== 1 ? 's' : ''} assigned to this activity`
                : 'Add sectors to this activity to get budget mapping suggestions'
              }
            </CardDescription>
          </CardHeader>

          {suggestions.hasSectors && showSuggestions && (
            <CardContent>
              {/* Show activity sectors */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Activity Sectors:</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.sectors.map((sector, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      <span className="font-mono mr-1">{sector.code}</span>
                      {sector.name} ({sector.percentage}%)
                    </Badge>
                  ))}
                </div>
              </div>

              {hasSuggestions ? (
                <>
                  {/* Suggestions table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-medium w-[180px]">Classification Type</TableHead>
                          <TableHead className="font-medium w-[100px]">Code</TableHead>
                          <TableHead className="font-medium">Name</TableHead>
                          <TableHead className="font-medium w-[80px] text-right">%</TableHead>
                          <TableHead className="font-medium">Source Sector(s)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classificationTypeOrder.flatMap((type) => {
                          const typeSuggestions = suggestions.suggestionsByType[type] || [];
                          return typeSuggestions.map((suggestion, idx) => (
                            <TableRow key={`${type}-${idx}`} className="hover:bg-muted/30">
                              <TableCell className="text-sm text-muted-foreground">
                                {CLASSIFICATION_TYPE_LABELS[type]}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                  {suggestion.classificationCode}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">
                                {suggestion.classificationName}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {suggestion.totalPercentage.toFixed(1)}%
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {suggestion.sourceSectors.map((source, sidx) => (
                                    <span
                                      key={sidx}
                                      className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded"
                                      title={source.isFromCategory ? `From category ${source.code.substring(0, 3)}` : `From sector ${source.code}`}
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      {source.code} ({source.percentage}%)
                                      {source.isFromCategory && (
                                        <span className="opacity-60">(cat)</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ));
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Unmapped sectors warning */}
                  {suggestions.unmappedSectors.length > 0 && (
                    <div className="mt-4 p-3 bg-muted/50 border rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Some sectors don't have complete mappings
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure mappings in Admin → Sector Mappings to auto-fill these:
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {suggestions.unmappedSectors.map((sector, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {sector.code} - missing: {sector.missingTypes.map(t => CLASSIFICATION_TYPE_LABELS[t]).join(', ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Apply button */}
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      {suggestions.existingMappings.hasAuto
                        ? 'Auto-mapped items already exist. Apply to update them.'
                        : 'Click to create budget mappings from these suggestions.'}
                    </p>
                    <div className="flex gap-2">
                      {suggestions.existingMappings.hasAuto && (
                        <Button
                          variant="outline"
                          onClick={() => handleApplySuggestions(true)}
                          disabled={applyingSuggestions}
                        >
                          {applyingSuggestions ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Refresh Auto-Mappings
                        </Button>
                      )}
                      <Button
                        onClick={() => handleApplySuggestions(false)}
                        disabled={applyingSuggestions}
                      >
                        {applyingSuggestions ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Apply Suggestions
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    No sector mappings configured for the assigned sectors.
                  </p>
                  <p className="text-xs mt-1">
                    Configure mappings in Admin → Sector Mappings to enable auto-suggestions.
                  </p>
                </div>
              )}
            </CardContent>
          )}

          {!suggestions.hasSectors && (
            <CardContent>
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">{suggestions.message}</p>
                <p className="text-xs mt-1">
                  Go to the Sectors tab to add sector allocations for this activity.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Country Budget Items Section */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Country Budget Item Mappings</CardTitle>
              <CardDescription>
                Map this activity to budget classification codes
              </CardDescription>
            </div>
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
              {hasSuggestions ? (
                <p className="text-sm text-amber-600 mb-4">
                  Use the suggestions above to auto-create mappings from sectors.
                </p>
              ) : null}
              {availableVocabularies.length > 0 ? (
                <Button onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget Mapping Manually
                </Button>
              ) : (
                <p className="text-sm text-gray-500">
                  All available vocabularies have been used
                </p>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Vocabulary</TableHead>
                    <TableHead className="font-medium">Classification Type</TableHead>
                    <TableHead className="font-medium">Budget Classification</TableHead>
                    <TableHead className="font-medium w-24">Percentage</TableHead>
                    {totalBudgetUSD != null && totalBudgetUSD > 0 && (
                      <TableHead className="font-medium text-right w-32">USD Value</TableHead>
                    )}
                    <TableHead className="font-medium">Description</TableHead>
                    <TableHead className="font-medium w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryBudgetItems.flatMap((cbi) =>
                    cbi.budget_items.map((item, index) => {
                      const classification = getClassificationByCode(item.code);
                      const isAutoMapped = !!item.source_sector_code;

                      return (
                        <TableRow key={`${cbi.id}-${index}`} className={isAutoMapped ? "bg-muted/30" : ""}>
                          <TableCell className="text-sm text-muted-foreground">
                            {getVocabularyName(cbi.vocabulary)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {classification
                              ? CLASSIFICATION_TYPE_LABELS[classification.classificationType]
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {item.code}
                              </span>
                              <span className="text-sm font-medium">
                                {classification?.name || '-'}
                              </span>
                              {isAutoMapped && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded" title={`Suggested from sector: ${item.source_sector_name || item.source_sector_code}`}>
                                  <Sparkles className="h-3 w-3" />
                                  Auto
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{item.percentage}%</TableCell>
                          {totalBudgetUSD != null && totalBudgetUSD > 0 && (
                            <TableCell className="text-sm text-right font-medium">
                              {calculateUSDValue(item.percentage) !== null
                                ? formatUSD(calculateUSDValue(item.percentage)!)
                                : '-'}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="text-sm text-gray-600">
                              {getPrimaryDescription(item.description)}
                              {isAutoMapped && item.source_sector_name && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  From sector: {item.source_sector_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(cbi, index)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(cbi.vocabulary)}
                                className="p-1 text-muted-foreground hover:text-red-600 rounded hover:bg-muted"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
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
          setEditingItemIndex(undefined);
        }}
        onSave={handleSave}
        existingData={editingBudgetMapping}
        usedVocabularies={usedVocabularies}
        initialEditIndex={editingItemIndex}
      />
    </>
  );
}
