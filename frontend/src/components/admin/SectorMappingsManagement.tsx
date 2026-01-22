"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Building2,
  Landmark,
  DollarSign,
  CreditCard,
} from "lucide-react";
import {
  SectorBudgetMapping,
  BudgetClassification,
  ClassificationType,
  CLASSIFICATION_TYPE_LABELS,
  GroupedSectorMapping,
} from "@/types/aid-on-budget";
import dacSectorsData from "@/data/dac-sectors.json";
import financeTypesData from "@/data/finance-types.json";

// ============================================================================
// Types
// ============================================================================

interface SectorCategory {
  code: string;
  name: string;
  sectors: {
    code: string;
    name: string;
    description: string;
  }[];
}

interface FinanceType {
  code: string;
  name: string;
  description: string;
  group: string;
  withdrawn: boolean;
}

interface OrganizationMapping {
  organizationId: string;
  organizationName: string;
  acronym?: string;
  iatiOrgId?: string;
  orgType?: string;
  orgTypeName?: string;
  mapping: {
    id: string;
    budgetClassificationId: string;
    budgetClassification: BudgetClassification;
    notes?: string;
  } | null;
}

interface FinanceTypeMapping {
  financeTypeCode: string;
  financeTypeName: string;
  description: string;
  group: string;
  mapping: {
    id: string;
    budgetClassificationId: string;
    budgetClassification: BudgetClassification;
    notes?: string;
  } | null;
}

type MappingMode = "sectors" | "administrative" | "funding_sources" | "revenue" | "liabilities";

interface CountrySector {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Main Component
// ============================================================================

export function SectorMappingsManagement() {
  const [activeMode, setActiveMode] = useState<MappingMode>("sectors");

  // Sector mappings state
  const [sectorMappings, setSectorMappings] = useState<Record<string, GroupedSectorMapping>>({});
  const [classifications, setClassifications] = useState<BudgetClassification[]>([]);

  // Organization mappings state (Funding Sources)
  const [orgMappings, setOrgMappings] = useState<OrganizationMapping[]>([]);

  // Administrative mappings state (Receiver Orgs)
  const [adminMappings, setAdminMappings] = useState<OrganizationMapping[]>([]);

  // Finance type mappings state
  const [financeTypeMappings, setFinanceTypeMappings] = useState<FinanceTypeMapping[]>([]);

  // Country sectors state (from country_sector_vocabularies)
  const [countrySectors, setCountrySectors] = useState<CountrySector[]>([]);
  const [countrySectorsLoading, setCountrySectorsLoading] = useState(false);

  // Common state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLocked, setIsLocked] = useState(true);
  const [orgTypeFilter, setOrgTypeFilter] = useState<string>("all");

  // Editing state
  const [editingCell, setEditingCell] = useState<any>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxSearch, setComboboxSearch] = useState("");

  const dacCategories = useMemo(() => parseDacSectors(), []);
  const financeTypes = useMemo(() =>
    (financeTypesData as FinanceType[]).filter(ft => !ft.withdrawn),
    []
  );

  // Group classifications by type
  const classificationsByType = useMemo(() => {
    const grouped: Record<string, BudgetClassification[]> = {
      functional: [],
      functional_cofog: [],
      administrative: [],
      economic: [],
      programme: [],
      funding_sources: [],
      revenue: [],
      liabilities: [],
      country_sector: [],
    };

    classifications.forEach((c) => {
      if (c.isActive && grouped[c.classificationType]) {
        grouped[c.classificationType].push(c);
      }
    });

    // Convert country sectors to BudgetClassification format for the dropdown
    // This allows the existing UI components to work with country sectors
    grouped.country_sector = countrySectors.map((cs) => ({
      id: cs.id,
      code: cs.code,
      name: cs.name,
      nameLocal: undefined,
      description: cs.description,
      classificationType: "country_sector" as ClassificationType,
      parentId: undefined,
      level: cs.level,
      isActive: cs.isActive,
      sortOrder: cs.sortOrder,
    }));

    return grouped;
  }, [classifications, countrySectors]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchClassifications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/budget-classifications?flat=true&activeOnly=true");
      const data = await response.json();
      if (response.ok) {
        setClassifications(data.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching classifications:", err);
    }
  }, []);

