'use client'

import * as React from 'react'
import { Search, X, Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface SearchResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  type: string
  class: string
  importance: number
}

interface MapSearchProps {
  onLocationSelect: (lat: number, lng: number, name: string, type: string) => void
  className?: string
  placeholder?: string
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Get zoom level based on location type
const getZoomLevel = (type: string, locationClass: string): number => {
  // City/Town
  if (type === 'city' || type === 'town' || type === 'village' || type === 'hamlet') {
    return 12
  }
  // Administrative regions
  if (type === 'administrative' || locationClass === 'boundary') {
    return 9
  }
  // State/Region
  if (type === 'state' || type === 'region' || type === 'province') {
    return 8
  }
  // Country
  if (type === 'country') {
    return 6
  }
  // Default
  return 10
}

// Format location type for display
const formatLocationType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
}

export function MapSearch({ onLocationSelect, className, placeholder = "Search location..." }: MapSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const debouncedSearch = useDebounce(searchQuery, 400)

  // Search function
  const searchLocation = React.useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use our API route to proxy the geocoding request
      const response = await apiFetch(`/api/geocode?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data)
      setOpen(data.length > 0)
    } catch (err) {
      console.error('Geocoding error:', err)
      setError('Failed to search location')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Effect to trigger search when debounced query changes
  React.useEffect(() => {
    if (debouncedSearch) {
      searchLocation(debouncedSearch)
    } else {
      setResults([])
      setOpen(false)
    }
  }, [debouncedSearch, searchLocation])

  // Handle location selection
  const handleSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const zoomLevel = getZoomLevel(result.type, result.class)
    
    onLocationSelect(lat, lng, result.display_name, result.type)
    
    setSearchQuery('')
    setResults([])
    setOpen(false)
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0])
    }
  }

  // Clear search
  const handleClear = () => {
    setSearchQuery('')
    setResults([])
    setOpen(false)
    setError(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (results.length > 0) {
                  setOpen(true)
                }
              }}
              className="pl-9 pr-9 bg-white shadow-md border-input h-9 text-xs"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin pointer-events-none" />
            )}
            {!loading && searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 h-6 w-6 p-0 hover:bg-muted"
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent
        className="w-[400px] p-0 z-[9999]"
        align="start"
        sideOffset={5}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          {error && (
            <div className="px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {!error && results.length === 0 && searchQuery.length >= 3 && !loading && (
            <CommandEmpty>No locations found.</CommandEmpty>
          )}
          
          {results.length > 0 && (
            <CommandGroup>
              {results.map((result) => (
                <CommandItem
                  key={result.place_id}
                  value={result.display_name}
                  onSelect={() => handleSelect(result)}
                  className="cursor-pointer"
                >
                  <MapPin className="mr-2 h-4 w-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {result.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {result.display_name}
                    </div>
                  </div>
                  <div className="ml-2 shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                      {formatLocationType(result.type)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

