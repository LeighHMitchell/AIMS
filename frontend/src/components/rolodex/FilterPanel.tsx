import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  X,
  Building2,
  FileText,
  ChevronDown,
  Briefcase,
  Layers
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
  const [activities, setActivities] = useState<Array<{ id: string; title: string }>>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);

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
        const orgResponse = await apiFetch('/api/organizations');
        if (orgResponse.ok) {
          const orgs = await orgResponse.json();
          setOrganizations(orgs.slice(0, 100)); // Limit for performance
        }

        // Fetch activities
        const actResponse = await apiFetch('/api/activities');
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

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border border-slate-200 space-y-3">
      {/* Filter Row with Labels */}
      <div className="flex items-end gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
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
          <label className="block text-xs font-medium text-slate-500 mb-1">Contact Type</label>
          <Popover open={openPopover === 'type'} onOpenChange={(open) => setOpenPopover(open ? 'type' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2">
                  {filters.source ? (
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        filters.source === 'user'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {filters.source === 'user' ? 'User' : 'Activity'}
                    </Badge>
                  ) : (
                    <span className="text-slate-500">Select...</span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1">
                <Button
                  variant={filters.source === 'user' ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { onFiltersChange({ source: 'user' }); setOpenPopover(null); }}
                >
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                    User
                  </Badge>
                  <span className="ml-2 text-slate-600">System users</span>
                </Button>
                <Button
                  variant={filters.source === 'activity_contact' ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { onFiltersChange({ source: 'activity_contact' }); setOpenPopover(null); }}
                >
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                    Activity
                  </Badge>
                  <span className="ml-2 text-slate-600">Activity contacts</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Role Filter */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
          <Popover open={openPopover === 'role'} onOpenChange={(open) => setOpenPopover(open ? 'role' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{filters.role || 'Select...'}</span>
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {/* System Roles */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 px-2">SYSTEM ROLES</div>
                  {getRolesByCategory(ROLE_CATEGORIES.SYSTEM).map((role) => (
                    <Button
                      key={role.key}
                      variant={filters.role === role.label ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { onFiltersChange({ role: role.label }); setOpenPopover(null); }}
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
                {/* Organization Roles */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 px-2">ORGANIZATION ROLES</div>
                  {getRolesByCategory(ROLE_CATEGORIES.ORGANIZATION).map((role) => (
                    <Button
                      key={role.key}
                      variant={filters.role === role.label ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { onFiltersChange({ role: role.label }); setOpenPopover(null); }}
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
                {/* Activity Roles */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1 px-2">ACTIVITY ROLES</div>
                  {getRolesByCategory(ROLE_CATEGORIES.ACTIVITY).map((role) => (
                    <Button
                      key={role.key}
                      variant={filters.role === role.label ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { onFiltersChange({ role: role.label }); setOpenPopover(null); }}
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Organization Filter */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Organization</label>
          <Popover open={openPopover === 'org'} onOpenChange={(open) => setOpenPopover(open ? 'org' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">
                    {filters.organization
                      ? organizations.find(o => o.id === filters.organization)?.acronym ||
                        organizations.find(o => o.id === filters.organization)?.name?.substring(0, 20) ||
                        'Selected'
                      : 'Select...'}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-2" align="start">
              <div className="max-h-64 overflow-y-auto space-y-1">
                {organizations.map((org) => (
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
                        <div className="h-6 w-6 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-3 w-3 text-slate-500" />
                        </div>
                      )}
                      <span className="truncate flex-1 text-left">{org.name}</span>
                      {org.acronym && (
                        <span className="text-xs text-slate-500 flex-shrink-0">({org.acronym})</span>
                      )}
                    </span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Org Type Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Org Type</label>
          <Popover open={openPopover === 'orgType'} onOpenChange={(open) => setOpenPopover(open ? 'orgType' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="truncate">{filters.orgType ? ORG_TYPE_LABELS[filters.orgType]?.label : 'Select...'}</span>
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="space-y-1">
                {getOrgTypeCategories().map((orgType) => (
                  <Button
                    key={orgType.key}
                    variant={filters.orgType === orgType.key ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => { onFiltersChange({ orgType: orgType.key }); setOpenPopover(null); }}
                  >
                    <span className="flex items-center gap-2">
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">{orgType.key}</code>
                      <span>{orgType.label}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Activity Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Activity</label>
          <Popover open={openPopover === 'activity'} onOpenChange={(open) => setOpenPopover(open ? 'activity' : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-9 px-3 justify-between">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="truncate">
                    {filters.activity
                      ? activities.find(a => a.id === filters.activity)?.title?.substring(0, 25) || 'Selected'
                      : 'Select...'}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-2" align="start">
              <div className="max-h-64 overflow-y-auto space-y-1">
                {activities.map((activity) => (
                  <Button
                    key={activity.id}
                    variant={filters.activity === activity.id ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-auto py-2 text-left"
                    onClick={() => { onFiltersChange({ activity: activity.id }); setOpenPopover(null); }}
                  >
                    {activity.title}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-transparent mb-1">Clear</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-slate-500 hover:text-slate-800 h-9 px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-slate-500">
        {loading ? (
          <LoadingText>Loading...</LoadingText>
        ) : (
          `Showing ${totalCount} ${totalCount === 1 ? 'person' : 'people'}`
        )}
      </div>

      {/* Active Filters Display - compact badges */}
    </div>
  );
}