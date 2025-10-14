import React from 'react';
import { EnhancedSearchableSelect } from '@/components/ui/enhanced-searchable-select';
import { OTHER_IDENTIFIER_TYPES } from '@/data/other-identifier-types';

interface OtherIdentifierTypeSelectProps {
  value?: string;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function OtherIdentifierTypeSelect({
  value,
  onValueChange,
  placeholder = "Select identifier type...",
  disabled = false,
  id,
  className
}: OtherIdentifierTypeSelectProps) {
  // Convert the flat array to grouped format for EnhancedSearchableSelect
  const groups = [{
    label: "Identifier Types",
    options: OTHER_IDENTIFIER_TYPES
  }];

  return (
    <div className={className}>
      <EnhancedSearchableSelect
        groups={groups}
        value={value}
        onValueChange={(value) => onValueChange?.(value || null)}
        placeholder={placeholder}
        disabled={disabled}
        dropdownId={id}
        searchPlaceholder="Search identifier types..."
      />
    </div>
  );
}
