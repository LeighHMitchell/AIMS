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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Book,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  ChevronDown,
  Link2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import dacSectorsData from "@/data/dac-sectors.json";
import { apiFetch } from '@/lib/api-fetch';

// ============================================================================
// Types
// ============================================================================

type VocabularyType = "sector" | "finance_type" | "aid_type" | "flow_type" | "project" | "programme" | "other";

const VOCABULARY_TYPE_OPTIONS: { value: VocabularyType; label: string; description: string }[] = [
  { value: "sector", label: "Sector", description: "Country-specific sector codes (appears in Sectors and Functions)" },
  { value: "finance_type", label: "Finance Type", description: "Country-specific finance type codes" },
  { value: "aid_type", label: "Aid Type", description: "Country-specific aid type codes" },
  { value: "flow_type", label: "Flow Type", description: "Country-specific flow type codes" },
  { value: "project", label: "Project", description: "Country project identification codes" },
  { value: "programme", label: "Programme", description: "Country programme identification codes" },
  { value: "other", label: "Other", description: "Other custom vocabulary types" },
];

interface CountrySectorVocabulary {
  id: string;
  code: string;
  name: string;
  description?: string;
  country_code?: string;
  version?: string;
  vocabulary_type?: VocabularyType;
  vocabulary_uri?: string;
  is_active: boolean;
  is_default: boolean;
  sector_count?: number;
  created_at: string;
}

interface CountrySector {
  id: string;
  vocabulary_id: string;
  code: string;
  name: string;
  description?: string;
  parent_code?: string;
  level: number;
  sort_order: number;
  is_active: boolean;
  dac_mappings?: DacMapping[];
}

interface DacMapping {
  id: string;
  country_sector_id: string;
  dac_sector_code: string;
  dac_sector_name?: string;
  percentage: number;
  is_primary: boolean;
  notes?: string;
}

interface DacSector {
  code: string;
  name: string;
  category: string;
  categoryName: string;
}

// ============================================================================
// Helpers
// ============================================================================

function parseDacSectors(): DacSector[] {
  const sectors: DacSector[] = [];

  for (const [categoryKey, categorySectors] of Object.entries(dacSectorsData)) {
    const match = categoryKey.match(/^(\d{3})\s*-\s*(.+)$/);
    if (match) {
      const categoryCode = match[1];
      const categoryName = match[2];

      (categorySectors as any[]).forEach((s) => {
        sectors.push({
          code: s.code,
          name: s.name.replace(/^\d+\s*-\s*/, ""),
          category: categoryCode,
          categoryName,
        });
      });
    }
  }

  return sectors.sort((a, b) => a.code.localeCompare(b.code));
}

// ============================================================================
// Main Component
// ============================================================================

