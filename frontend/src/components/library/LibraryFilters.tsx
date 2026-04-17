"use client"

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { FilterBar } from '@/components/ui/filter-bar';
import { FileText, Receipt, Building2, Target, BarChart3, Library, File, FileImage, FileVideo, FileSpreadsheet, FileCode } from 'lucide-react';
import { DOCUMENT_CATEGORIES } from '@/lib/iatiDocumentLink';
import type { LibraryFilters, DocumentSourceType } from '@/types/library-document';

interface LibraryFiltersPanelProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onClear: () => void;
}

// Source type options for multi-select
const SOURCE_TYPE_OPTIONS = [
  { value: 'activity', label: 'Activities' },
  { value: 'transaction', label: 'Transactions' },
  { value: 'organization', label: 'Organizations' },
  { value: 'result', label: 'Results' },
  { value: 'indicator', label: 'Indicators' },
  { value: 'standalone', label: 'Library' },
];

// Format group options for multi-select
const FORMAT_OPTIONS = [
  { value: 'application/pdf', label: 'PDF' },
  { value: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word' },
  { value: 'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv', label: 'Spreadsheets' },
  { value: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml', label: 'Images' },
  { value: 'video/mp4,video/webm', label: 'Videos' },
  { value: 'application/json,application/xml,text/xml', label: 'Data Files' },
];

// Category options for multi-select
const CATEGORY_OPTIONS = DOCUMENT_CATEGORIES.map(cat => ({
  value: cat.code,
  label: cat.name,
  code: cat.code,
}));

export function LibraryFiltersPanel({
  filters,
  onFiltersChange,
  onClear
}: LibraryFiltersPanelProps) {
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym?: string; logo?: string; iati_org_id?: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Track which dropdown is open - only one can be open at a time
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleDropdownOpenChange = (id: string) => (isOpen: boolean) => {
    setOpenDropdown(isOpen ? id : null);
  };

  // Fetch organizations for filter
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations');
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.organizations || data || []);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoadingOrgs(false);
      }
    };
    fetchOrganizations();
  }, []);

  // Handle source type changes from multi-select
  const handleSourceTypeChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      sourceTypes: values.length > 0 ? values as DocumentSourceType[] : undefined,
    });
  };

  // Handle format changes from multi-select
  // Each option value may contain multiple MIME types (comma-separated)
  // We need to expand selected option values into individual MIME types
  const handleFormatChange = (selectedOptionValues: string[]) => {
    const allMimeTypes = selectedOptionValues.flatMap(v => v.split(','));
    onFiltersChange({
      ...filters,
      formats: allMimeTypes.length > 0 ? allMimeTypes : undefined,
    });
  };

  // Compute which format option values are currently selected
  // An option is selected if any of its MIME types are in filters.formats
  const selectedFormatValues = FORMAT_OPTIONS
    .filter(opt => {
      if (!filters.formats) return false;
      const mimes = opt.value.split(',');
      return mimes.some(m => filters.formats!.includes(m));
    })
    .map(opt => opt.value);

  // Organization options for searchable select
  const orgOptions: SearchableSelectOption[] = organizations.map(org => ({
    value: org.id,
    label: org.acronym ? `${org.name} (${org.acronym})` : org.name,
    code: org.iati_org_id || undefined,
    icon: org.logo ? (
      <img src={org.logo} alt="" className="h-5 w-5 rounded-sm object-contain flex-shrink-0" />
    ) : (
      <div className="h-5 w-5 rounded-sm bg-muted dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-medium text-muted-foreground dark:text-muted-foreground">
          {(org.acronym || org.name || '?')[0].toUpperCase()}
        </span>
      </div>
    ),
  }));

  return (
    <FilterBar className="flex-wrap">
      {/* Source Type */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Source Type</Label>
        <MultiSelectFilter
          options={SOURCE_TYPE_OPTIONS}
          value={filters.sourceTypes || []}
          onChange={handleSourceTypeChange}
          placeholder="All Sources"
          searchPlaceholder="Search sources..."
          emptyText="No source types found."
          icon={<FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
          className="w-[180px] h-9"
          dropdownClassName="w-[240px]"
          open={openDropdown === 'source'}
          onOpenChange={handleDropdownOpenChange('source')}
        />
      </div>

      {/* File Format */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">File Format</Label>
        <MultiSelectFilter
          options={FORMAT_OPTIONS}
          value={selectedFormatValues}
          onChange={handleFormatChange}
          placeholder="All Formats"
          searchPlaceholder="Search formats..."
          emptyText="No formats found."
          icon={<File className="h-4 w-4 text-muted-foreground shrink-0" />}
          className="w-[180px] h-9"
          dropdownClassName="w-[240px]"
          open={openDropdown === 'format'}
          onOpenChange={handleDropdownOpenChange('format')}
        />
      </div>

      {/* Document Category */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Category</Label>
        <MultiSelectFilter
          options={CATEGORY_OPTIONS}
          value={filters.categoryCodes || []}
          onChange={(values) =>
            onFiltersChange({
              ...filters,
              categoryCodes: values.length > 0 ? values : undefined,
            })
          }
          placeholder="All Categories"
          searchPlaceholder="Search categories..."
          emptyText="No categories found."
          icon={<Library className="h-4 w-4 text-muted-foreground shrink-0" />}
          className="w-[200px] h-9"
          dropdownClassName="w-[320px]"
          open={openDropdown === 'category'}
          onOpenChange={handleDropdownOpenChange('category')}
        />
      </div>

      {/* Reporting Organization */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Reported by</Label>
        <SearchableSelect
          options={orgOptions}
          value={filters.reportingOrgIds?.[0] || ''}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              reportingOrgIds: value ? [value] : undefined,
            })
          }
          placeholder="All Organisations"
          searchPlaceholder="Search organisations..."
          showValueCode={false}
          open={openDropdown === 'org'}
          onOpenChange={handleDropdownOpenChange('org')}
        />
      </div>

      {/* Date Range */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Date From</Label>
        <DatePicker
          value={filters.documentDateFrom || ''}
          onChange={(value) =>
            onFiltersChange({
              ...filters,
              documentDateFrom: value || undefined,
            })
          }
          placeholder="Start date"
          className="w-[180px]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Date To</Label>
        <DatePicker
          value={filters.documentDateTo || ''}
          onChange={(value) =>
            onFiltersChange({
              ...filters,
              documentDateTo: value || undefined,
            })
          }
          placeholder="End date"
          className="w-[180px]"
        />
      </div>
    </FilterBar>
  );
}
