"use client";

import React, { useState, useEffect } from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { CountryEmergency } from "@/types/country-emergency";

interface EmergencySearchableSelectProps {
  value?: string;
  onValueChange?: (code: string, emergency?: CountryEmergency) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EmergencySearchableSelect({
  value,
  onValueChange,
  placeholder = "Select emergency...",
  disabled = false,
  className,
}: EmergencySearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [emergencies, setEmergencies] = useState<CountryEmergency[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch active emergencies
  useEffect(() => {
    const fetchEmergencies = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/emergencies");
        const data = await response.json();
        if (response.ok && data.data) {
          setEmergencies(data.data);
        }
      } catch (err) {
        console.error("Error fetching emergencies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmergencies();
  }, []);

  const selectedEmergency = emergencies.find((e) => e.code === value);

  const filteredEmergencies = React.useMemo(() => {
    if (!searchQuery) return emergencies;

    const query = searchQuery.toLowerCase();
    return emergencies.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.code.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query)
    );
  }, [emergencies, searchQuery]);

  const formatDateRange = (e: CountryEmergency) => {
    const parts: string[] = [];
    if (e.startDate) parts.push(new Date(e.startDate).toLocaleDateString());
    if (e.endDate) parts.push(new Date(e.endDate).toLocaleDateString());
    if (parts.length === 0) return null;
    return parts.join(" - ");
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
            !selectedEmergency && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedEmergency ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {selectedEmergency.code}
                </span>
                <span className="font-medium">{selectedEmergency.name}</span>
              </span>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-2">
            {selectedEmergency && (
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[400px] p-0 shadow-lg border"
          align="start"
          sideOffset={4}
        >
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search emergencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
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
                {loading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading emergencies...
                  </div>
                ) : (
                  filteredEmergencies.map((emergency) => (
                    <CommandItem
                      key={emergency.id}
                      onSelect={() => {
                        onValueChange?.(emergency.code, emergency);
                        setIsOpen(false);
                        setSearchQuery("");
                      }}
                      className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === emergency.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {emergency.code}
                          </span>
                          <span className="font-medium text-foreground">
                            {emergency.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {emergency.location && (
                            <span className="text-xs text-muted-foreground">
                              {emergency.location}
                            </span>
                          )}
                          {formatDateRange(emergency) && (
                            <span className="text-xs text-muted-foreground">
                              {emergency.location ? " · " : ""}
                              {formatDateRange(emergency)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
              {!loading && filteredEmergencies.length === 0 && (
                <div className="py-8 text-center">
                  <div className="text-sm text-muted-foreground">
                    No emergencies found.
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {emergencies.length === 0
                      ? "No active emergencies have been configured. Contact an admin."
                      : "Try adjusting your search terms"}
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