export function CountrySectorVocabularyManagement() {
  // State
  const [vocabularies, setVocabularies] = useState<CountrySectorVocabulary[]>([]);
  const [selectedVocabulary, setSelectedVocabulary] = useState<CountrySectorVocabulary | null>(null);
  const [sectors, setSectors] = useState<CountrySector[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

  // Dialog state
  const [vocabularyDialogOpen, setVocabularyDialogOpen] = useState(false);
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVocabulary, setEditingVocabulary] = useState<CountrySectorVocabulary | null>(null);
  const [editingSector, setEditingSector] = useState<CountrySector | null>(null);
  const [mappingSector, setMappingSector] = useState<CountrySector | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: "vocabulary" | "sector"; item: any } | null>(null);

  // Form state
  const [vocabForm, setVocabForm] = useState({ code: "", name: "", description: "", countryCode: "", version: "", vocabularyType: "sector" as VocabularyType, vocabularyUri: "", isDefault: false });
  const [sectorForm, setSectorForm] = useState({ code: "", name: "", description: "", parentCode: "", level: 1 });
  const [selectedDacSectors, setSelectedDacSectors] = useState<{ code: string; name: string; percentage: number }[]>([]);
  const [dacSearchQuery, setDacSearchQuery] = useState("");

  // DAC sectors data
  const dacSectors = useMemo(() => parseDacSectors(), []);

  // Filtered DAC sectors based on search
  const filteredDacSectors = useMemo(() => {
    if (!dacSearchQuery.trim()) return dacSectors;
    const query = dacSearchQuery.toLowerCase();
    return dacSectors.filter(
      (d) =>
        d.code.toLowerCase().includes(query) ||
        d.name.toLowerCase().includes(query) ||
        d.categoryName.toLowerCase().includes(query)
    );
  }, [dacSectors, dacSearchQuery]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchVocabularies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/api/admin/country-sector-vocabularies?includeStats=true");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setVocabularies(data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load vocabularies");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSectors = useCallback(async (vocabularyId: string) => {
    try {
      setSectorsLoading(true);
      const response = await apiFetch(`/api/admin/country-sectors?vocabularyId=${vocabularyId}&includeMappings=true`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSectors(data.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load sectors");
    } finally {
      setSectorsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVocabularies();
  }, [fetchVocabularies]);

  useEffect(() => {
    if (selectedVocabulary) {
      fetchSectors(selectedVocabulary.id);
    } else {
      setSectors([]);
    }
  }, [selectedVocabulary, fetchSectors]);

  // ============================================================================
  // Vocabulary Handlers
  // ============================================================================

  const openNewVocabularyDialog = () => {
    setEditingVocabulary(null);
    setVocabForm({ code: "", name: "", description: "", countryCode: "", version: "", vocabularyType: "sector", vocabularyUri: "", isDefault: false });
    setVocabularyDialogOpen(true);
  };

  const openEditVocabularyDialog = (vocab: CountrySectorVocabulary) => {
    setEditingVocabulary(vocab);
    setVocabForm({
      code: vocab.code,
      name: vocab.name,
      description: vocab.description || "",
      countryCode: vocab.country_code || "",
      version: vocab.version || "",
      vocabularyType: vocab.vocabulary_type || "sector",
      vocabularyUri: vocab.vocabulary_uri || "",
      isDefault: vocab.is_default,
    });
    setVocabularyDialogOpen(true);
  };

  const saveVocabulary = async () => {
    if (!vocabForm.code || !vocabForm.name) {
      toast.error("Code and name are required");
      return;
    }

    try {
      const url = editingVocabulary
        ? `/api/admin/country-sector-vocabularies/${editingVocabulary.id}`
        : "/api/admin/country-sector-vocabularies";

      const response = await fetch(url, {
        method: editingVocabulary ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vocabForm),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(editingVocabulary ? "Vocabulary updated" : "Vocabulary created");
      setVocabularyDialogOpen(false);
      fetchVocabularies();

      if (editingVocabulary && selectedVocabulary?.id === editingVocabulary.id) {
        setSelectedVocabulary(data.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save vocabulary");
    }
  };

  const deleteVocabulary = async () => {
    if (!deletingItem || deletingItem.type !== "vocabulary") return;

    try {
      const response = await apiFetch(`/api/admin/country-sector-vocabularies/${deletingItem.item.id}?force=true`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("Vocabulary deleted");
      setDeleteDialogOpen(false);
      setDeletingItem(null);

      if (selectedVocabulary?.id === deletingItem.item.id) {
        setSelectedVocabulary(null);
      }
      fetchVocabularies();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete vocabulary");
    }
  };

  // ============================================================================
  // Sector Handlers
  // ============================================================================

  const openNewSectorDialog = () => {
    setEditingSector(null);
    setSectorForm({ code: "", name: "", description: "", parentCode: "", level: 1 });
    setSectorDialogOpen(true);
  };

  const openEditSectorDialog = (sector: CountrySector) => {
    setEditingSector(sector);
    setSectorForm({
      code: sector.code,
      name: sector.name,
      description: sector.description || "",
      parentCode: sector.parent_code || "",
      level: sector.level,
    });
    setSectorDialogOpen(true);
  };

  const saveSector = async () => {
    if (!sectorForm.code || !sectorForm.name || !selectedVocabulary) {
      toast.error("Code and name are required");
      return;
    }

    try {
      const url = editingSector
        ? `/api/admin/country-sectors/${editingSector.id}`
        : "/api/admin/country-sectors";

      const payload = editingSector
        ? sectorForm
        : { ...sectorForm, vocabularyId: selectedVocabulary.id };

      const response = await fetch(url, {
        method: editingSector ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(editingSector ? "Sector updated" : "Sector created");
      setSectorDialogOpen(false);
      fetchSectors(selectedVocabulary.id);
      fetchVocabularies(); // Update sector counts
    } catch (err: any) {
      toast.error(err.message || "Failed to save sector");
    }
  };

  const deleteSector = async () => {
    if (!deletingItem || deletingItem.type !== "sector" || !selectedVocabulary) return;

    try {
      const response = await apiFetch(`/api/admin/country-sectors/${deletingItem.item.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("Sector deleted");
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchSectors(selectedVocabulary.id);
      fetchVocabularies(); // Update sector counts
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sector");
    }
  };

  // ============================================================================
  // Mapping Handlers
  // ============================================================================

  const openMappingDialog = (sector: CountrySector) => {
    setMappingSector(sector);
    setDacSearchQuery(""); // Reset search when opening
    setSelectedDacSectors(
      (sector.dac_mappings || []).map((m) => ({
        code: m.dac_sector_code,
        name: m.dac_sector_name || dacSectors.find((d) => d.code === m.dac_sector_code)?.name || "",
        percentage: m.percentage,
      }))
    );
    setMappingDialogOpen(true);
  };

  const addDacMapping = (dacSector: DacSector) => {
    if (selectedDacSectors.find((s) => s.code === dacSector.code)) {
      toast.error("This DAC sector is already added");
      return;
    }

    // Calculate new percentage (split evenly)
    const newCount = selectedDacSectors.length + 1;
    const newPercentage = Math.floor(100 / newCount);
    const remainder = 100 - newPercentage * newCount;

    const updated = selectedDacSectors.map((s, i) => ({
      ...s,
      percentage: newPercentage + (i === 0 ? remainder : 0),
    }));

    setSelectedDacSectors([...updated, { code: dacSector.code, name: dacSector.name, percentage: newPercentage }]);
  };

  const removeDacMapping = (code: string) => {
    const filtered = selectedDacSectors.filter((s) => s.code !== code);

    if (filtered.length > 0) {
      // Redistribute percentages
      const newPercentage = Math.floor(100 / filtered.length);
      const remainder = 100 - newPercentage * filtered.length;

      const updated = filtered.map((s, i) => ({
        ...s,
        percentage: newPercentage + (i === 0 ? remainder : 0),
      }));
      setSelectedDacSectors(updated);
    } else {
      setSelectedDacSectors([]);
    }
  };

  const updateDacMappingPercentage = (code: string, percentage: number) => {
    setSelectedDacSectors((prev) =>
      prev.map((s) => (s.code === code ? { ...s, percentage } : s))
    );
  };

  const saveMappings = async () => {
    if (!mappingSector || !selectedVocabulary) return;

    // Validate percentages
    const total = selectedDacSectors.reduce((sum, s) => sum + s.percentage, 0);
    if (selectedDacSectors.length > 0 && Math.abs(total - 100) > 0.01) {
      toast.error(`Percentages must sum to 100% (currently ${total}%)`);
      return;
    }

    try {
      const response = await apiFetch("/api/admin/country-sector-dac-mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countrySectorId: mappingSector.id,
          mappings: selectedDacSectors.map((s) => ({
            dacSectorCode: s.code,
            dacSectorName: s.name,
            percentage: s.percentage,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("DAC mappings saved");
      setMappingDialogOpen(false);
      fetchSectors(selectedVocabulary.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to save mappings");
    }
  };

  // ============================================================================
  // Filtered Data
  // ============================================================================

  const filteredSectors = useMemo(() => {
    if (!searchQuery) return sectors;
    const query = searchQuery.toLowerCase();
    return sectors.filter(
      (s) =>
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.dac_mappings?.some(
          (m) =>
            m.dac_sector_code.includes(query) ||
            m.dac_sector_name?.toLowerCase().includes(query)
        )
    );
  }, [sectors, searchQuery]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Country Sector Vocabularies
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
          <Book className="h-5 w-5" />
          Country Sector Vocabularies
        </CardTitle>
        <CardDescription>
          Create custom sector classifications and map them to OECD DAC sectors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Vocabulary Selection */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium mb-2 block">Select Vocabulary</Label>
            <Select
              value={selectedVocabulary?.id || ""}
              onValueChange={(id) => {
                const vocab = vocabularies.find((v) => v.id === id);
                setSelectedVocabulary(vocab || null);
                setSearchQuery("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a vocabulary to manage..." />
              </SelectTrigger>
              <SelectContent>
                {vocabularies.map((vocab) => (
                  <SelectItem key={vocab.id} value={vocab.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                        {vocab.code}
                      </span>
                      <span>{vocab.name}</span>
                      {vocab.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        ({vocab.sector_count || 0} sectors)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-6">
            <Button variant="outline" size="sm" onClick={openNewVocabularyDialog}>
              <Plus className="h-4 w-4 mr-1" />
              New Vocabulary
            </Button>
            {selectedVocabulary && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditVocabularyDialog(selectedVocabulary)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    setDeletingItem({ type: "vocabulary", item: selectedVocabulary });
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Sectors Section */}
        {selectedVocabulary && (
          <div className="border rounded-lg">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-medium">
                  Sectors in {selectedVocabulary.name}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sectors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[250px]"
                  />
                </div>
              </div>
              <Button size="sm" onClick={openNewSectorDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Add Sector
              </Button>
            </div>

            <div className="max-h-[500px] overflow-auto">
              {sectorsLoading ? (
                <div className="p-8 text-center">
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : filteredSectors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery
                    ? "No sectors match your search"
                    : "No sectors yet. Click 'Add Sector' to create one."}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 border-b">
                    <tr>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[200px]">
                        Code
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[350px]">
                        DAC Mappings
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground w-[100px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSectors.map((sector) => (
                      <tr key={sector.id} className="border-b hover:bg-muted/20">
                        <td className="p-4">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {sector.code}
                          </span>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{sector.name}</div>
                            {sector.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {sector.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {sector.dac_mappings && sector.dac_mappings.length > 0 ? (
                            <div className="space-y-1">
                              {sector.dac_mappings.map((m) => (
                                <div key={m.dac_sector_code} className="flex items-center gap-2">
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                                    {m.dac_sector_code}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                    {m.dac_sector_name || dacSectors.find(d => d.code === m.dac_sector_code)?.name || ""}
                                  </span>
                                  {sector.dac_mappings!.length > 1 && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      ({m.percentage}%)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">
                              Not mapped
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openMappingDialog(sector)}
                              title="Map to DAC sectors"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditSectorDialog(sector)}
                              title="Edit sector"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setDeletingItem({ type: "sector", item: sector });
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete sector"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Vocabulary Dialog */}
        <Dialog open={vocabularyDialogOpen} onOpenChange={setVocabularyDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingVocabulary ? "Edit Vocabulary" : "Create Vocabulary"}
              </DialogTitle>
              <DialogDescription>
                Define a country-specific vocabulary for classification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Vocabulary Type - most important field */}
              <div className="space-y-2">
                <Label htmlFor="vocab-type">Vocabulary Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Select
                  value={vocabForm.vocabularyType}
                  onValueChange={(value) => setVocabForm({ ...vocabForm, vocabularyType: value as VocabularyType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vocabulary type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOCABULARY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {vocabForm.vocabularyType === "sector" && (
                  <p className="text-xs text-muted-foreground">
                    Sector vocabularies appear in the "Country Sectors" column of the Mappings table
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vocab-code">Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                  <Input
                    id="vocab-code"
                    placeholder="e.g., TNG"
                    value={vocabForm.code}
                    onChange={(e) =>
                      setVocabForm({ ...vocabForm, code: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vocab-country">Country Code</Label>
                  <Input
                    id="vocab-country"
                    placeholder="e.g., TO"
                    maxLength={2}
                    value={vocabForm.countryCode}
                    onChange={(e) =>
                      setVocabForm({ ...vocabForm, countryCode: e.target.value.toUpperCase() })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vocab-name">Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Input
                  id="vocab-name"
                  placeholder="e.g., Tonga National Sector Classification"
                  value={vocabForm.name}
                  onChange={(e) => setVocabForm({ ...vocabForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vocab-desc">Description</Label>
                <Textarea
                  id="vocab-desc"
                  placeholder="Optional description..."
                  value={vocabForm.description}
                  onChange={(e) => setVocabForm({ ...vocabForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vocab-uri">Vocabulary URI (for IATI export)</Label>
                <Input
                  id="vocab-uri"
                  placeholder="e.g., https://example.gov/classifications/sectors"
                  value={vocabForm.vocabularyUri}
                  onChange={(e) => setVocabForm({ ...vocabForm, vocabularyUri: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Required for IATI compliance when using vocabulary codes 98 or 99
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vocab-version">Version</Label>
                  <Input
                    id="vocab-version"
                    placeholder="e.g., 2024.1"
                    value={vocabForm.version}
                    onChange={(e) => setVocabForm({ ...vocabForm, version: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="vocab-default"
                    checked={vocabForm.isDefault}
                    onCheckedChange={(checked) =>
                      setVocabForm({ ...vocabForm, isDefault: checked })
                    }
                  />
                  <Label htmlFor="vocab-default">Set as default for this type</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVocabularyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveVocabulary}>
                {editingVocabulary ? "Save Changes" : "Create Vocabulary"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sector Dialog */}
        <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSector ? "Edit Sector" : "Add Sector"}</DialogTitle>
              <DialogDescription>
                Define a sector within {selectedVocabulary?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sector-code">Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                  <Input
                    id="sector-code"
                    placeholder="e.g., AGR-01"
                    value={sectorForm.code}
                    onChange={(e) => setSectorForm({ ...sectorForm, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sector-level">Level</Label>
                  <Select
                    value={sectorForm.level.toString()}
                    onValueChange={(v) => setSectorForm({ ...sectorForm, level: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Category (Level 1)</SelectItem>
                      <SelectItem value="2">Sub-sector (Level 2)</SelectItem>
                      <SelectItem value="3">Detail (Level 3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector-name">Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                <Input
                  id="sector-name"
                  placeholder="e.g., Agricultural Development"
                  value={sectorForm.name}
                  onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector-desc">Description</Label>
                <Textarea
                  id="sector-desc"
                  placeholder="Optional description..."
                  value={sectorForm.description}
                  onChange={(e) => setSectorForm({ ...sectorForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector-parent">Parent Code</Label>
                <Input
                  id="sector-parent"
                  placeholder="e.g., AGR (for hierarchical structures)"
                  value={sectorForm.parentCode}
                  onChange={(e) => setSectorForm({ ...sectorForm, parentCode: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSectorDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveSector}>
                {editingSector ? "Save Changes" : "Add Sector"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DAC Mapping Dialog */}
        <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Map to DAC Sectors</DialogTitle>
              <DialogDescription>
                Link "{mappingSector?.name}" to OECD DAC sector(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Current mappings */}
              {selectedDacSectors.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Mappings</Label>
                  <div className="space-y-2">
                    {selectedDacSectors.map((s) => (
                      <div
                        key={s.code}
                        className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
                      >
                        <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border">
                          {s.code}
                        </span>
                        <span className="flex-1 text-sm">{s.name}</span>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={s.percentage}
                          onChange={(e) =>
                            updateDacMappingPercentage(s.code, parseInt(e.target.value) || 0)
                          }
                          className="w-20 h-8 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600"
                          onClick={() => removeDacMapping(s.code)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground text-right">
                      Total: {selectedDacSectors.reduce((sum, s) => sum + s.percentage, 0)}%
                      {selectedDacSectors.length > 0 &&
                        Math.abs(
                          selectedDacSectors.reduce((sum, s) => sum + s.percentage, 0) - 100
                        ) > 0.01 && (
                          <span className="text-red-600 ml-2">(must equal 100%)</span>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* DAC sector selector - inline searchable list */}
              <div className="space-y-2">
                <Label>Add DAC Sector</Label>
                <div className="border rounded-md">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by code or name..."
                        className="pl-10"
                        value={dacSearchQuery}
                        onChange={(e) => setDacSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-auto">
                    {filteredDacSectors.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No DAC sectors found
                      </div>
                    ) : (
                      filteredDacSectors.slice(0, 50).map((dac) => {
                        const isSelected = selectedDacSectors.find((s) => s.code === dac.code);
                        return (
                          <div
                            key={dac.code}
                            className={`flex items-start gap-2 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${
                              isSelected ? "bg-green-50" : ""
                            }`}
                            onClick={() => !isSelected && addDacMapping(dac)}
                          >
                            <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded shrink-0">
                              {dac.code}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">{dac.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {dac.categoryName}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-green-600 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                    {filteredDacSectors.length > 50 && (
                      <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">
                        Showing 50 of {filteredDacSectors.length} results. Type to filter.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveMappings}>Save Mappings</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingItem?.type === "vocabulary"
                  ? `This will permanently delete the vocabulary "${deletingItem.item.name}" and all its sectors.`
                  : `This will permanently delete the sector "${deletingItem?.item.name}" and its DAC mappings.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingItem(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={deletingItem?.type === "vocabulary" ? deleteVocabulary : deleteSector}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
