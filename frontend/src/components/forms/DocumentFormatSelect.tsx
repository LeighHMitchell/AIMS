import React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
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
  category: string;
}

const formatOptions: FormatOption[] = Object.entries(FILE_FORMATS).map(([mime, label]) => {
  return { mime, label, category: '' }; // Remove categorization
});

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
      option.label.toLowerCase().includes(query)
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
              <div>
                <div className="font-medium">{selectedOption.label}</div>
                <div className="text-xs text-muted-foreground">{selectedOption.mime}</div>
              </div>
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
          className="w-[400px] p-0 shadow-lg border-border" 
          align="start"
          sideOffset={4}
        >
          <div className="border-b border-border p-3">
            <Input
              placeholder="Search formats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-2">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No formats found.</p>
                  <p className="text-xs">Try adjusting your search terms</p>
                </div>
              ) : (
                filteredOptions.map((format) => (
                  <button
                    key={format.mime}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                      value === format.mime && "bg-blue-100 text-blue-900"
                    )}
                    onClick={() => {
                      onValueChange?.(format.mime);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{format.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{format.mime}</div>
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