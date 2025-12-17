"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { toast } from "sonner";
import {
  Map,
  Search,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Lock,
  Unlock,
} from "lucide-react";
import {
  SectorBudgetMapping,
  BudgetClassification,
  ClassificationType,
  CLASSIFICATION_TYPE_LABELS,
  GroupedSectorMapping,
} from "@/types/aid-on-budget";
import dacSectorsData from "@/data/dac-sectors.json";

interface SectorCategory {
  code: string;
  name: string;
  sectors: {
    code: string;
    name: string;
    description: string;
  }[];
}

// Parse DAC sectors into hierarchical structure
function parseDacSectors(): SectorCategory[] {
  const categories: SectorCategory[] = [];

  for (const [categoryKey, sectors] of Object.entries(dacSectorsData)) {
    const match = categoryKey.match(/^(\d{3})\s*-\s*(.+)$/);
    if (match) {
      categories.push({
        code: match[1],
        name: match[2],
        sectors: (sectors as any[]).map((s) => ({
          code: s.code,
          name: s.name.replace(/^\d+\s*-\s*/, ""),
          description: s.description,
        })),
      });
    }
  }

  return categories.sort((a, b) => a.code.localeCompare(b.code));
}

// Cell being edited
interface EditingCell {
  sectorCode: string;
  sectorName: string;
  isCategory: boolean;
  classificationType: ClassificationType;
  currentValue: string;
  mappingId?: string;
}

type SortColumn = "sector" | "administrative" | "functional" | "functional_cofog" | "economic" | "programme";
type SortDirection = "asc" | "desc";

