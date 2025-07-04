'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getAllCurrenciesWithPinned, getCurrencyByCode, Currency } from '@/data/currencies';

interface CurrencySelectorProps {
  value?: string | null | undefined;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CurrencySelector({
  value,
  onValueChange,
  placeholder = "Select currency",
  disabled = false,
  className,
  id,
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) return currencies;
    
    const query = searchQuery.toLowerCase();
    return currencies.filter((currency) =>
      currency.code.toLowerCase().includes(query) ||
      currency.name.toLowerCase().includes(query)
    );
  }, [currencies, searchQuery]);

  const selectedCurrency = value ? getCurrencyByCode(value) : null;

  const handleSelect = (currency: Currency) => {
    onValueChange?.(currency.code);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate text-left">
          {selectedCurrency 
            ? `${selectedCurrency.code} - ${selectedCurrency.name}` 
            : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent 
        className="w-full max-w-[400px] p-0 bottom-full mb-2" 
        align="start" 
        sideOffset={4}
      >
        <Command className="max-h-[400px]">
          <CommandInput 
            placeholder="Search currency by code or name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandList className="max-h-[300px] overflow-y-auto">
            {/* Show pinned currencies first if no search query */}
            {!searchQuery && (
              <CommandGroup>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Commonly Used
                </div>
                {filteredCurrencies.slice(0, 6).map((currency) => (
                  <CommandItem
                    key={currency.code}
                    onSelect={() => handleSelect(currency)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium mr-2">{currency.code}</span>
                    <span className="text-muted-foreground">{currency.name}</span>
                    {currency.symbol && (
                      <span className="ml-auto text-muted-foreground">
                        {currency.symbol}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            <CommandGroup>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {searchQuery ? "Search Results" : "All Currencies"}
              </div>
              {(searchQuery ? filteredCurrencies : filteredCurrencies.slice(6)).map((currency) => (
                <CommandItem
                  key={currency.code}
                  onSelect={() => handleSelect(currency)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium mr-2">{currency.code}</span>
                  <span className="text-muted-foreground">{currency.name}</span>
                  {currency.symbol && (
                    <span className="ml-auto text-muted-foreground">
                      {currency.symbol}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 