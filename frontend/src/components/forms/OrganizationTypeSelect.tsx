import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IATI_ORGANIZATION_TYPES } from '@/data/iati-organization-types';

interface OrganizationTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * OrganizationTypeSelect Component
 * 
 * Dropdown selector for IATI organization types.
 * Used in planned disbursements and other areas requiring organization type codes.
 * 
 * @param value - Current selected organization type code
 * @param onValueChange - Callback when selection changes
 * @param disabled - Whether the select is disabled
 * @param placeholder - Placeholder text
 * @param className - Additional CSS classes
 */
export function OrganizationTypeSelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select organization type',
  className = ''
}: OrganizationTypeSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={`h-10 ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {IATI_ORGANIZATION_TYPES.map(type => (
          <SelectItem key={type.code} value={type.code}>
            {type.code} - {type.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
