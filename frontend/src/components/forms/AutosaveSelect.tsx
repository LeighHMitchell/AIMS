import React, { forwardRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AutosaveSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const AutosaveSelect = forwardRef<HTMLButtonElement, AutosaveSelectProps>(
  ({ id, value, onValueChange, placeholder, children, className, disabled, 'aria-label': ariaLabel }, ref) => {
    const handleValueChange = (newValue: string) => {
      console.log(`[AutosaveSelect] ${id} changed from "${value}" to "${newValue}"`);
      
      // Always call onValueChange, even if value is the same
      // This ensures autosave is triggered consistently
      onValueChange(newValue);
    };

    return (
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          ref={ref}
          id={id}
          className={className}
          aria-label={ariaLabel}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }
);

AutosaveSelect.displayName = 'AutosaveSelect';

// Helper HOC to wrap existing Select components
export function withAutosave<P extends Record<string, any>>(
  Component: React.ComponentType<P & {
    value?: string | null | undefined;
    onValueChange?: (value: string) => void;
  }>
) {
  return forwardRef<any, P & {
    value?: string | null | undefined;
    onValueChange?: (value: string) => void;
  }>((props, ref) => {
    const handleValueChange = (value: string) => {
      console.log(`[withAutosave] Value changed to: ${value}`);
      if (props.onValueChange) {
        props.onValueChange(value);
      }
    };

    return <Component {...props} ref={ref} onValueChange={handleValueChange} />;
  });
}