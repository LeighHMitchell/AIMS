import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  X,
  Building2,
  ChevronDown
} from 'lucide-react';
import { RolodexFilters } from '@/app/api/rolodex/route';
import { ROLE_CATEGORIES, getRolesByCategory, getOrgTypeCategories, ORG_TYPE_LABELS } from './utils/roleLabels';
import { LoadingText } from '@/components/ui/loading-text';
import { apiFetch } from '@/lib/api-fetch';

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
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym?: string; logo?: string }>>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const orgSearchRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ search: localSearch || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, filters.search, onFiltersChange]);

  // Fetch organizations with debounced search
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setOrgSearchLoading(true);
        const searchParam = orgSearch ? `?search=${encodeURIComponent(orgSearch)}` : '';
        const orgResponse = await apiFetch(`/api/organizations${searchParam}`);
        if (orgResponse.ok) {
          const orgs = await orgResponse.json();
          setOrganizations(orgs.slice(0, 50)); // Limit display for performance
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setOrgSearchLoading(false);
      }
    };

    const timer = setTimeout(fetchOrganizations, 300);
    return () => clearTimeout(timer);
  }, [orgSearch]);

  return (
    <div className="bg-surface-muted py-2 px-3 rounded-lg border border-border space-y-3 mb-4">
      {/* Filter Row with Labels */}
      <div className="flex items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-helper font-medium text-muted-foreground mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name or email..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 pr-8 h-9"
              disabled={loading}
            />
            {localSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0"
                onClick={() => setLocalSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Contact Type Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-helper font-medium text-muted-foreground mb-1">Contact Type</label>
          <Popover open={openPopover === 'type'} onOpenChange={(open) => setOpenPopover(open ? 'type' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2 truncate">
                  {filters.source ? (
                    <span className="flex items-center gap-1.5 truncate">
                      <code className="font-mono text-xs bg-muted text-muted-foreground px-1 py-0.5 rounded">{filters.source === 'user' ? '1' : '2'}</code>
                      <span>{filters.source === 'user' ? 'User Contact' : 'Activity Contact'}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All contact types</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  {filters.source && (
                    <X
                      className="h-3 w-3 text-muted-foreground hover:text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); onFiltersChange({ source: undefined }); }}
                    />
                  )}
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <Button
                  variant={filters.source === 'user' ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { onFiltersChange({ source: 'user' }); setOpenPopover(null); }}
                >
                  <code className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">1</code>
                  User Contact
                </Button>
                <Button
                  variant={filters.source === 'activity_contact' ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { onFiltersChange({ source: 'activity_contact' }); setOpenPopover(null); }}
                >
                  <code className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">2</code>
                  Activity Contact
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Role Filter */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-helper font-medium text-muted-foreground mb-1">Role</label>
          <Popover open={openPopover === 'role'} onOpenChange={(open) => setOpenPopover(open ? 'role' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2 truncate">
                  {filters.role ? (
                    <span className="flex items-center gap-1.5 truncate">
                      {(() => {
                        const idx = getRolesByCategory(ROLE_CATEGORIES.SYSTEM).findIndex(r => r.label === filters.role);
                        return idx >= 0 ? (
                          <code className="font-mono text-xs bg-muted text-muted-foreground px-1 py-0.5 rounded">{idx + 1}</code>
                        ) : null;
                      })()}
                      <span className="truncate">{filters.role}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All roles</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  {filters.role && (
                    <X
                      className="h-3 w-3 text-muted-foreground hover:text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); onFiltersChange({ role: undefined }); }}
                    />
                  )}
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="max-h-64 overflow-y-auto space-y-1">
                {getRolesByCategory(ROLE_CATEGORIES.SYSTEM).map((role, index) => (
                  <Button
                    key={role.key}
                    variant={filters.role === role.label ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => { onFiltersChange({ role: role.label }); setOpenPopover(null); }}
                  >
                    <code className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">{index + 1}</code>
                    {role.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Organization Filter */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-helper font-medium text-muted-foreground mb-1">Organisation</label>
          <Popover open={openPopover === 'org'} onOpenChange={(open) => {
            setOpenPopover(open ? 'org' : null);
            if (open) {
              setTimeout(() => orgSearchRef.current?.focus(), 0);
            } else {
              setOrgSearch('');
            }
          }}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="truncate">
                  {filters.organization
                    ? (() => {
                        const org = organizations.find(o => o.id === filters.organization);
                        return org ? `${org.name}${org.acronym ? ` ${org.acronym}` : ''}`.substring(0, 25) : 'Selected';
                      })()
                    : 'All organisations'}
                </span>
                <span className="flex items-center gap-1">
                  {filters.organization && (
                    <X
                      className="h-3 w-3 text-muted-foreground hover:text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); onFiltersChange({ organization: undefined }); }}
                    />
                  )}
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-2" align="start">
              <div className="pb-2">
                <Input
                  ref={orgSearchRef}
                  placeholder="Search organisations..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {orgSearchLoading ? (
                  <div className="text-body text-muted-foreground p-2">Searching...</div>
                ) : organizations.length === 0 ? (
                  <div className="text-body text-muted-foreground p-2">No organisations found</div>
                ) : organizations.map((org) => (
                  <Button
                    key={org.id}
                    variant={filters.organization === org.id ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-auto py-2"
                    onClick={() => { onFiltersChange({ organization: org.id }); setOpenPopover(null); }}
                  >
                    <span className="flex items-center gap-3 w-full">
                      {org.logo ? (
                        <img src={org.logo} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="flex-1 text-left whitespace-normal">
                        {org.name}{org.acronym ? ` ${org.acronym}` : ''}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Organisation Type Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-helper font-medium text-muted-foreground mb-1">Organisation Type</label>
          <Popover open={openPopover === 'orgType'} onOpenChange={(open) => setOpenPopover(open ? 'orgType' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2 truncate">
                  {filters.orgType ? (
                    <span className="flex items-center gap-1.5 truncate">
                      <code className="font-mono text-xs bg-muted text-muted-foreground px-1 py-0.5 rounded">{filters.orgType}</code>
                      <span>{ORG_TYPE_LABELS[filters.orgType]?.label}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All types</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  {filters.orgType && (
                    <X
                      className="h-3 w-3 text-muted-foreground hover:text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); onFiltersChange({ orgType: undefined }); }}
                    />
                  )}
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
              <div className="max-h-64 overflow-y-auto space-y-1">
                {getOrgTypeCategories().map((orgType) => (
                  <Button
                    key={orgType.key}
                    variant={filters.orgType === orgType.key ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => { onFiltersChange({ orgType: orgType.key }); setOpenPopover(null); }}
                  >
                    <code className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded mr-2">{orgType.key}</code>
                    {orgType.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

      </div>

      {/* Results Count */}
      <div className="text-body text-muted-foreground">
        {loading ? (
          <LoadingText>Loading...</LoadingText>
        ) : (
          `Showing ${totalCount} ${totalCount === 1 ? 'contact' : 'contacts'}`
        )}
      </div>

      {/* Active Filters Display - compact badges */}
    </div>
  );
}
