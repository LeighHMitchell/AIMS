"use client"

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  LayoutGrid,
  TableIcon,
  FileText,
  Calendar,
  Building2,
  MapPin,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Tag,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

// Document type display config
const DOCUMENT_TYPE_OPTIONS = [
  { value: "assessment", label: "Assessment" },
  { value: "survey", label: "Survey" },
  { value: "evaluation", label: "Evaluation" },
  { value: "research", label: "Research" },
  { value: "report", label: "Report" },
  { value: "policy_brief", label: "Policy Brief" },
  { value: "case_study", label: "Case Study" },
  { value: "lessons_learned", label: "Lessons Learned" },
  { value: "guidance", label: "Guidance" },
  { value: "other", label: "Other" },
];

const TYPE_COLORS: Record<string, string> = {
  assessment: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  survey: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  evaluation: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  research: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  report: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  policy_brief: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  case_study: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  lessons_learned: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  guidance: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  other: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300",
};

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  sector_codes: string[];
  sector_names: string[];
  lead_organization_id: string | null;
  lead_organization: { id: string; name: string; acronym: string } | null;
  author_names: string[];
  geographic_scope: string | null;
  region_names: string[];
  publication_date: string | null;
  url: string | null;
  file_name: string | null;
  format: string | null;
  language: string;
  is_public: boolean;
  tags: string[];
  created_at: string;
}

type ViewMode = "card" | "table";

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState<{ total: number; byType: Record<string, number> }>({ total: 0, byType: {} });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [documentType, setDocumentType] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (documentType) params.set("document_type", documentType);
      if (region) params.set("region", region);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await apiFetch(`/api/assessments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch assessments");
      const data = await res.json();

      setAssessments(data.assessments || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
      setStats(data.stats || { total: 0, byType: {} });
    } catch (err: any) {
      console.error("[AssessmentsPage] Error:", err);
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, documentType, region, dateFrom, dateTo]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Reset page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearch, documentType, region, dateFrom, dateTo]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const getTypeLabel = (type: string) => {
    return DOCUMENT_TYPE_OPTIONS.find(t => t.value === type)?.label || type;
  };

  const handleOpenDocument = (assessment: Assessment) => {
    if (assessment.url) {
      window.open(assessment.url, "_blank");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDocumentType("");
    setRegion("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = debouncedSearch || documentType || region || dateFrom || dateTo;

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSearch className="h-6 w-6" />
            Assessment & Publication Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse assessments, surveys, evaluations, research, and publications across organizations.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="col-span-2">
            <CardContent className="py-3 px-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Documents</div>
            </CardContent>
          </Card>
          {Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([type, count]) => (
              <Card key={type}>
                <CardContent className="py-3 px-4">
                  <div className="text-lg font-semibold">{count}</div>
                  <div className="text-xs text-muted-foreground truncate">{getTypeLabel(type)}</div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Search & Filter Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-3">
              {/* Search row */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assessments by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-1 border rounded-md p-0.5">
                  <Button
                    variant={viewMode === "card" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("card")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filter row */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Document Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  placeholder="Region..."
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-[160px]"
                />

                <Input
                  type="date"
                  placeholder="From"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[150px]"
                />
                <Input
                  type="date"
                  placeholder="To"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[150px]"
                />

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assessments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No assessments found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters or search query."
                  : "No assessments or publications have been added yet."}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment) => (
              <Card
                key={assessment.id}
                className="group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOpenDocument(assessment)}
              >
                <CardContent className="py-4 space-y-3">
                  {/* Type badge + format */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={TYPE_COLORS[assessment.document_type] || TYPE_COLORS.other} variant="secondary">
                      {getTypeLabel(assessment.document_type)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {assessment.format && (
                        <Badge variant="outline" className="text-xs">
                          {assessment.format.split("/").pop()?.toUpperCase() || assessment.format}
                        </Badge>
                      )}
                      {assessment.url && (
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {assessment.title}
                  </h3>

                  {/* Organization */}
                  {assessment.lead_organization && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {assessment.lead_organization.acronym || assessment.lead_organization.name}
                      </span>
                    </div>
                  )}

                  {/* Sectors */}
                  {assessment.sector_names && assessment.sector_names.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {assessment.sector_names.slice(0, 3).map((sector, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                          {sector}
                        </Badge>
                      ))}
                      {assessment.sector_names.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{assessment.sector_names.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Regions */}
                  {assessment.region_names && assessment.region_names.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{assessment.region_names.join(", ")}</span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{formatDate(assessment.publication_date)}</span>
                  </div>

                  {/* Tags */}
                  {assessment.tags && assessment.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {assessment.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Table view */
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Title</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 font-medium">Sectors</th>
                    <th className="text-left py-3 px-4 font-medium">Regions</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Format</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleOpenDocument(assessment)}
                    >
                      <td className="py-3 px-4 max-w-[300px]">
                        <span className="font-medium line-clamp-1">{assessment.title}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={TYPE_COLORS[assessment.document_type] || TYPE_COLORS.other} variant="secondary">
                          {getTypeLabel(assessment.document_type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {assessment.lead_organization?.acronym || assessment.lead_organization?.name || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(assessment.sector_names || []).slice(0, 2).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                          {(assessment.sector_names || []).length > 2 && (
                            <span className="text-xs text-muted-foreground">+{assessment.sector_names.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {(assessment.region_names || []).join(", ") || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(assessment.publication_date)}
                      </td>
                      <td className="py-3 px-4">
                        {assessment.format ? (
                          <Badge variant="outline" className="text-[10px]">
                            {assessment.format.split("/").pop()?.toUpperCase()}
                          </Badge>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