  const fetchSectorMappings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/sector-mappings?grouped=true");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSectorMappings(data.data || {});
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load mappings");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrgMappings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/organization-mappings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrgMappings(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load organization mappings");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminMappings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/organization-administrative-mappings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAdminMappings(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load administrative mappings");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFinanceTypeMappings = useCallback(async (type: "revenue" | "liabilities") => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/finance-type-mappings?classificationType=${type}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFinanceTypeMappings(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load finance type mappings");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch country sectors from the default sector vocabulary
  const fetchCountrySectors = useCallback(async () => {
    try {
      setCountrySectorsLoading(true);
      // First get all active vocabularies
      const vocabResponse = await fetch("/api/admin/country-sector-vocabularies?activeOnly=true");
      const vocabData = await vocabResponse.json();

      if (!vocabResponse.ok) {
        console.error("Failed to fetch vocabularies:", vocabData.error);
        return;
      }

      // Filter to only sector-type vocabularies
      const sectorVocabs = vocabData.data?.filter((v: any) => v.vocabulary_type === "sector" || !v.vocabulary_type) || [];

      // Find the default sector vocabulary or the first sector vocabulary
      const defaultVocab = sectorVocabs.find((v: any) => v.is_default) || sectorVocabs[0];

      if (!defaultVocab) {
        // No vocabulary exists yet
        setCountrySectors([]);
        return;
      }

      // Fetch sectors from the default vocabulary
      const sectorsResponse = await fetch(`/api/admin/country-sector-vocabularies/${defaultVocab.id}`);
      const sectorsData = await sectorsResponse.json();

      if (!sectorsResponse.ok) {
        console.error("Failed to fetch sectors:", sectorsData.error);
        return;
      }

      // Transform sectors to the expected format
      // API returns { success: true, data: { ...vocabulary, sectors: [...] } }
      const sectors: CountrySector[] = (sectorsData.data?.sectors || [])
        .filter((s: any) => s.is_active)
        .map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description,
          level: s.level || 1,
          sortOrder: s.sort_order || 0,
          isActive: s.is_active,
        }));

      setCountrySectors(sectors);
    } catch (err: any) {
      console.error("Error fetching country sectors:", err);
    } finally {
      setCountrySectorsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchClassifications();
    fetchCountrySectors();
  }, [fetchClassifications, fetchCountrySectors]);

  // Fetch data based on active mode
  useEffect(() => {
    setSearchQuery("");
    setExpandedCategories(new Set());

    if (activeMode === "sectors") {
      fetchSectorMappings();
    } else if (activeMode === "administrative") {
      fetchAdminMappings();
    } else if (activeMode === "funding_sources") {
      fetchOrgMappings();
    } else if (activeMode === "revenue" || activeMode === "liabilities") {
      fetchFinanceTypeMappings(activeMode);
    }
  }, [activeMode, fetchSectorMappings, fetchAdminMappings, fetchOrgMappings, fetchFinanceTypeMappings]);

  // ============================================================================
  // Common handlers
  // ============================================================================

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue("");
    setComboboxOpen(false);
    setComboboxSearch("");
  };

  const toggleCategory = (categoryCode: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryCode)) {
      newExpanded.delete(categoryCode);
    } else {
      newExpanded.add(categoryCode);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    if (activeMode === "sectors") {
      setExpandedCategories(new Set(dacCategories.map(c => c.code)));
    } else {
      // For finance types, expand all groups
      const groups = new Set(financeTypes.map(ft => ft.group));
      setExpandedCategories(groups);
    }
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // ============================================================================
  // Sector Mappings handlers (existing logic)
  // ============================================================================

  const getInheritedMapping = (sectorCode: string): GroupedSectorMapping | null => {
    const categoryCode = sectorCode.substring(0, 3);
    if (sectorMappings[categoryCode] && sectorMappings[categoryCode].isCategoryLevel) {
      return sectorMappings[categoryCode];
    }
    return null;
  };

  const startSectorEditing = (
    sectorCode: string,
    sectorName: string,
    isCategory: boolean,
    classificationType: ClassificationType
  ) => {
    const existing = sectorMappings[sectorCode]?.mappings[classificationType];
    const inherited = !isCategory ? getInheritedMapping(sectorCode)?.mappings[classificationType] : null;

    setEditingCell({
      type: "sector",
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

  const saveSectorCell = async (directValue?: string) => {
    if (!editingCell || editingCell.type !== "sector") return;

    const { sectorCode, sectorName, isCategory, classificationType, currentValue, mappingId } = editingCell;
    const valueToSave = directValue !== undefined ? directValue : editValue;
    const newValue = valueToSave === "__none__" ? "" : valueToSave;

    if (newValue === currentValue) {
      cancelEditing();
      return;
    }

    setSaving(true);
    const newClassification = newValue ? classifications.find(c => c.id === newValue) : undefined;

    try {
      let newMappingId: string | undefined = mappingId;

      if (newValue && !mappingId) {
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
          throw new Error(data.error);
        }
        const result = await response.json();
        newMappingId = result.data?.id;
        toast.success("Mapping created");
      } else if (newValue && mappingId) {
        const response = await fetch(`/api/admin/sector-mappings/${mappingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgetClassificationId: newValue }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        toast.success("Mapping updated");
      } else if (!newValue && mappingId) {
        const response = await fetch(`/api/admin/sector-mappings/${mappingId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        newMappingId = undefined;
        toast.success("Mapping removed");
      }

      // Update local state
      setSectorMappings(prev => {
        const updated = { ...prev };
        if (!updated[sectorCode]) {
          updated[sectorCode] = { sectorCode, sectorName, isCategoryLevel: isCategory, mappings: {} };
        }
        if (newValue && newClassification) {
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
          const { [classificationType]: removed, ...remainingMappings } = updated[sectorCode].mappings;
          updated[sectorCode] = { ...updated[sectorCode], mappings: remainingMappings };
          if (Object.keys(remainingMappings).length === 0) delete updated[sectorCode];
        }
        return updated;
      });

      cancelEditing();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // Organization Mappings handlers
  // ============================================================================

  const startOrgEditing = (org: OrganizationMapping) => {
    setEditingCell({
      type: "org",
      organizationId: org.organizationId,
      organizationName: org.organizationName,
      currentValue: org.mapping?.budgetClassificationId || "",
      mappingId: org.mapping?.id,
    });
    setEditValue(org.mapping?.budgetClassificationId || "");
    setComboboxSearch("");
    setComboboxOpen(true);
  };

  const saveOrgCell = async (directValue?: string) => {
    if (!editingCell || editingCell.type !== "org") return;

    const { organizationId, organizationName, currentValue, mappingId } = editingCell;
    const valueToSave = directValue !== undefined ? directValue : editValue;
    const newValue = valueToSave === "__none__" ? "" : valueToSave;

    if (newValue === currentValue) {
      cancelEditing();
      return;
    }

    setSaving(true);
    const newClassification = newValue ? classifications.find(c => c.id === newValue) : undefined;

    try {
      let newMappingId: string | undefined = mappingId;

      if (newValue && !mappingId) {
        const response = await fetch("/api/admin/organization-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, budgetClassificationId: newValue }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        const result = await response.json();
        newMappingId = result.data?.id;
        toast.success("Mapping created");
      } else if (newValue && mappingId) {
        const response = await fetch(`/api/admin/organization-mappings/${mappingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgetClassificationId: newValue }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        toast.success("Mapping updated");
      } else if (!newValue && mappingId) {
        const response = await fetch(`/api/admin/organization-mappings/${mappingId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        newMappingId = undefined;
        toast.success("Mapping removed");
      }

      // Update local state
      setOrgMappings(prev => prev.map(org => {
        if (org.organizationId !== organizationId) return org;
        return {
          ...org,
          mapping: newValue && newClassification ? {
            id: newMappingId || "",
            budgetClassificationId: newValue,
            budgetClassification: newClassification,
          } : null,
        };
      }));

      cancelEditing();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // Administrative Mappings handlers
  // ============================================================================

  const startAdminEditing = (org: OrganizationMapping) => {
    setEditingCell({
      type: "admin",
      organizationId: org.organizationId,
      organizationName: org.organizationName,
      currentValue: org.mapping?.budgetClassificationId || "",
      mappingId: org.mapping?.id,
    });
    setEditValue(org.mapping?.budgetClassificationId || "");
    setComboboxSearch("");
    setComboboxOpen(true);
  };

  const saveAdminCell = async (directValue?: string) => {
    if (!editingCell || editingCell.type !== "admin") return;

    const { organizationId, currentValue, mappingId } = editingCell;
    const valueToSave = directValue !== undefined ? directValue : editValue;
    const newValue = valueToSave === "__none__" ? "" : valueToSave;

    if (newValue === currentValue) {
      cancelEditing();
      return;
    }

    setSaving(true);
    const newClassification = newValue ? classifications.find(c => c.id === newValue) : undefined;

    try {
      let newMappingId: string | undefined = mappingId;

      if (newValue && !mappingId) {
        const response = await fetch("/api/admin/organization-administrative-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, budgetClassificationId: newValue }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        const result = await response.json();
        newMappingId = result.data?.id;
        toast.success("Mapping created");
      } else if (newValue && mappingId) {
        const response = await fetch(`/api/admin/organization-administrative-mappings/${mappingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgetClassificationId: newValue }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        toast.success("Mapping updated");
      } else if (!newValue && mappingId) {
        const response = await fetch(`/api/admin/organization-administrative-mappings/${mappingId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        newMappingId = undefined;
        toast.success("Mapping removed");
      }

      // Update local state
      setAdminMappings(prev => prev.map(org => {
        if (org.organizationId !== organizationId) return org;
        return {
          ...org,
          mapping: newValue && newClassification ? {
            id: newMappingId || "",
            budgetClassificationId: newValue,
            budgetClassification: newClassification,
          } : null,
        };
      }));

      cancelEditing();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // Finance Type Mappings handlers
  // ============================================================================

  const startFinanceTypeEditing = (ft: FinanceTypeMapping) => {
    setEditingCell({
      type: "financeType",
      financeTypeCode: ft.financeTypeCode,
      financeTypeName: ft.financeTypeName,
      currentValue: ft.mapping?.budgetClassificationId || "",
      mappingId: ft.mapping?.id,
    });
    setEditValue(ft.mapping?.budgetClassificationId || "");
    setComboboxSearch("");
    setComboboxOpen(true);
  };

  const saveFinanceTypeCell = async (directValue?: string) => {
    if (!editingCell || editingCell.type !== "financeType") return;

    const { financeTypeCode, financeTypeName, currentValue, mappingId } = editingCell;
    const valueToSave = directValue !== undefined ? directValue : editValue;
    const newValue = valueToSave === "__none__" ? "" : valueToSave;

    if (newValue === currentValue) {
      cancelEditing();
      return;
    }

    setSaving(true);
    const newClassification = newValue ? classifications.find(c => c.id === newValue) : undefined;

    try {
      let newMappingId: string | undefined = mappingId;

      if (newValue && !mappingId) {
        const response = await fetch("/api/admin/finance-type-mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            financeTypeCode,
            financeTypeName,
            budgetClassificationId: newValue,
            classificationType: activeMode,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        const result = await response.json();
        newMappingId = result.data?.id;
        toast.success("Mapping created");
      } else if (newValue && mappingId) {
        const response = await fetch(`/api/admin/finance-type-mappings/${mappingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgetClassificationId: newValue }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        toast.success("Mapping updated");
      } else if (!newValue && mappingId) {
        const response = await fetch(`/api/admin/finance-type-mappings/${mappingId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error);
        }
        newMappingId = undefined;
        toast.success("Mapping removed");
      }

      // Update local state
      setFinanceTypeMappings(prev => prev.map(ft => {
        if (ft.financeTypeCode !== financeTypeCode) return ft;
        return {
          ...ft,
          mapping: newValue && newClassification ? {
            id: newMappingId || "",
            budgetClassificationId: newValue,
            budgetClassification: newClassification,
          } : null,
        };
      }));

      cancelEditing();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // Filtered data
  // ============================================================================

  const filteredSectorCategories = useMemo(() => {
    if (!searchQuery) return dacCategories;
    const query = searchQuery.toLowerCase();
    return dacCategories
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
  }, [dacCategories, searchQuery]);

  // Get unique organization types for filter
  const uniqueOrgTypes = useMemo(() => {
    const types = new Set<string>();
    orgMappings.forEach((org) => {
      if (org.orgTypeName) {
        types.add(org.orgTypeName);
      }
    });
    return Array.from(types).sort();
  }, [orgMappings]);

  const filteredOrgMappings = useMemo(() => {
    let filtered = orgMappings;

    // Apply org type filter
    if (orgTypeFilter !== "all") {
      filtered = filtered.filter((org) => org.orgTypeName === orgTypeFilter);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (org) =>
          org.organizationName.toLowerCase().includes(query) ||
          org.acronym?.toLowerCase().includes(query) ||
          org.iatiOrgId?.toLowerCase().includes(query) ||
          org.orgTypeName?.toLowerCase().includes(query) ||
          org.mapping?.budgetClassification?.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orgMappings, searchQuery, orgTypeFilter]);

  const filteredAdminMappings = useMemo(() => {
    if (!searchQuery) return adminMappings;
    const query = searchQuery.toLowerCase();
    return adminMappings.filter(
      (org) =>
        org.organizationName.toLowerCase().includes(query) ||
        org.acronym?.toLowerCase().includes(query) ||
        org.iatiOrgId?.toLowerCase().includes(query) ||
        org.orgTypeName?.toLowerCase().includes(query) ||
        org.mapping?.budgetClassification?.name.toLowerCase().includes(query)
    );
  }, [adminMappings, searchQuery]);

  const filteredFinanceTypeMappings = useMemo(() => {
    if (!searchQuery) return financeTypeMappings;
    const query = searchQuery.toLowerCase();
    return financeTypeMappings.filter(
      (ft) =>
        ft.financeTypeCode.includes(query) ||
        ft.financeTypeName.toLowerCase().includes(query) ||
        ft.group.toLowerCase().includes(query)
    );
  }, [financeTypeMappings, searchQuery]);

  // Group finance types by their group
  const groupedFinanceTypes = useMemo(() => {
    const groups: Record<string, FinanceTypeMapping[]> = {};
    filteredFinanceTypeMappings.forEach((ft) => {
      if (!groups[ft.group]) groups[ft.group] = [];
      groups[ft.group].push(ft);
    });
    return groups;
  }, [filteredFinanceTypeMappings]);

  // ============================================================================
  // Render classification selector
  // ============================================================================

  const renderClassificationSelector = (
    options: BudgetClassification[],
    onSelect: (value: string) => void
  ) => {
    const searchLower = comboboxSearch.toLowerCase();
    const filteredOptions = options.filter(
      (c) =>
        !comboboxSearch ||
        c.code.toLowerCase().includes(searchLower) ||
        c.name.toLowerCase().includes(searchLower)
    );

    return (
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger>
          <div className="flex items-center justify-between min-h-[32px] px-2 py-1 text-xs border rounded-md bg-background hover:bg-accent cursor-pointer min-w-[300px] max-w-[400px]">
            {editValue ? (
              <span className="text-left">
                {(() => {
                  const sel = options.find((c) => c.id === editValue);
                  return sel ? (
                    <span className="inline">
                      <span className="font-mono bg-muted px-1 py-0.5 rounded">{sel.code}</span>
                      <span className="ml-1">{sel.name}</span>
                    </span>
                  ) : (
                    "Select..."
                  );
                })()}
              </span>
            ) : (
              <span className="text-muted-foreground">Select classification...</span>
            )}
            <ChevronsUpDown className="h-3 w-3 ml-2 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" side="bottom" sideOffset={4} className="w-[450px] p-0 z-[9999]" avoidCollisions={true} collisionPadding={20}>
          <Command>
            <CommandInput
              placeholder="Search by code or name..."
              value={comboboxSearch}
              onChange={(e) => setComboboxSearch(e.target.value)}
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No classification found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  className="flex items-center justify-start text-left"
                  onSelect={() => {
                    setComboboxOpen(false);
                    setComboboxSearch("");
                    onSelect("");
                  }}
                >
                  <Check className="mr-2 h-4 w-4 flex-shrink-0 opacity-0" />
                  <span className="text-muted-foreground">None (remove mapping)</span>
                </CommandItem>
              </CommandGroup>
              <CommandGroup>
                {filteredOptions.map((c) => (
                  <CommandItem
                    key={c.id}
                    className="flex items-start justify-start text-left py-2"
                    onSelect={() => {
                      setComboboxOpen(false);
                      setComboboxSearch("");
                      onSelect(c.id);
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 flex-shrink-0 mt-0.5 ${
                        editValue === c.id ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs shrink-0">{c.code}</span>
                    <span className="ml-2 text-sm whitespace-normal">{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  // ============================================================================
  // Render sector cell
  // ============================================================================

  const renderSectorCell = (
    sectorCode: string,
    sectorName: string,
    isCategory: boolean,
    classificationType: ClassificationType
  ) => {
    const isEditing =
      editingCell?.type === "sector" &&
      editingCell?.sectorCode === sectorCode &&
      editingCell?.classificationType === classificationType;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          {renderClassificationSelector(
            classificationsByType[classificationType] || [],
            saveSectorCell
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={cancelEditing}
            disabled={saving}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-red-600" />
          </Button>
        </div>
      );
    }

    const mapping = sectorMappings[sectorCode]?.mappings[classificationType];
    const inherited = !isCategory ? getInheritedMapping(sectorCode)?.mappings[classificationType] : null;
    const display = mapping?.budgetClassification || inherited?.budgetClassification;
    const isInherited = !mapping && !!inherited;

    return (
      <button
        className={`w-full text-left px-2 py-1 rounded min-h-[32px] ${
          isLocked ? "cursor-default" : "hover:bg-muted/50"
        } ${isInherited ? "text-muted-foreground italic" : ""} ${!display ? "text-muted-foreground/50" : ""}`}
        onClick={() => !isLocked && startSectorEditing(sectorCode, sectorName, isCategory, classificationType)}
        disabled={isLocked}
      >
        {display ? (
          <div className="text-xs">
            <span className="font-mono bg-muted px-1 py-0.5 rounded">{display.code}</span>
            <span className="ml-1.5">{display.name}</span>
            {isInherited && <span className="ml-1 text-[10px]">(inherited)</span>}
          </div>
        ) : (
          <span className="text-xs">—</span>
        )}
      </button>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading && classifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Mappings
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Mappings
        </CardTitle>
        <CardDescription>
          Map DAC sectors, organizations, and finance types to budget classifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as MappingMode)} className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-[950px]">
            <TabsTrigger value="sectors" className="flex items-center gap-1">
              <Map className="h-4 w-4" />
              Sectors and Functions
            </TabsTrigger>
            <TabsTrigger value="administrative" className="flex items-center gap-1">
              <Landmark className="h-4 w-4" />
              Line Ministries
            </TabsTrigger>
            <TabsTrigger value="funding_sources" className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              Funding Sources
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="liabilities" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              Liabilities
            </TabsTrigger>
          </TabsList>

          {/* Search and Controls */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  activeMode === "sectors"
                    ? "Search sectors..."
                    : activeMode === "administrative" || activeMode === "funding_sources"
                    ? "Search organizations..."
                    : "Search finance types..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {activeMode !== "funding_sources" && activeMode !== "administrative" && (
              <>
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </>
            )}
            <Button
              variant={isLocked ? "outline" : "default"}
              size="sm"
              onClick={() => setIsLocked(!isLocked)}
              className={isLocked ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}
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
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Sectors Tab */}
          <TabsContent value="sectors" className="mt-0">
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 shadow-sm">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[280px]">DAC Sector</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Country Sectors</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Line Ministries</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Functional - National</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Functional - COFOG</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Economic</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">Programme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSectorCategories.map((category) => {
                      const isExpanded = expandedCategories.has(category.code);
                      return (
                        <React.Fragment key={category.code}>
                          <tr className="border-b bg-muted/30 hover:bg-muted/50">
                            <td className="p-4 font-medium">
                              <button
                                className="flex items-center gap-2 w-full text-left"
                                onClick={() => toggleCategory(category.code)}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{category.code}</span>
                                <span className="truncate">{category.name}</span>
                              </button>
                            </td>
                            <td className="p-4">{renderSectorCell(category.code, category.name, true, "country_sector")}</td>
                            <td className="p-4">{renderSectorCell(category.code, category.name, true, "administrative")}</td>
                            <td className="p-4">{renderSectorCell(category.code, category.name, true, "functional")}</td>
                            <td className="p-4">{renderSectorCell(category.code, category.name, true, "functional_cofog")}</td>
                            <td className="p-4">{renderSectorCell(category.code, category.name, true, "economic")}</td>
                            <td className="p-4">{renderSectorCell(category.code, category.name, true, "programme")}</td>
                          </tr>
                          {isExpanded &&
                            category.sectors.map((sector) => (
                              <tr key={sector.code} className="border-b hover:bg-muted/20">
                                <td className="p-4 pl-10">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{sector.code}</span>
                                    <span className="text-sm truncate">{sector.name}</span>
                                  </div>
                                </td>
                                <td className="p-4">{renderSectorCell(sector.code, sector.name, false, "country_sector")}</td>
                                <td className="p-4">{renderSectorCell(sector.code, sector.name, false, "administrative")}</td>
                                <td className="p-4">{renderSectorCell(sector.code, sector.name, false, "functional")}</td>
                                <td className="p-4">{renderSectorCell(sector.code, sector.name, false, "functional_cofog")}</td>
                                <td className="p-4">{renderSectorCell(sector.code, sector.name, false, "economic")}</td>
                                <td className="p-4">{renderSectorCell(sector.code, sector.name, false, "programme")}</td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Administrative Tab */}
          <TabsContent value="administrative" className="mt-0">
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 shadow-sm">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[350px]">Organization (Receiver)</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[200px]">Organization Type</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">Line Ministry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdminMappings.map((org) => {
                      const isEditing =
                        editingCell?.type === "admin" &&
                        editingCell?.organizationId === org.organizationId;

                      return (
                        <tr key={org.organizationId} className="border-b hover:bg-muted/20">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {org.acronym && (
                                  <span className="text-muted-foreground mr-1">({org.acronym})</span>
                                )}
                                {org.organizationName}
                              </span>
                              {org.iatiOrgId && (
                                <span className="text-xs text-muted-foreground">{org.iatiOrgId}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground">
                              {org.orgTypeName || "—"}
                            </span>
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                {renderClassificationSelector(
                                  classificationsByType.administrative || [],
                                  saveAdminCell
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={cancelEditing}
                                  disabled={saving}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className={`w-full text-left px-2 py-1 rounded min-h-[32px] ${
                                  isLocked ? "cursor-default" : "hover:bg-muted/50"
                                } ${!org.mapping ? "text-muted-foreground/50" : ""}`}
                                onClick={() => !isLocked && startAdminEditing(org)}
                                disabled={isLocked}
                              >
                                {org.mapping?.budgetClassification ? (
                                  <div className="text-xs">
                                    <span className="font-mono bg-muted px-1 py-0.5 rounded">
                                      {org.mapping.budgetClassification.code}
                                    </span>
                                    <span className="ml-1.5">{org.mapping.budgetClassification.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs">—</span>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {filteredAdminMappings.length} receiver organizations
            </div>
          </TabsContent>

          {/* Funding Sources Tab */}
          <TabsContent value="funding_sources" className="mt-0">
            {/* Organization Type Filter */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Organization Type:</label>
              <Select value={orgTypeFilter} onValueChange={setOrgTypeFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueOrgTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 shadow-sm">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[350px]">Organization</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[200px]">Organization Type</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">Funding Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrgMappings.map((org) => {
                      const isEditing =
                        editingCell?.type === "org" &&
                        editingCell?.organizationId === org.organizationId;

                      return (
                        <tr key={org.organizationId} className="border-b hover:bg-muted/20">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {org.acronym && (
                                  <span className="text-muted-foreground mr-1">({org.acronym})</span>
                                )}
                                {org.organizationName}
                              </span>
                              {org.iatiOrgId && (
                                <span className="text-xs text-muted-foreground">{org.iatiOrgId}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground">
                              {org.orgTypeName || "—"}
                            </span>
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                {renderClassificationSelector(
                                  classificationsByType.funding_sources || [],
                                  saveOrgCell
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={cancelEditing}
                                  disabled={saving}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className={`w-full text-left px-2 py-1 rounded min-h-[32px] ${
                                  isLocked ? "cursor-default" : "hover:bg-muted/50"
                                } ${!org.mapping ? "text-muted-foreground/50" : ""}`}
                                onClick={() => !isLocked && startOrgEditing(org)}
                                disabled={isLocked}
                              >
                                {org.mapping?.budgetClassification ? (
                                  <div className="text-xs">
                                    <span className="font-mono bg-muted px-1 py-0.5 rounded">
                                      {org.mapping.budgetClassification.code}
                                    </span>
                                    <span className="ml-1.5">{org.mapping.budgetClassification.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs">—</span>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {filteredOrgMappings.length} organizations
              {orgTypeFilter !== "all" && ` (filtered by ${orgTypeFilter})`}
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="mt-0">
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 shadow-sm">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[400px]">Finance Type</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">Revenue Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedFinanceTypes).map(([group, types]) => {
                      const isExpanded = expandedCategories.has(group);
                      return (
                        <React.Fragment key={group}>
                          <tr className="border-b bg-muted/30">
                            <td colSpan={2} className="p-4 font-medium">
                              <button
                                className="flex items-center gap-2 w-full text-left"
                                onClick={() => toggleCategory(group)}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span>{group}</span>
                                <span className="text-xs text-muted-foreground">({types.length})</span>
                              </button>
                            </td>
                          </tr>
                          {isExpanded &&
                            types.map((ft) => {
                              const isEditing =
                                editingCell?.type === "financeType" &&
                                editingCell?.financeTypeCode === ft.financeTypeCode;

                              return (
                                <tr key={ft.financeTypeCode} className="border-b hover:bg-muted/20">
                                  <td className="p-4 pl-10">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {ft.financeTypeCode}
                                      </span>
                                      <span className="text-sm">{ft.financeTypeName}</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        {renderClassificationSelector(
                                          classificationsByType.revenue || [],
                                          saveFinanceTypeCell
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          onClick={cancelEditing}
                                          disabled={saving}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <button
                                        className={`w-full text-left px-2 py-1 rounded min-h-[32px] ${
                                          isLocked ? "cursor-default" : "hover:bg-muted/50"
                                        } ${!ft.mapping ? "text-muted-foreground/50" : ""}`}
                                        onClick={() => !isLocked && startFinanceTypeEditing(ft)}
                                        disabled={isLocked}
                                      >
                                        {ft.mapping?.budgetClassification ? (
                                          <div className="text-xs">
                                            <span className="font-mono bg-muted px-1 py-0.5 rounded">
                                              {ft.mapping.budgetClassification.code}
                                            </span>
                                            <span className="ml-1.5">{ft.mapping.budgetClassification.name}</span>
                                          </div>
                                        ) : (
                                          <span className="text-xs">—</span>
                                        )}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Liabilities Tab */}
          <TabsContent value="liabilities" className="mt-0">
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 shadow-sm">
                    <tr className="border-b-2">
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground w-[400px]">Finance Type</th>
                      <th className="h-12 px-4 py-3 text-left font-medium text-muted-foreground">Liabilities Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedFinanceTypes).map(([group, types]) => {
                      const isExpanded = expandedCategories.has(group);
                      return (
                        <React.Fragment key={group}>
                          <tr className="border-b bg-muted/30">
                            <td colSpan={2} className="p-4 font-medium">
                              <button
                                className="flex items-center gap-2 w-full text-left"
                                onClick={() => toggleCategory(group)}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span>{group}</span>
                                <span className="text-xs text-muted-foreground">({types.length})</span>
                              </button>
                            </td>
                          </tr>
                          {isExpanded &&
                            types.map((ft) => {
                              const isEditing =
                                editingCell?.type === "financeType" &&
                                editingCell?.financeTypeCode === ft.financeTypeCode;

                              return (
                                <tr key={ft.financeTypeCode} className="border-b hover:bg-muted/20">
                                  <td className="p-4 pl-10">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {ft.financeTypeCode}
                                      </span>
                                      <span className="text-sm">{ft.financeTypeName}</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        {renderClassificationSelector(
                                          classificationsByType.liabilities || [],
                                          saveFinanceTypeCell
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0"
                                          onClick={cancelEditing}
                                          disabled={saving}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <button
                                        className={`w-full text-left px-2 py-1 rounded min-h-[32px] ${
                                          isLocked ? "cursor-default" : "hover:bg-muted/50"
                                        } ${!ft.mapping ? "text-muted-foreground/50" : ""}`}
                                        onClick={() => !isLocked && startFinanceTypeEditing(ft)}
                                        disabled={isLocked}
                                      >
                                        {ft.mapping?.budgetClassification ? (
                                          <div className="text-xs">
                                            <span className="font-mono bg-muted px-1 py-0.5 rounded">
                                              {ft.mapping.budgetClassification.code}
                                            </span>
                                            <span className="ml-1.5">{ft.mapping.budgetClassification.name}</span>
                                          </div>
                                        ) : (
                                          <span className="text-xs">—</span>
                                        )}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
          <span>{isLocked ? "Unlock to edit mappings" : "Click any cell to edit"}</span>
          {activeMode === "sectors" && <span className="italic">Italic = inherited from category</span>}
          <span>— = no mapping</span>
        </div>
      </CardContent>
    </Card>
  );
}
