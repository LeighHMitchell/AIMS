"use client";

import React from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { FILE_FORMATS } from '@/lib/iatiDocumentLink';
import { cn } from '@/lib/utils';

interface DocumentFormatSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownId?: string;
}

interface FormatOption {
  mime: string;
  label: string;
}

const formatOptions: FormatOption[] = Object.entries(FILE_FORMATS).map(([mime, label]) => {
  return { mime, label };
});

// Extract file extension from MIME type for display
const getExtensionFromMime = (mime: string): string => {
  const extensions: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'text/csv': 'CSV',
    'text/plain': 'TXT',
    'text/html': 'HTML',
    'application/json': 'JSON',
    'application/xml': 'XML',
  };
  return extensions[mime] || mime.split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE';
};

export function DocumentFormatSelect({
  value,
  onValueChange,
  placeholder = "Select format...",
  disabled = false,
  className,
  dropdownId = "document-format-select",
}: DocumentFormatSelectProps) {
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = formatOptions.find(option => option.mime === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return formatOptions;
    
    const query = searchQuery.toLowerCase();
    return formatOptions.filter(option => 
      option.mime.toLowerCase().includes(query) ||
      option.label.toLowerCase().includes(query) ||
      getExtensionFromMime(option.mime).toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className={cn("pb-6", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedOption && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {getExtensionFromMime(selectedOption.mime)}
                </span>
                <span className="font-medium">{selectedOption.label}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedOption && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.("");
                }}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
              >
                <span className="text-xs">×</span>
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search formats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchQuery("");
                  }
                }}
                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <span className="text-xs">×</span>
                </button>
              )}
            </div>
            <CommandList>
              <CommandGroup>
                {filteredOptions.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="text-sm text-muted-foreground">
                      No formats found.
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search terms
                    </div>
                  </div>
                ) : (
                  filteredOptions.map((format) => (
                    <CommandItem
                      key={format.mime}
                      onSelect={() => {
                        onValueChange?.(format.mime);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      className="pl-6 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === format.mime ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {getExtensionFromMime(format.mime)}
                          </span>
                          <span className="font-medium text-foreground">{format.label}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
} 