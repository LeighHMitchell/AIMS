"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface Country {
  code: string
  name: string
}

interface CountryComboboxProps {
  countries: Country[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  allowClear?: boolean
}

export function CountryCombobox({
  countries,
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
  allowClear = true,
}: CountryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Find selected country
  const selectedCountry = countries.find(country => country.code === value)

  // Sort countries with Myanmar and Southeast Asia first, then alphabetically
  const sortedCountries = React.useMemo(() => {
    // Priority countries (Southeast Asia)
    const priorityCodes = ['MM', 'TH', 'VN', 'KH', 'LA', 'PH', 'ID', 'MY', 'SG', 'BN']
    
    const priorityCountries = countries.filter(c => priorityCodes.includes(c.code))
    const otherCountries = countries.filter(c => !priorityCodes.includes(c.code))
    
    // Sort priority countries by the priority order
    priorityCountries.sort((a, b) => {
      return priorityCodes.indexOf(a.code) - priorityCodes.indexOf(b.code)
    })
    
    // Sort other countries alphabetically
    otherCountries.sort((a, b) => a.name.localeCompare(b.name))
    
    return [...priorityCountries, ...otherCountries]
  }, [countries])

  // Filter countries based on search
  const filteredCountries = React.useMemo(() => {
    if (!search) return sortedCountries
    const term = search.toLowerCase()
    return sortedCountries.filter(country =>
      country.name.toLowerCase().includes(term) ||
      country.code.toLowerCase().includes(term)
    )
  }, [sortedCountries, search])

  const handleSelect = (countryCode: string) => {
    onValueChange(countryCode)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange("")
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal h-10",
              className
            )}
          >
            {selectedCountry ? (
              <span className="flex items-center gap-2">
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">
                  {selectedCountry.code}
                </span>
                <span>{selectedCountry.name}</span>
              </span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="p-0"
          style={{
            width: triggerRef.current ? `${triggerRef.current.offsetWidth}px` : undefined,
          }}
        >
          <Command>
            <CommandInput
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 focus:ring-0"
              autoFocus
            />
            <CommandList>
              {search && filteredCountries.length === 0 && (
                <CommandEmpty>No country found.</CommandEmpty>
              )}
              {filteredCountries.length > 0 && (
                <ScrollArea className="max-h-60 overflow-auto">
                  <CommandGroup>
                    {filteredCountries.map(country => (
                      <CommandItem
                        key={country.code}
                        value={country.code}
                        onSelect={() => handleSelect(country.code)}
                        className="cursor-pointer"
                      >
                        <span className="flex items-center gap-2 w-full">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">
                            {country.code}
                          </span>
                          <span>{country.name}</span>
                        </span>
                        {value === country.code && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {allowClear && value && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClear}
          title="Clear country filter"
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

