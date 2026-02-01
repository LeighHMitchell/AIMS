'use client';

import React from 'react';
import { ChevronsUpDown, Check, Search, X, AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useDropdownState } from '@/contexts/DropdownContext';
import { toast } from 'sonner';

export interface SelectIATIGroup {
  label: string;
  options: Array<{
    code: string;
    name: string;
    description?: string;
    url?: string;
  }>;
}

interface SelectIATIProps {
  groups: SelectIATIGroup[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownId?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  error?: string;
  required?: boolean;
  label?: string;
  helperText?: string;
  copyValue?: string; // Optional value to copy to clipboard
  onCopySuccess?: () => void;
  hideGroupLabels?: boolean; // Hide group category labels
  usePortal?: boolean; // Whether to use portal for dropdown (set to false when inside modals)
}

export function SelectIATI({
  groups,
  value,
  onValueChange,
  placeholder = 'Select option...',
  disabled = false,
  className,
  dropdownId = 'select-iati',
  side,
  align = 'start',
  error,
  required = false,
  label,
  helperText,
  copyValue,
  onCopySuccess,
  hideGroupLabels = false,
  usePortal = true,
}: SelectIATIProps) {
  // Use shared dropdown state if dropdownId is provided
  const { isOpen, setOpen } = useDropdownState(dropdownId);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Flatten all options for searching and selection
  const allOptions = React.useMemo(() => {
    return groups.flatMap(group =>
      group.options.map(option => ({
        ...option,
        group: group.label,
      }))
    );
  }, [groups]);

  const selectedOption = allOptions.find(option => option.code === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allOptions;

    const query = searchQuery.toLowerCase();
    return allOptions.filter(option =>
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      (option.description && option.description.toLowerCase().includes(query)) ||
      (option.url && option.url.toLowerCase().includes(query))
    );
  }, [searchQuery, allOptions]);

  const groupedOptions = React.useMemo(() => {
    const groupsMap: { [key: string]: typeof allOptions } = {};
    filteredOptions.forEach(option => {
      if (!groupsMap[option.group]) {
        groupsMap[option.group] = [];
      }
      groupsMap[option.group].push(option);
    });
    return groupsMap;
  }, [filteredOptions]);

  // Handle copy to clipboard
  const handleCopy = React.useCallback(async () => {
    if (copyValue) {
      try {
        await navigator.clipboard.writeText(copyValue);
        toast.success('Copied to clipboard');
        onCopySuccess?.();
      } catch (error) {
        toast.error('Failed to copy');
      }
    }
  }, [copyValue, onCopySuccess]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Popover open={isOpen} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors',
            !selectedOption && 'text-muted-foreground',
            error && 'border-red-500 focus:ring-red-500'
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {selectedOption.code}
                </span>
                <span className="font-medium">{selectedOption.name}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {copyValue && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="h-4 w-4 rounded hover:bg-muted-foreground/20 flex items-center justify-center transition-colors cursor-pointer"
                title="Copy value"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {selectedOption && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.('');
                }}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3" />
              </div>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="min-w-[320px] p-0 shadow-lg border"
          align={align}
          forcePosition={side === 'top' ? 'top' : side === 'bottom' ? 'bottom' : undefined}
          sideOffset={4}
          usePortal={usePortal}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setSearchQuery('');
                  }
                }}
                className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <CommandList className="max-h-[200px]">
              {Object.entries(groupedOptions).map(([groupName, options]) => (
                <CommandGroup key={groupName}>
                  {!hideGroupLabels && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {groupName}
                    </div>
                  )}
                  {options.map((option) => (
                    <CommandItem
                      key={option.code}
                      onSelect={() => {
                        onValueChange?.(option.code);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="px-3 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === option.code ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {option.code}
                          </span>
                          <span className="font-medium text-foreground">{option.name}</span>
                        </div>
                        {option.description && (
                          <div className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {option.description}
                          </div>
                        )}
                        {option.url && (
                          <div className="text-xs text-blue-600 mt-1 underline">
                            <a href={option.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                              {option.url}
                            </a>
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {Object.keys(groupedOptions).length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No options found.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search terms
                  </div>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Helper text */}
      {helperText && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Convenience hook for managing IATI select state
export function useSelectIATI(initialValue: string = '') {
  const [value, setValue] = React.useState(initialValue);

  const handleChange = React.useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return {
    value,
    setValue: handleChange,
    reset: () => setValue(''),
  };
}

export default SelectIATI;
