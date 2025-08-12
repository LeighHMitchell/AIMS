import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  Users, 
  Building2, 
  FileText,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { RolodexFilters } from '@/app/api/rolodex/route';
import { COUNTRY_NAMES, getAllRoles, SOURCE_LABELS, getContactTypeCategories, CONTACT_TYPE_CATEGORIES, ROLE_CATEGORIES, getRolesByCategory } from './utils/roleLabels';

interface FilterPanelProps {
  filters: RolodexFilters;
  onFiltersChange: (filters: Partial<RolodexFilters>) => void;
  onClearFilters: () => void;
  loading?: boolean;
  totalCount?: number;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  loading = false,
  totalCount = 0
}: FilterPanelProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [activities, setActivities] = useState<Array<{ id: string; title: string }>>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ search: localSearch || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, filters.search, onFiltersChange]);

  // Fetch organizations and activities for dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Fetch organizations
        const orgResponse = await fetch('/api/organizations');
        if (orgResponse.ok) {
          const orgs = await orgResponse.json();
          setOrganizations(orgs.slice(0, 100)); // Limit for performance
        }

        // Fetch activities
        const actResponse = await fetch('/api/activities');
        if (actResponse.ok) {
          const acts = await actResponse.json();
          setActivities(acts.slice(0, 100)); // Limit for performance
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchOptions();
  }, []);

  const activeFilterCount = Object.values(filters).filter(value => 
    value !== undefined && value !== null && value !== ''
  ).length - 2; // Subtract page and limit

  const roles = getAllRoles();
  const countries = Object.entries(COUNTRY_NAMES).map(([code, name]) => ({ code, name }));

  const clearFilter = (key: keyof RolodexFilters) => {
    onFiltersChange({ [key]: undefined });
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border border-slate-200 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or email..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-10 pr-4"
          disabled={loading}
        />
        {localSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setLocalSearch('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        {/* Contact Type Filter */}
        <Popover>
          <PopoverTrigger className="min-w-[180px] justify-between border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {filters.source ? SOURCE_LABELS[filters.source]?.label || 'Contact Type' : 'All Contact Types'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <div className="font-medium text-sm">Filter by Contact Type</div>
              <div className="space-y-2">
                <Button
                  variant={!filters.source ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    console.log('[FilterPanel] All Contact Types clicked');
                    onFiltersChange({ source: undefined });
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span>🌐</span>
                    <div className="text-left">
                      <div className="font-medium">All Contact Types</div>
                      <div className="text-xs text-slate-500">Show all users and contacts</div>
                    </div>
                  </span>
                </Button>
                
                {getContactTypeCategories().map((category) => {
                  const sourceKey = category.key === 'system_users' ? 'user' : 
                                   category.key === 'activity_contacts' ? 'activity_contact' :
                                   'organization_contact';
                  const isSelected = filters.source === sourceKey;
                  
                  return (
                    <Button
                      key={category.key}
                      variant={isSelected ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        console.log('[FilterPanel] Contact type clicked:', sourceKey);
                        onFiltersChange({ source: sourceKey });
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <div className="text-left">
                          <div className="font-medium">{category.label}</div>
                          <div className="text-xs text-slate-500">{category.description}</div>
                        </div>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Role Filter */}
        <Popover>
          <PopoverTrigger className="min-w-[140px] justify-between border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {filters.role ? `Role: ${filters.role}` : 'Any Role'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <div className="font-medium text-sm">Filter by Role</div>
              <Input
                placeholder="Search roles..."
                value={filters.role || ''}
                onChange={(e) => onFiltersChange({ role: e.target.value || undefined })}
              />
              <div className="max-h-64 overflow-y-auto space-y-3">
                <Button
                  variant={!filters.role ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    console.log('[FilterPanel] All Roles clicked');
                    onFiltersChange({ role: undefined });
                  }}
                >
                  All Roles
                </Button>
                
                {/* System Roles */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">SYSTEM ROLES</div>
                  <div className="space-y-1">
                    {getRolesByCategory(ROLE_CATEGORIES.SYSTEM).map((role) => (
                      <Button
                        key={role.key}
                        variant={filters.role === role.label ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => onFiltersChange({ role: role.label })}
                      >
                        <Badge variant="secondary" className="mr-2 text-xs">
                          {role.label}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Organization Roles */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">ORGANIZATION ROLES</div>
                  <div className="space-y-1">
                    {getRolesByCategory(ROLE_CATEGORIES.ORGANIZATION).map((role) => (
                      <Button
                        key={role.key}
                        variant={filters.role === role.label ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => onFiltersChange({ role: role.label })}
                      >
                        <Badge variant="secondary" className="mr-2 text-xs">
                          {role.label}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Activity Roles */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">ACTIVITY ROLES</div>
                  <div className="space-y-1">
                    {getRolesByCategory(ROLE_CATEGORIES.ACTIVITY).map((role) => (
                      <Button
                        key={role.key}
                        variant={filters.role === role.label ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => onFiltersChange({ role: role.label })}
                      >
                        <Badge variant="secondary" className="mr-2 text-xs">
                          {role.label}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Organization Filter */}
        <Popover>
          <PopoverTrigger className="min-w-[160px] justify-between border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {filters.organization ? 'Organization Set' : 'Any Organization'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-2">
              <div className="font-medium text-sm">Filter by Organization</div>
              <Input
                placeholder="Search organizations..."
                value={filters.organization || ''}
                onChange={(e) => onFiltersChange({ organization: e.target.value || undefined })}
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    console.log('[FilterPanel] All Organizations clicked');
                    onFiltersChange({ organization: undefined });
                  }}
                >
                  All Organizations
                </Button>
                {organizations.map((org) => (
                  <Button
                    key={org.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onFiltersChange({ organization: org.name })}
                  >
                    <span className="truncate">{org.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Country Filter */}
        <Select
          value={filters.country || 'all'}
          onValueChange={(value) => onFiltersChange({ country: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-[140px]">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.slice(0, 20).map(({ code, name }) => (
              <SelectItem key={code} value={code}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-slate-600 hover:text-slate-800"
          >
            <X className="h-4 w-4 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{filters.search}"
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => {
                  setLocalSearch('');
                  clearFilter('search');
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.source && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Source: {SOURCE_LABELS[filters.source]?.label || filters.source}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => clearFilter('source')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.role && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Role: {filters.role}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => clearFilter('role')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.organization && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Org: {filters.organization}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => clearFilter('organization')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.country && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Country: {COUNTRY_NAMES[filters.country] || filters.country}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => clearFilter('country')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-slate-500">
        {loading ? (
          'Loading...'
        ) : (
          `Showing ${totalCount} ${totalCount === 1 ? 'person' : 'people'}`
        )}
      </div>
    </div>
  );
}