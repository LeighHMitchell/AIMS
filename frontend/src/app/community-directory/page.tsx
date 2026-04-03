"use client"

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  UsersRound,
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "left_country", label: "Left Country" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  left_country: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

interface CommunityContact {
  id: string;
  name: string;
  title: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  secondary_email: string | null;
  phone: string | null;
  position: string | null;
  job_title: string | null;
  department: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_acronym: string | null;
  organization_type: string | null;
  profile_photo: string | null;
  sector_focus: string[];
  geographic_focus: string[];
  expertise_areas: string[];
  contact_frequency: string | null;
  ministry_affiliation: string | null;
  status: string;
  created_at: string;
}

type ViewMode = "card" | "table";

export default function CommunityDirectoryPage() {
  const [contacts, setContacts] = useState<CommunityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expertiseFilter, setExpertiseFilter] = useState<string>("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sectorFilter) params.set("sector", sectorFilter);
      if (regionFilter) params.set("region", regionFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (expertiseFilter) params.set("expertise", expertiseFilter);

      const res = await apiFetch(`/api/community-directory?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch community directory");
      const data = await res.json();

      setContacts(data.contacts || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err: any) {
      console.error("[CommunityDirectory] Error:", err);
      toast.error("Failed to load community directory");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, sectorFilter, regionFilter, statusFilter, expertiseFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Reset page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearch, sectorFilter, regionFilter, statusFilter, expertiseFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setSectorFilter("");
    setRegionFilter("");
    setStatusFilter("");
    setExpertiseFilter("");
  };

  const hasActiveFilters = debouncedSearch || sectorFilter || regionFilter || statusFilter || expertiseFilter;

  const getInitials = (contact: CommunityContact) => {
    const first = contact.first_name?.[0] || "";
    const last = contact.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <UsersRound className="h-6 w-6" />
                Community Directory
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pagination.total > 0
                  ? `${pagination.total} community contacts across sectors and organizations.`
                  : "Browse and connect with community contacts across the aid coordination landscape."}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
                    placeholder="Search contacts by name, email, organization..."
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
                <Input
                  type="text"
                  placeholder="Sector focus..."
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="w-[160px]"
                />

                <Input
                  type="text"
                  placeholder="Region..."
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-[160px]"
                />

                <Input
                  type="text"
                  placeholder="Expertise..."
                  value={expertiseFilter}
                  onChange={(e) => setExpertiseFilter(e.target.value)}
                  className="w-[160px]"
                />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No community contacts found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters or search query."
                  : "No community contacts have been added to the directory yet."}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 space-y-3">
                  {/* Avatar + Name */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {contact.profile_photo ? (
                        <img
                          src={contact.profile_photo}
                          alt={contact.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-primary">{getInitials(contact)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.position || contact.job_title || ""}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] ${STATUS_COLORS[contact.status] || STATUS_COLORS.active}`}
                      variant="secondary"
                    >
                      {contact.status === "left_country" ? "Left" : contact.status}
                    </Badge>
                  </div>

                  {/* Organization */}
                  {(contact.organization_name || contact.organization_acronym) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {contact.organization_acronym || contact.organization_name}
                      </span>
                    </div>
                  )}

                  {/* Sector Focus */}
                  {contact.sector_focus.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {contact.sector_focus.slice(0, 3).map((sector, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                          {sector}
                        </Badge>
                      ))}
                      {contact.sector_focus.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{contact.sector_focus.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Geographic Focus */}
                  {contact.geographic_focus.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.geographic_focus.join(", ")}</span>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="flex items-center gap-3 pt-1 border-t">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[140px]">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>{contact.phone}</span>
                      </a>
                    )}
                  </div>
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
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Position</th>
                    <th className="text-left py-3 px-4 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 font-medium">Sectors</th>
                    <th className="text-left py-3 px-4 font-medium">Regions</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-semibold text-primary">{getInitials(contact)}</span>
                          </div>
                          <span className="font-medium">{contact.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {contact.position || contact.job_title || "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {contact.organization_acronym || contact.organization_name || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.sector_focus.slice(0, 2).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                          {contact.sector_focus.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{contact.sector_focus.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {contact.geographic_focus.join(", ") || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="text-xs text-primary hover:underline">
                            {contact.email}
                          </a>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{contact.phone || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`text-[10px] ${STATUS_COLORS[contact.status] || STATUS_COLORS.active}`}
                          variant="secondary"
                        >
                          {contact.status === "left_country" ? "Left" : contact.status}
                        </Badge>
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
