"use client";

import React from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { COMMON_LANGUAGES, formatLanguageDisplay } from "@/data/language-codes";

interface LanguageSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LanguageSelect({
  value,
  onValueChange,
  placeholder = "Select language...",
  disabled = false,
  className,
}: LanguageSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedLanguage = COMMON_LANGUAGES.find(lang => lang.code === value);

  const filteredLanguages = React.useMemo(() => {
    if (!searchQuery) return COMMON_LANGUAGES;
    
    const query = searchQuery.toLowerCase();
    return COMMON_LANGUAGES.filter(lang => 
      lang.code.toLowerCase().includes(query) ||
      lang.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedLanguage && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedLanguage ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedLanguage.code.toUpperCase()}</span>
                <span className="font-medium">{selectedLanguage.name}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedLanguage && (
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search languages..."
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
                {filteredLanguages.map((lang) => (
                  <CommandItem
                    key={lang.code}
                    onSelect={() => {
                      onValueChange?.(lang.code);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer py-2 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === lang.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{lang.code.toUpperCase()}</span>
                      <span className="font-medium text-foreground">{lang.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {filteredLanguages.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No languages found.
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
    </div>
  );
}

