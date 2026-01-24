"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { MultiSelectFilter } from '@/components/ui/multi-select-filter';
import { X, FileText, Receipt, Building2, Target, BarChart3, Library, Calendar } from 'lucide-react';
import { DOCUMENT_CATEGORIES } from '@/lib/iatiDocumentLink';
import type { LibraryFilters, DocumentSourceType } from '@/types/library-document';

interface LibraryFiltersPanelProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onClear: () => void;
}

// Source type options with icons
const SOURCE_TYPE_OPTIONS: Array<{
  value: DocumentSourceType;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: 'activity', label: 'Activities', icon: <FileText className="h-4 w-4" /> },
  { value: 'transaction', label: 'Transactions', icon: <Receipt className="h-4 w-4" /> },
  { value: 'organization', label: 'Organizations', icon: <Building2 className="h-4 w-4" /> },
  { value: 'result', label: 'Results', icon: <Target className="h-4 w-4" /> },
  { value: 'indicator', label: 'Indicators', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'standalone', label: 'Library', icon: <Library className="h-4 w-4" /> },
];

// Format group options
const FORMAT_OPTIONS = [
  { value: 'application/pdf', label: 'PDF' },
  { value: 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Documents' },
  { value: 'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv', label: 'Spreadsheets' },
  { value: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml', label: 'Images' },
  { value: 'video/mp4,video/webm', label: 'Videos' },
  { value: 'application/json,application/xml,text/xml', label: 'Data Files' },
];

// Category options for multi-select
const CATEGORY_OPTIONS = DOCUMENT_CATEGORIES.map(cat => ({
  value: cat.code,
  label: `${cat.code} - ${cat.name}`,
}));

export function LibraryFiltersPanel({ 
  filters, 
  onFiltersChange, 
  onClear 
}: LibraryFiltersPanelProps) {
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; acronym?: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

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

  // Handle source type toggle
  const handleSourceTypeToggle = (sourceType: DocumentSourceType, checked: boolean) => {
    const currentTypes = filters.sourceTypes || [];
    let newTypes: DocumentSourceType[];
    
    if (checked) {
      newTypes = [...currentTypes, sourceType];
    } else {
      newTypes = currentTypes.filter(t => t !== sourceType);
    }
    
    onFiltersChange({
      ...filters,
      sourceTypes: newTypes.length > 0 ? newTypes : undefined,
    });
  };

  // Handle format toggle
  const handleFormatToggle = (formatValues: string, checked: boolean) => {
    const formats = formatValues.split(',');
    const currentFormats = filters.formats || [];
    let newFormats: string[];
    
    if (checked) {
      newFormats = [...new Set([...currentFormats, ...formats])];
    } else {
      newFormats = currentFormats.filter(f => !formats.includes(f));
    }
    
    onFiltersChange({
      ...filters,
      formats: newFormats.length > 0 ? newFormats : undefined,
    });
  };

  // Check if format group is selected
  const isFormatGroupSelected = (formatValues: string) => {
    if (!filters.formats) return false;
    const formats = formatValues.split(',');
    return formats.some(f => filters.formats!.includes(f));
  };

  // Organization options for searchable select
  const orgOptions: SearchableSelectOption[] = organizations.map(org => ({
    value: org.id,
    label: org.acronym ? `${org.name} (${org.acronym})` : org.name,
  }));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Source Type Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Source Type</Label>
            <div className="space-y-2">
              {SOURCE_TYPE_OPTIONS.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${option.value}`}
                    checked={filters.sourceTypes?.includes(option.value) || false}
                    onCheckedChange={(checked) => 
                      handleSourceTypeToggle(option.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`source-${option.value}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    {option.icon}
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Format Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">File Format</Label>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`format-${option.label}`}
                    checked={isFormatGroupSelected(option.value)}
                    onCheckedChange={(checked) => 
                      handleFormatToggle(option.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`format-${option.label}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Document Category</Label>
            <MultiSelectFilter
              options={CATEGORY_OPTIONS}
              selected={filters.categoryCodes || []}
              onChange={(selected) => 
                onFiltersChange({
                  ...filters,
                  categoryCodes: selected.length > 0 ? selected : undefined,
                })
              }
              placeholder="Select categories..."
              searchPlaceholder="Search categories..."
            />
          </div>

          {/* Organization and Date Filters */}
          <div className="space-y-4">
            {/* Organization Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reporting Organization</Label>
              <SearchableSelect
                options={orgOptions}
                value={filters.reportingOrgIds?.[0] || ''}
                onValueChange={(value) => 
                  onFiltersChange({
                    ...filters,
                    reportingOrgIds: value ? [value] : undefined,
                  })
                }
                placeholder="Select organization..."
                searchPlaceholder="Search organizations..."
                loading={loadingOrgs}
              />
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document Date</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.documentDateFrom || ''}
                  onChange={(e) => 
                    onFiltersChange({
                      ...filters,
                      documentDateFrom: e.target.value || undefined,
                    })
                  }
                  className="text-sm"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={filters.documentDateTo || ''}
                  onChange={(e) => 
                    onFiltersChange({
                      ...filters,
                      documentDateTo: e.target.value || undefined,
                    })
                  }
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clear Button */}
        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 mr-1" />
            Clear All Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
