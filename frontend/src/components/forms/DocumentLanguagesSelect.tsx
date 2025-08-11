import React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { COMMON_LANGUAGES } from '@/lib/iatiDocumentLink';
import { cn } from '@/lib/utils';

interface DocumentLanguagesSelectProps {
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownId?: string;
  excludeValues?: string[];
  multiple?: boolean;
}

export function DocumentLanguagesSelect({
  value,
  onValueChange,
  placeholder = "Select language...",
  disabled = false,
  className,
  dropdownId = "document-languages-select",
  excludeValues = [],
  multiple = false,
}: DocumentLanguagesSelectProps) {
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : (Array.isArray(value) ? value[0] : value);
  const selectedOption = multiple ? null : COMMON_LANGUAGES.find(option => option.code === selectedValues);
  const selectedOptions = multiple ? COMMON_LANGUAGES.filter(option => (selectedValues as string[]).includes(option.code)) : [];

  const filteredOptions = React.useMemo(() => {
    let options = COMMON_LANGUAGES.filter(lang => !excludeValues.includes(lang.code));
    
    if (!searchQuery) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(option => 
      option.code.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query)
    );
  }, [searchQuery, excludeValues]);

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
            {multiple ? (
              selectedOptions.length > 0 ? (
                <span className="flex items-center gap-1 flex-wrap">
                  {selectedOptions.map((option, index) => (
                    <span key={option.code} className="inline-flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                      {option.code.toUpperCase()}
                      {index < selectedOptions.length - 1 && ','}
                    </span>
                  ))}
                </span>
              ) : (
                placeholder
              )
            ) : (
              selectedOption ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {selectedOption.code.toUpperCase()}
                  </span>
                  <span className="font-medium">{selectedOption.name}</span>
                </span>
              ) : (
                placeholder
              )
            )}
          </span>
          <div className="flex items-center gap-2">
            {((multiple && selectedOptions.length > 0) || (!multiple && selectedOption)) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange?.(multiple ? [] : "");
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
          className="w-[350px] p-0 shadow-lg border-border" 
          align="start"
          sideOffset={4}
        >
          <div className="border-b border-border p-3">
            <Input
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-2">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No languages found.</p>
                  <p className="text-xs">Try adjusting your search terms</p>
                </div>
              ) : (
                filteredOptions.map((language) => (
                  <button
                    key={language.code}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                      multiple 
                        ? (selectedValues as string[]).includes(language.code) && "bg-blue-100 text-blue-900"
                        : value === language.code && "bg-blue-100 text-blue-900"
                    )}
                    onClick={() => {
                      if (multiple) {
                        const currentValues = selectedValues as string[];
                        const newValues = currentValues.includes(language.code)
                          ? currentValues.filter(v => v !== language.code)
                          : [...currentValues, language.code];
                        onValueChange?.(newValues);
                      } else {
                        onValueChange?.(language.code);
                        setIsOpen(false);
                        setSearchQuery("");
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded min-w-[2.5rem]">
                        {language.code.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{language.name}</div>
                        <div className="text-xs text-muted-foreground truncate">ISO 639-1: {language.code}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
} 