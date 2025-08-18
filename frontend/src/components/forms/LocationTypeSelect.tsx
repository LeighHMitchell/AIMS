'use client';

import React from 'react';
import { EnhancedSearchableSelect } from '@/components/ui/enhanced-searchable-select';
import { LOCATION_TYPE_CATEGORIES } from '@/data/location-types';

interface LocationTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationTypeSelect({
  value,
  onValueChange,
  placeholder = "Select location type...",
  disabled = false,
  className
}: LocationTypeSelectProps) {
  // Transform location types for EnhancedSearchableSelect
  const groups = LOCATION_TYPE_CATEGORIES.map(category => ({
    label: category.label,
    options: category.options.map(option => ({
      code: option.value,
      name: option.label,
      description: option.description
    }))
  }));

  return (
    <EnhancedSearchableSelect
      groups={groups}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Search location types..."
      disabled={disabled}
      className={className}
      dropdownId="location-type-select"
    />
  );
}

export default LocationTypeSelect;