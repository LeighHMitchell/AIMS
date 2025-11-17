"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  AlertCircle, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Edit2,
  Save,
  X,
  Building2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUser } from "@/hooks/useUser";

// Organization Type mappings
const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  '10': 'Government',
  '11': 'Local Government',
  '15': 'Other Public Sector',
  '21': 'International NGO',
  '22': 'National NGO',
  '23': 'Regional NGO',
  '30': 'Public Private Partnership',
  '40': 'Multilateral',
  '60': 'Foundation',
  '70': 'Private Sector',
  '80': 'Academic, Training and Research',
  '90': 'Other'
};

type Organization = {
  id: string;
  name: string;
  acronym?: string;
  iati_org_id?: string;
  type?: string;
  country?: string;
  default_currency?: string;
  totalBudget?: number;
  recipientOrgBudget?: number;
  website?: string;
  [key: string]: any;
};

type DataGap = {
  field: string;
  label: string;
  count: number;
};

export function DataClinicOrganizations() {
  const { user } = useUser();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrganizations, setSelectedOrganizations] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ organizationId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [dataGaps, setDataGaps] = useState<DataGap[]>([]);

  const isSuperUser = user?.role === 'super_user';

  useEffect(() => {
    fetchOrganizationsWithGaps();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [organizations, selectedFilter, searchQuery]);

  const fetchOrganizationsWithGaps = async () => {
    try {
      const res = await fetch('/api/data-clinic/organizations?missing_fields=true');
      if (!res.ok) throw new Error('Failed to fetch organizations');
      
      const data = await res.json();
      setOrganizations(data.organizations || []);
      setDataGaps(data.dataGaps || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
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
            return !organization.country;
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
      const res = await fetch(`/api/data-clinic/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, userId: user?.id })
      });

      if (!res.ok) throw new Error('Failed to update organization');

      // Update local state
      setOrganizations(prev => prev.map(organization =>
        organization.id === organizationId ? { ...organization, [field]: value } : organization
      ));

      toast.success('Organization updated successfully');
      setEditingField(null);
      setEditingValue('');
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    }
  };

  const handleInlineEditBlur = (organizationId: string, field: string) => {
    if (editingValue !== undefined && editingValue !== null) {
      saveFieldValue(organizationId, field, editingValue);
    }
  };

  const handleInlineEditKeyDown = (e: React.KeyboardEvent, organizationId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveFieldValue(organizationId, field, editingValue);
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditingValue('');
    }
  };

  const startEditing = (organizationId: string, field: string, currentValue: string) => {
    setEditingField({ organizationId, field });
    setEditingValue(currentValue || '');
  };

  const handleBulkUpdate = async () => {
    if (!bulkEditField || !bulkEditValue || selectedOrganizations.size === 0) {
      toast.error('Please select organizations and provide a field and value');
      return;
    }

    try {
      const res = await fetch('/api/data-clinic/bulk-update', {
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

      toast.success(`Updated ${selectedOrganizations.size} organizations`);
      setSelectedOrganizations(new Set());
      setBulkEditField('');
      setBulkEditValue('');
      fetchOrganizationsWithGaps(); // Refresh data
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to bulk update organizations');
    }
  };

  const renderFieldValue = (organization: Organization, field: string) => {
    const value = organization[field];
    
    if (editingField?.organizationId === organization.id && editingField?.field === field) {
      switch (field) {
        case 'type':
          return (
            <div className="flex items-center gap-2">
              <Select
                value={value || ''}
                onValueChange={(newValue) => saveFieldValue(organization.id, field, newValue)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORGANIZATION_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingField(null);
                  setEditingValue('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'default_currency':
          return (
            <div className="flex items-center gap-2">
              <Select
                value={value || ''}
                onValueChange={(newValue) => saveFieldValue(organization.id, field, newValue)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingField(null);
                  setEditingValue('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => handleInlineEditBlur(organization.id, field)}
                onKeyDown={(e) => handleInlineEditKeyDown(e, organization.id, field)}
                className="w-48"
                placeholder={
                  field === 'iati_org_id' ? 'XX-123456' :
                  field === 'country' ? 'e.g., United States, Africa' :
                  'Enter value'
                }
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingField(null);
                  setEditingValue('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
      }
    }

    // Display value with edit button for super users
    return (
      <div className="flex items-center gap-2">
        {value ? (
          <span className="text-sm">
            {field === 'type' && ORGANIZATION_TYPE_LABELS[value] ? 
              ORGANIZATION_TYPE_LABELS[value] : 
              field === 'iati_org_id' && !isValidIdentifier(value) ? (
                <div className="flex items-center gap-2">
                  <span className="text-orange-600">{value}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">Invalid IATI Organization Identifier</p>
                          <p>Required format: AGENCY-REGISTRATION</p>
                          <p className="text-gray-400">Examples:</p>
                          <p className="text-gray-400">• XI-IATI-1234</p>
                          <p className="text-gray-400">• GB-COH-123456</p>
                          <p className="text-gray-400">• US-EIN-12-3456789</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) :
              value
            }
          </span>
        ) : (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        )}
        {isSuperUser && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => startEditing(organization.id, field, value || '')}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
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
      {/* Data Gaps Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Data Gaps Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {dataGaps.map((gap) => (
              <div
                key={gap.field}
                className="p-4 rounded-lg border cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedFilter(gap.field)}
              >
                <p className="text-sm text-muted-foreground">{gap.label}</p>
                <p className="text-2xl font-semibold">{gap.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
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
                <SelectItem value="all">All Organizations</SelectItem>
                <SelectItem value="missing_identifier">Missing/Invalid Identifier</SelectItem>
                <SelectItem value="missing_type">Missing Organization Type</SelectItem>
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
                <p className="text-sm font-medium">
                  {selectedOrganizations.size} organizations selected
                </p>
                <Select value={bulkEditField} onValueChange={setBulkEditField}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type">Organization Type</SelectItem>
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
              <thead className="border-b bg-gray-50">
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
                  <th className="p-4 text-left text-sm font-medium">Name</th>
                  <th className="p-4 text-left text-sm font-medium">Acronym</th>
                  <th className="p-4 text-left text-sm font-medium">Identifier</th>
                  <th className="p-4 text-left text-sm font-medium">Type</th>
                  <th className="p-4 text-left text-sm font-medium">Country/Region</th>
                  <th className="p-4 text-left text-sm font-medium">Currency</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrganizations.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperUser ? 7 : 6} className="p-8 text-center text-muted-foreground">
                      No organizations found with data gaps
                    </td>
                  </tr>
                ) : (
                  filteredOrganizations.map((organization) => (
                    <tr key={organization.id} className="border-b hover:bg-gray-50">
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium truncate max-w-xs">
                                  {organization.name}
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{organization.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="p-4">
                        {renderFieldValue(organization, 'acronym')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(organization, 'iati_org_id')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(organization, 'type')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(organization, 'country')}
                      </td>
                      <td className="p-4">
                        {renderFieldValue(organization, 'default_currency')}
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