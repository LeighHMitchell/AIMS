"use client"

import { useState, useEffect, useMemo } from "react";
import { getSortIcon, sortableHeaderClasses } from "@/components/ui/table";
import { renderMoney } from "./formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Save,
  Building2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { EditableCell } from "./EditableCell";
import { apiFetch } from '@/lib/api-fetch';

type Organization = {
  id: string;
  name: string;
  acronym?: string;
  iati_org_id?: string;
  type?: string;
  country_represented?: string;
  default_currency?: string;
  totalBudget?: number;
  recipientOrgBudget?: number;
  website?: string;
  [key: string]: any;
};


export function DataClinicOrganizations() {
  const { user } = useUser();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<string>>(new Set());
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [sortField, setSortField] = useState<'name' | 'acronym' | 'identifier' | 'type' | 'country' | 'currency' | 'budget'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOrganizations = useMemo(() => {
    const budget = (o: Organization) => o.totalBudget || o.recipientOrgBudget || 0;
    return [...filteredOrganizations].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '') * dir;
        case 'acronym':
          return (a.acronym || '').localeCompare(b.acronym || '') * dir;
        case 'identifier':
          return (a.iati_org_id || '').localeCompare(b.iati_org_id || '') * dir;
        case 'type':
          return (a.type || '').localeCompare(b.type || '') * dir;
        case 'country':
          return (a.country_represented || '').localeCompare(b.country_represented || '') * dir;
        case 'currency':
          return (a.default_currency || '').localeCompare(b.default_currency || '') * dir;
        case 'budget':
          return (budget(a) - budget(b)) * dir;
        default:
          return 0;
      }
    });
  }, [filteredOrganizations, sortField, sortDirection]);

  const isSuperUser = user?.role === 'super_user';

  useEffect(() => {
    fetchOrganizationsWithGaps();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [organizations, selectedFilter, searchQuery]);

  const fetchOrganizationsWithGaps = async () => {
    try {
      const res = await apiFetch('/api/data-clinic/organizations?missing_fields=true');
      if (!res.ok) throw new Error('Failed to fetch organizations');
      
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organisations');
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = [...organizations];

    // Apply field filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(organization => {
        switch (selectedFilter) {
          case 'missing_identifier':
            return !organization.iati_org_id || !isValidIdentifier(organization.iati_org_id);
          case 'missing_type':
            return !organization.type;
          case 'missing_currency':
            return !organization.default_currency;
          case 'missing_budget':
            return !organization.totalBudget && !organization.recipientOrgBudget;
          case 'missing_country':
            return !organization.country_represented;
          case 'missing_acronym':
            return !organization.acronym;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(organization => 
        organization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        organization.acronym?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        organization.iati_org_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOrganizations(filtered);
  };

  const isValidIdentifier = (identifier: string): boolean => {
    if (!identifier || typeof identifier !== 'string') return false;

    // IATI organization identifier rules:
    // 1. Format: {RegistrationAgency}-{RegistrationNumber}
    // 2. Must contain at least one hyphen
    // 3. Registration Agency codes are defined in the IATI codelist
    // 4. Common valid prefixes: XI-IATI-, GB-COH-, US-EIN-, NL-KVK-, etc.
    // 5. Can also be IATI activity IDs (contains multiple hyphens)

    // Must contain at least one hyphen
    if (!identifier.includes('-')) return false;

    // Split into parts
    const parts = identifier.split('-');
    if (parts.length < 2) return false;

    // First part (registration agency) should be 2-7 uppercase letters/numbers
    // Examples: XI, GB, US, NL, USAGOV
    const registrationAgency = parts[0];
    if (!/^[A-Z0-9]{2,7}$/.test(registrationAgency)) return false;

    // Second part (registration number or secondary prefix) should not be empty
    // and should contain valid characters (alphanumeric, hyphens, underscores)
    const remainingParts = parts.slice(1).join('-');
    if (!remainingParts || remainingParts.length === 0) return false;

    // Registration number can contain letters, numbers, hyphens, underscores, dots, and slashes
    // Examples: 123456, COH-12345, IATI-1234, 12.34.56, 12/34/56
    if (!/^[A-Za-z0-9\-_.\/ ]+$/.test(remainingParts)) return false;

    return true;
  };

  const saveFieldValue = async (organizationId: string, field: string, value: string) => {
    try {
      const res = await apiFetch(`/api/data-clinic/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, userId: user?.id })
      });

      if (!res.ok) throw new Error('Failed to update organization');

      // Update local state
      setOrganizations(prev => prev.map(organization =>
        organization.id === organizationId ? { ...organization, [field]: value } : organization
      ));

      toast.success('Organisation updated successfully');
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organisation');
      throw error; // Re-throw so EditableCell knows it failed
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkEditField || !bulkEditValue || selectedOrganizations.size === 0) {
      toast.error('Please select organisations and provide a field and value');
      return;
    }

    try {
      const res = await apiFetch('/api/data-clinic/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'organization',
          field: bulkEditField,
          value: bulkEditValue,
          ids: Array.from(selectedOrganizations),
          user_id: user?.id
        })
      });

      if (!res.ok) throw new Error('Failed to bulk update');

      toast.success(`Updated ${selectedOrganizations.size} organisations`);
      setSelectedOrganizations(new Set());
      setBulkEditField('');
      setBulkEditValue('');
      fetchOrganizationsWithGaps(); // Refresh data
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to bulk update organisations');
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organisations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by missing field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organisations</SelectItem>
                <SelectItem value="missing_identifier">Missing/Invalid Identifier</SelectItem>
                <SelectItem value="missing_type">Missing Organisation Type</SelectItem>
                <SelectItem value="missing_currency">Missing Default Currency</SelectItem>
                <SelectItem value="missing_budget">Missing Budget</SelectItem>
                <SelectItem value="missing_country">Missing Country</SelectItem>
                <SelectItem value="missing_acronym">Missing Acronym</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => fetchOrganizationsWithGaps()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions for Super Users */}
          {isSuperUser && selectedOrganizations.size > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-4">
                <p className="text-body font-medium">
                  {selectedOrganizations.size} organizations selected
                </p>
                <Select value={bulkEditField} onValueChange={setBulkEditField}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type">Organisation Type</SelectItem>
                    <SelectItem value="default_currency">Default Currency</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter value"
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-[200px]"
                />
                <Button onClick={handleBulkUpdate}>
                  <Save className="h-4 w-4 mr-2" />
                  Apply to Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-surface-muted">
                <tr>
                  {isSuperUser && (
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedOrganizations.size === filteredOrganizations.length && filteredOrganizations.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrganizations(new Set(filteredOrganizations.map(o => o.id)));
                          } else {
                            setSelectedOrganizations(new Set());
                          }
                        }}
                      />
                    </th>
                  )}
                  <th className={`p-4 text-left text-body font-medium ${sortableHeaderClasses}`} onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Name {getSortIcon('name', sortField, sortDirection)}</div>
                  </th>
                  <th className={`p-4 text-left text-body font-medium ${sortableHeaderClasses}`} onClick={() => handleSort('acronym')}>
                    <div className="flex items-center gap-1">Acronym {getSortIcon('acronym', sortField, sortDirection)}</div>
                  </th>
                  <th className={`p-4 text-left text-body font-medium ${sortableHeaderClasses}`} onClick={() => handleSort('identifier')}>
                    <div className="flex items-center gap-1">Identifier {getSortIcon('identifier', sortField, sortDirection)}</div>
                  </th>
                  <th className={`p-4 text-left text-body font-medium ${sortableHeaderClasses}`} onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">Type {getSortIcon('type', sortField, sortDirection)}</div>
                  </th>
                  <th className={`p-4 text-left text-body font-medium ${sortableHeaderClasses}`} onClick={() => handleSort('country')}>
                    <div className="flex items-center gap-1">Location Represented {getSortIcon('country', sortField, sortDirection)}</div>
                  </th>
                  <th className={`p-4 text-left text-body font-medium ${sortableHeaderClasses}`} onClick={() => handleSort('currency')}>
                    <div className="flex items-center gap-1">Currency {getSortIcon('currency', sortField, sortDirection)}</div>
                  </th>
                  <th className={`p-4 text-left text-body font-medium ${sortableHeaderClasses}`} onClick={() => handleSort('budget')}>
                    <div className="flex items-center gap-1">Budget {getSortIcon('budget', sortField, sortDirection)}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperUser ? 8 : 7} className="p-8 text-center text-muted-foreground">
                      No organizations found with data gaps
                    </td>
                  </tr>
                ) : (
                  sortedOrganizations.map((organization) => (
                    <tr key={organization.id} className="border-b hover:bg-muted/50">
                      {isSuperUser && (
                        <td className="p-4">
                          <Checkbox
                            checked={selectedOrganizations.has(organization.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedOrganizations);
                              if (checked) {
                                newSelected.add(organization.id);
                              } else {
                                newSelected.delete(organization.id);
                              }
                              setSelectedOrganizations(newSelected);
                            }}
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div className="max-w-xs">
                          <Building2 className="inline-block h-4 w-4 text-muted-foreground align-middle mr-2" />
                          <Link
                            href={`/organizations/${organization.id}`}
                            className="font-medium break-words hover:opacity-70 transition-opacity"
                          >
                            {organization.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-4">
                        <EditableCell
                          organizationId={organization.id}
                          field="acronym"
                          value={organization.acronym}
                          onSave={saveFieldValue}
                          isEditable={isSuperUser}
                        />
                      </td>
                      <td className="p-4">
                        <EditableCell
                          organizationId={organization.id}
                          field="iati_org_id"
                          value={organization.iati_org_id}
                          onSave={saveFieldValue}
                          isEditable={isSuperUser}
                          isValidIdentifier={isValidIdentifier}
                        />
                      </td>
                      <td className="p-4">
                        <EditableCell
                          organizationId={organization.id}
                          field="type"
                          value={organization.type}
                          onSave={saveFieldValue}
                          isEditable={isSuperUser}
                        />
                      </td>
                      <td className="p-4">
                        <EditableCell
                          organizationId={organization.id}
                          field="country_represented"
                          value={organization.country_represented}
                          onSave={saveFieldValue}
                          isEditable={isSuperUser}
                        />
                      </td>
                      <td className="p-4">
                        <EditableCell
                          organizationId={organization.id}
                          field="default_currency"
                          value={organization.default_currency}
                          onSave={saveFieldValue}
                          isEditable={isSuperUser}
                        />
                      </td>
                      <td className="p-4">
                        {organization.totalBudget || organization.recipientOrgBudget ? (
                          <span className="text-body">
                            {renderMoney(
                              (organization.totalBudget || organization.recipientOrgBudget)!,
                              organization.default_currency,
                            )}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-helper border border-red-500 text-red-600 bg-transparent">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 