export function SectorMappingsManagement() {
  const [mappings, setMappings] = useState<Record<string, GroupedSectorMapping>>({});
  const [classifications, setClassifications] = useState<BudgetClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxSearch, setComboboxSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("sector");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isLocked, setIsLocked] = useState(true);

  const dacCategories = useMemo(() => parseDacSectors(), []);

  // Group classifications by type
  const classificationsByType = useMemo(() => {
    const grouped: Record<ClassificationType, BudgetClassification[]> = {
      functional: [],
      functional_cofog: [],
      administrative: [],
      economic: [],
      programme: [],
    };

    classifications.forEach((c) => {
      if (c.isActive && grouped[c.classificationType]) {
        grouped[c.classificationType].push(c);
      }
    });

    return grouped;
  }, [classifications]);

  // Build hierarchical structure for COFOG (divisions with groups underneath)
  const cofogHierarchy = useMemo(() => {
    const cofogClassifications = classificationsByType.functional_cofog;
    const divisions = cofogClassifications.filter(c => c.level === 1).sort((a, b) => a.sortOrder - b.sortOrder);

    return divisions.map(division => ({
      division,
      groups: cofogClassifications
        .filter(c => c.parentId === division.id && c.level === 2)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }));
  }, [classificationsByType.functional_cofog]);

  // Fetch mappings
  const fetchMappings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/sector-mappings?grouped=true");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch mappings");
      }

      setMappings(data.data || {});
      setError(null);
    } catch (err: any) {
      console.error("Error fetching mappings:", err);
      setError(err.message || "Failed to load mappings");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch classifications
  const fetchClassifications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/budget-classifications?flat=true");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch classifications");
      }

      setClassifications(data.data || []);
    } catch (err: any) {
      console.error("Error fetching classifications:", err);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
    fetchClassifications();
  }, [fetchMappings, fetchClassifications]);

  // Toggle category expansion
  const toggleCategory = (categoryCode: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryCode)) {
      newExpanded.delete(categoryCode);
    } else {
      newExpanded.add(categoryCode);
    }
    setExpandedCategories(newExpanded);
  };

  // Expand all categories
  const expandAll = () => {
    setExpandedCategories(new Set(dacCategories.map(c => c.code)));
  };

  // Collapse all categories
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Filter sectors based on search
  // Helper to get mapping value for sorting
  const getMappingValue = (sectorCode: string, type: ClassificationType): string => {
    const mapping = mappings[sectorCode]?.mappings[type];
    if (mapping?.budgetClassification) {
      return `${mapping.budgetClassification.code} ${mapping.budgetClassification.name}`;
    }
    // Check inherited
    const categoryCode = sectorCode.substring(0, 3);
    const inherited = mappings[categoryCode]?.mappings[type];
    if (inherited?.budgetClassification) {
      return `${inherited.budgetClassification.code} ${inherited.budgetClassification.name}`;
    }
    return "";
  };

  const filteredCategories = useMemo(() => {
    let result = dacCategories;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result
        .map((category) => ({
          ...category,
          sectors: category.sectors.filter(
            (sector) =>
              sector.code.includes(query) ||
              sector.name.toLowerCase().includes(query)
          ),
        }))
        .filter(
          (category) =>
            category.code.includes(query) ||
            category.name.toLowerCase().includes(query) ||
            category.sectors.length > 0
        );
    }

    // Apply sorting
    const sortedResult = [...result].sort((a, b) => {
      let aVal: string, bVal: string;

      if (sortColumn === "sector") {
        aVal = a.code;
        bVal = b.code;
      } else {
        aVal = getMappingValue(a.code, sortColumn as ClassificationType);
        bVal = getMappingValue(b.code, sortColumn as ClassificationType);
      }

      const comparison = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? comparison : -comparison;
    });

    // Also sort sectors within each category
    return sortedResult.map((category) => ({
      ...category,
      sectors: [...category.sectors].sort((a, b) => {
        let aVal: string, bVal: string;

        if (sortColumn === "sector") {
          aVal = a.code;
          bVal = b.code;
        } else {
          aVal = getMappingValue(a.code, sortColumn as ClassificationType);
          bVal = getMappingValue(b.code, sortColumn as ClassificationType);
        }

        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      }),
    }));
  }, [dacCategories, searchQuery, sortColumn, sortDirection, mappings]);

  // Toggle sort column
  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Sector Code", "Sector Name", "Level", "Administrative", "Functional - National", "Functional - COFOG", "Economic", "Programme"];
    const rows: string[][] = [];

    // Iterate through all categories and sectors
    for (const category of dacCategories) {
      // Add category row
      const catAdmin = mappings[category.code]?.mappings.administrative?.budgetClassification;
      const catFunc = mappings[category.code]?.mappings.functional?.budgetClassification;
      const catFuncCofog = mappings[category.code]?.mappings.functional_cofog?.budgetClassification;
      const catEcon = mappings[category.code]?.mappings.economic?.budgetClassification;
      const catProg = mappings[category.code]?.mappings.programme?.budgetClassification;

      rows.push([
        category.code,
        category.name,
        "Category",
        catAdmin ? `${catAdmin.code} - ${catAdmin.name}` : "",
        catFunc ? `${catFunc.code} - ${catFunc.name}` : "",
        catFuncCofog ? `${catFuncCofog.code} - ${catFuncCofog.name}` : "",
        catEcon ? `${catEcon.code} - ${catEcon.name}` : "",
        catProg ? `${catProg.code} - ${catProg.name}` : "",
      ]);

      // Add sector rows
      for (const sector of category.sectors) {
        const secAdmin = mappings[sector.code]?.mappings.administrative?.budgetClassification ||
          (mappings[category.code]?.mappings.administrative?.budgetClassification);
        const secFunc = mappings[sector.code]?.mappings.functional?.budgetClassification ||
          (mappings[category.code]?.mappings.functional?.budgetClassification);
        const secFuncCofog = mappings[sector.code]?.mappings.functional_cofog?.budgetClassification ||
          (mappings[category.code]?.mappings.functional_cofog?.budgetClassification);
        const secEcon = mappings[sector.code]?.mappings.economic?.budgetClassification ||
          (mappings[category.code]?.mappings.economic?.budgetClassification);
        const secProg = mappings[sector.code]?.mappings.programme?.budgetClassification ||
          (mappings[category.code]?.mappings.programme?.budgetClassification);

        const hasOwnMapping = mappings[sector.code] && Object.keys(mappings[sector.code].mappings).length > 0;

        rows.push([
          sector.code,
          sector.name,
          hasOwnMapping ? "Sector (custom)" : "Sector (inherited)",
          secAdmin ? `${secAdmin.code} - ${secAdmin.name}` : "",
          secFunc ? `${secFunc.code} - ${secFunc.name}` : "",
          secFuncCofog ? `${secFuncCofog.code} - ${secFuncCofog.name}` : "",
          secEcon ? `${secEcon.code} - ${secEcon.name}` : "",
          secProg ? `${secProg.code} - ${secProg.name}` : "",
        ]);
      }
    }

    // Create CSV content
    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sector-mappings-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Exported sector mappings to CSV");
  };

  // Get inherited mapping for a sector
  const getInheritedMapping = (sectorCode: string): GroupedSectorMapping | null => {
    const categoryCode = sectorCode.substring(0, 3);
    if (mappings[categoryCode] && mappings[categoryCode].isCategoryLevel) {
      return mappings[categoryCode];
    }
    return null;
  };

  // Start editing a cell
  const startEditing = (
    sectorCode: string,
    sectorName: string,
    isCategory: boolean,
    classificationType: ClassificationType
  ) => {
    const existing = mappings[sectorCode]?.mappings[classificationType];
    const inherited = !isCategory ? getInheritedMapping(sectorCode)?.mappings[classificationType] : null;

    setEditingCell({
      sectorCode,
      sectorName,
      isCategory,
      classificationType,
      currentValue: existing?.budgetClassificationId || "",
      mappingId: existing?.id,
    });
    setEditValue(existing?.budgetClassificationId || inherited?.budgetClassificationId || "");
    setComboboxSearch("");
    setComboboxOpen(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue("");
    setComboboxOpen(false);
    setComboboxSearch("");
  };

  // Save cell edit - optionally pass a value directly for immediate save on selection
  const saveCell = async (directValue?: string) => {
    if (!editingCell) return;

    const { sectorCode, sectorName, isCategory, classificationType, currentValue, mappingId } = editingCell;
    const valueToSave = directValue !== undefined ? directValue : editValue;
    const newValue = valueToSave === "__none__" ? "" : valueToSave;

    // No change
    if (newValue === currentValue) {
      cancelEditing();
      return;
    }

    setSaving(true);

    // Find the classification for local state update
    const newClassification = newValue
      ? classifications.find(c => c.id === newValue)
      : undefined;

    try {
      let newMappingId: string | undefined = mappingId;

      if (newValue && !mappingId) {
        // Create new mapping
        const response = await fetch("/api/admin/sector-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectorCode,
            sectorName,
            budgetClassificationId: newValue,
            isCategoryLevel: isCategory,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create mapping");
        }

        const result = await response.json();
        newMappingId = result.data?.id;
        toast.success("Mapping created");
      } else if (newValue && mappingId) {
        // Update existing mapping
        const response = await fetch(`/api/admin/sector-mappings/${mappingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budgetClassificationId: newValue,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update mapping");
        }

        toast.success("Mapping updated");
      } else if (!newValue && mappingId) {
        // Delete mapping
        const response = await fetch(`/api/admin/sector-mappings/${mappingId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete mapping");
        }

        newMappingId = undefined;
        toast.success("Mapping removed");
      }

      // Update local state instead of refetching
      setMappings(prev => {
        const updated = { ...prev };

        if (!updated[sectorCode]) {
          updated[sectorCode] = {
            sectorCode,
            sectorName,
            isCategoryLevel: isCategory,
            mappings: {},
          };
        }

        if (newValue && newClassification) {
          // Add or update mapping
          updated[sectorCode] = {
            ...updated[sectorCode],
            mappings: {
              ...updated[sectorCode].mappings,
              [classificationType]: {
                id: newMappingId || "",
                sectorCode,
                sectorName,
                budgetClassificationId: newValue,
                budgetClassification: newClassification,
                percentage: 100,
                isDefault: true,
                isCategoryLevel: isCategory,
              },
            },
          };
        } else {
          // Remove mapping
          const { [classificationType]: removed, ...remainingMappings } = updated[sectorCode].mappings;
          updated[sectorCode] = {
            ...updated[sectorCode],
            mappings: remainingMappings,
          };

          // If no mappings left, remove the sector entry
          if (Object.keys(remainingMappings).length === 0) {
            delete updated[sectorCode];
          }
        }

        return updated;
      });

      cancelEditing();
    } catch (err: any) {
      console.error("Error saving mapping:", err);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Get display value for a cell
  const getCellDisplay = (
    sectorCode: string,
    isCategory: boolean,
    classificationType: ClassificationType
  ): { value: string; isInherited: boolean; classification?: BudgetClassification } => {
    const mapping = mappings[sectorCode]?.mappings[classificationType];

    if (mapping) {
      return {
        value: mapping.budgetClassification?.code || "",
        isInherited: false,
        classification: mapping.budgetClassification,
      };
    }

    if (!isCategory) {
      const inherited = getInheritedMapping(sectorCode)?.mappings[classificationType];
      if (inherited) {
        return {
          value: inherited.budgetClassification?.code || "",
          isInherited: true,
          classification: inherited.budgetClassification,
        };
      }
    }

    return { value: "", isInherited: false };
  };

  // Render a table cell
  const renderCell = (
    sectorCode: string,
    sectorName: string,
    isCategory: boolean,
    classificationType: ClassificationType
  ) => {
    const isEditing =
      editingCell?.sectorCode === sectorCode &&
      editingCell?.classificationType === classificationType;

    if (isEditing) {
      const options = classificationsByType[classificationType];
      const selectedClassification = options.find((c) => c.id === editValue);
      const searchLower = comboboxSearch.toLowerCase();

      // Filter function for search
      const matchesSearch = (c: BudgetClassification) => {
        if (!comboboxSearch) return true;
        return (
          c.code.toLowerCase().includes(searchLower) ||
          c.name.toLowerCase().includes(searchLower) ||
          (c.nameLocal && c.nameLocal.toLowerCase().includes(searchLower))
        );
      };

      // For COFOG, filter the hierarchy
      const filteredCofogHierarchy = classificationType === 'functional_cofog'
        ? cofogHierarchy
            .map(({ division, groups }) => ({
              division,
              groups: groups.filter(matchesSearch),
              // Also check if division itself matches (to show it even if no groups match)
              divisionMatches: matchesSearch(division)
            }))
            .filter(({ division, groups, divisionMatches }) => divisionMatches || groups.length > 0)
        : [];

      // For non-COFOG types, use flat filtered list
      const filteredOptions = classificationType !== 'functional_cofog'
        ? options.filter(matchesSearch)
        : [];

      // Render hierarchical COFOG dropdown
      const renderCofogOptions = () => (
        <>
          {filteredCofogHierarchy.map(({ division, groups, divisionMatches }) => (
            <CommandGroup key={division.id} heading={`${division.code} - ${division.name}`}>
              {/* Allow selecting the division itself */}
              <CommandItem
                className="flex items-center justify-start text-left"
                onSelect={() => {
                  setComboboxOpen(false);
                  setComboboxSearch("");
                  saveCell(division.id);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 flex-shrink-0 ${
                    editValue === division.id ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs flex-shrink-0">{division.code}</span>
                <span className="ml-2 text-sm truncate text-left font-medium">{division.name}</span>
              </CommandItem>
              {/* Show child groups */}
              {groups.map((group) => (
                <CommandItem
                  key={group.id}
                  className="flex items-center justify-start text-left pl-6"
                  onSelect={() => {
                    setComboboxOpen(false);
                    setComboboxSearch("");
                    saveCell(group.id);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 flex-shrink-0 ${
                      editValue === group.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs flex-shrink-0">{group.code}</span>
                  <span className="ml-2 text-sm truncate text-left">{group.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </>
      );

      // Render flat list for non-COFOG types
      const renderFlatOptions = () => (
        <CommandGroup>
          {filteredOptions.map((c) => (
            <CommandItem
              key={c.id}
              className="flex items-center justify-start text-left"
              onSelect={() => {
                setComboboxOpen(false);
                setComboboxSearch("");
                saveCell(c.id);
              }}
            >
              <Check
                className={`mr-2 h-4 w-4 flex-shrink-0 ${
                  editValue === c.id ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs flex-shrink-0">{c.code}</span>
              <span className="ml-2 text-sm truncate text-left">{c.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      );

      return (
        <div className="flex items-center gap-1 relative">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger data-popover-trigger className="text-left">
              <div className="flex items-center justify-between h-8 px-2 text-xs border rounded-md bg-background hover:bg-accent cursor-pointer min-w-[200px]">
                {selectedClassification ? (
                  <span className="truncate">
                    <span className="font-mono bg-muted px-1 py-0.5 rounded">{selectedClassification.code}</span>
                    <span className="ml-1">{selectedClassification.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select classification...</span>
                )}
                <ChevronsUpDown className="h-3 w-3 ml-2 shrink-0 opacity-50" />
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[400px] p-0 left-0">
              <Command>
                <CommandInput
                  placeholder="Search by code or name..."
                  value={comboboxSearch}
                  onChange={(e) => setComboboxSearch(e.target.value)}
                />
                <CommandList className="max-h-[400px]">
                  <CommandEmpty>No classification found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      className="flex items-center justify-start text-left"
                      onSelect={() => {
                        setComboboxOpen(false);
                        setComboboxSearch("");
                        saveCell("");
                      }}
                    >
                      <Check className="mr-2 h-4 w-4 flex-shrink-0 opacity-0" />
                      <span className="text-muted-foreground">None (remove mapping)</span>
                    </CommandItem>
                  </CommandGroup>
                  {classificationType === 'functional_cofog' ? renderCofogOptions() : renderFlatOptions()}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={cancelEditing}
            disabled={saving}
            title="Cancel"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-red-600" />
          </Button>
        </div>
      );
    }

    const { value, isInherited, classification } = getCellDisplay(
      sectorCode,
      isCategory,
      classificationType
    );

    return (
      <button
        className={`w-full text-left px-2 py-1 rounded transition-colors min-h-[32px] ${
          isLocked ? "cursor-default" : "hover:bg-muted/50"
        } ${isInherited ? "text-muted-foreground italic" : ""} ${!value ? "text-muted-foreground/50" : ""}`}
        onClick={() => !isLocked && startEditing(sectorCode, sectorName, isCategory, classificationType)}
        title={isLocked ? (classification ? `${classification.code} - ${classification.name}` : "No mapping") : (classification ? `${classification.code} - ${classification.name}` : "Click to add mapping")}
        disabled={isLocked}
      >
        {value && classification ? (
          <div className="text-xs">
            <span className="font-mono bg-muted px-1 py-0.5 rounded">{classification.code}</span>
            <span className="ml-1.5">{classification.name}</span>
            {isInherited && <span className="ml-1 text-[10px]">(inherited)</span>}
          </div>
        ) : (
          <span className="text-xs">—</span>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Sector Mappings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Sector Mappings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-red-600">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>{error}</p>
            <Button onClick={fetchMappings} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Sector Mappings
            </CardTitle>
            <CardDescription>
              Map DAC sector codes to budget classifications. Click any cell to edit. Category mappings apply to all child sectors unless overridden.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Controls */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sectors by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button
            variant={isLocked ? "outline" : "default"}
            size="sm"
            onClick={() => setIsLocked(!isLocked)}
            className={isLocked ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}
            title={isLocked ? "Click to unlock editing" : "Click to lock editing"}
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 mr-1" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-1" />
                Unlocked
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} title="Export to CSV">
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 bg-background z-10 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <tr className="border-b-2">
                  <th
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground w-[280px] min-w-[280px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("sector")}
                  >
                    <div className="flex items-center gap-2">
                      DAC Sector
                      {sortColumn === "sector" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[200px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("administrative")}
                  >
                    <div className="flex items-center gap-2">
                      Administrative
                      {sortColumn === "administrative" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[200px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("functional")}
                  >
                    <div className="flex items-center gap-2">
                      Functional - National
                      {sortColumn === "functional" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[200px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("functional_cofog")}
                  >
                    <div className="flex items-center gap-2">
                      Functional - COFOG
                      {sortColumn === "functional_cofog" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[200px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("economic")}
                  >
                    <div className="flex items-center gap-2">
                      Economic
                      {sortColumn === "economic" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th
                    className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground min-w-[200px] bg-background cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => toggleSort("programme")}
                  >
                    <div className="flex items-center gap-2">
                      Programme
                      {sortColumn === "programme" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => {
                  const isExpanded = expandedCategories.has(category.code);

                  return (
                    <React.Fragment key={category.code}>
                      {/* Category Row */}
                      <tr className="border-b bg-muted/30 hover:bg-muted/50">
                        <td className="p-4 align-middle font-medium">
                          <button
                            className="flex items-center gap-2 w-full text-left"
                            onClick={() => toggleCategory(category.code)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {category.code}
                            </span>
                            <span className="truncate">{category.name}</span>
                          </button>
                        </td>
                        <td className="p-4 align-middle">
                          {renderCell(category.code, category.name, true, "administrative")}
                        </td>
                        <td className="p-4 align-middle">
                          {renderCell(category.code, category.name, true, "functional")}
                        </td>
                        <td className="p-4 align-middle">
                          {renderCell(category.code, category.name, true, "functional_cofog")}
                        </td>
                        <td className="p-4 align-middle">
                          {renderCell(category.code, category.name, true, "economic")}
                        </td>
                        <td className="p-4 align-middle">
                          {renderCell(category.code, category.name, true, "programme")}
                        </td>
                      </tr>

                      {/* Sector Rows */}
                      {isExpanded &&
                        category.sectors.map((sector) => (
                          <tr key={sector.code} className="border-b hover:bg-muted/20">
                            <td className="p-4 align-middle pl-10">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {sector.code}
                                </span>
                                <span className="text-sm truncate" title={sector.name}>
                                  {sector.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              {renderCell(sector.code, sector.name, false, "administrative")}
                            </td>
                            <td className="p-4 align-middle">
                              {renderCell(sector.code, sector.name, false, "functional")}
                            </td>
                            <td className="p-4 align-middle">
                              {renderCell(sector.code, sector.name, false, "functional_cofog")}
                            </td>
                            <td className="p-4 align-middle">
                              {renderCell(sector.code, sector.name, false, "economic")}
                            </td>
                            <td className="p-4 align-middle">
                              {renderCell(sector.code, sector.name, false, "programme")}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
          <span>{isLocked ? "Unlock to edit mappings" : "Click any cell to edit"}</span>
          <span className="italic">Italic = inherited from category</span>
          <span>— = no mapping</span>
        </div>
      </CardContent>
    </Card>
  );
}
