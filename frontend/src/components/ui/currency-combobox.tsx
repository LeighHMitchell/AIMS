"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getAllCurrenciesWithPinned, getCurrencyByCode, isValidCurrencyCode } from "@/data/currencies"

interface CurrencyComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  allowCustom?: boolean
}

export function CurrencyCombobox({
  value,
  onValueChange,
  placeholder = "Select currency...",
  className,
  allowCustom = false,
}: CurrencyComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  
  const currencies = getAllCurrenciesWithPinned()
  const selectedCurrency = value ? getCurrencyByCode(value) : null
  
  // Filter currencies based on search
  const filteredCurrencies = React.useMemo(() => {
    if (!search) return currencies
    
    const searchLower = search.toLowerCase()
    return currencies.filter(currency =>
      currency.code.toLowerCase().includes(searchLower) ||
      currency.name.toLowerCase().includes(searchLower)
    )
  }, [search, currencies])
  
  // Separate pinned and regular currencies
  const pinnedCurrencies = filteredCurrencies.slice(0, 6)
  const regularCurrencies = filteredCurrencies.slice(6)
  
  const handleSelect = (currencyCode: string) => {
    onValueChange(currencyCode)
    setOpen(false)
    setSearch("")
  }
  
  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    if (!open) {
      setSearch("")
    }
  }
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <Coins className="h-4 w-4 shrink-0 opacity-50" />
            {selectedCurrency ? (
              <span className="truncate">
                <span className="font-mono mr-2">{selectedCurrency.code}</span>
                <span className="text-muted-foreground text-sm">
                  {selectedCurrency.name}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-[400px] p-0 z-[10001]" align="start" sideOffset={4}>
        <Command className="max-h-[400px]">
          <CommandInput
            placeholder="Search currency code or name..."
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <CommandEmpty>
            {allowCustom && isValidCurrencyCode(search.toUpperCase()) ? (
              <div className="py-2 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleSelect(search.toUpperCase())}
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Use custom code: {search.toUpperCase()}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No currency found.
              </p>
            )}
          </CommandEmpty>
          
          {filteredCurrencies.length > 0 && (
            <>
              {/* Pinned currencies */}
              {search === "" && (
                <>
                  <CommandGroup>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Common currencies
                  </div>
                    {pinnedCurrencies.map((currency) => (
                      <CommandItem
                        key={currency.code}
                        onSelect={() => handleSelect(currency.code)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === currency.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-mono font-medium">
                            {currency.code}
                          </span>
                          <span className="text-sm text-muted-foreground truncate">
                            {currency.name}
                          </span>
                          {currency.symbol && (
                            <span className="text-sm text-muted-foreground ml-auto">
                              {currency.symbol}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              
              {/* All currencies */}
              <CommandGroup>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {search ? "Search results" : "All currencies"}
                </div>
                {(search ? filteredCurrencies : regularCurrencies).map((currency) => (
                  <CommandItem
                    key={currency.code}
                    onSelect={() => handleSelect(currency.code)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono font-medium">
                        {currency.code}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {currency.name}
                      </span>
                      {currency.symbol && (
                        <span className="text-sm text-muted-foreground ml-auto">
                          {currency.symbol}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 