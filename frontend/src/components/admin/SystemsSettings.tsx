"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Globe, Save, CheckCircle, AlertCircle } from "lucide-react"
import { countries } from "@/data/countries"
import { useSystemSettings } from "@/hooks/useSystemSettings"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

// Flag component to match the rest of the application
const CountryFlag = ({ countryCode }: { countryCode: string }) => {
  return (
    <img
      src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
      alt={`${countryCode} flag`}
      className="w-4 h-3 object-cover rounded-sm"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  )
}

export function SystemsSettings() {
  const { settings, loading, error, updateSettings } = useSystemSettings()
  const [saving, setSaving] = useState(false)
  const [localHomeCountry, setLocalHomeCountry] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Update local state when settings change from the API
  useEffect(() => {
    if (settings?.homeCountry) {
      setLocalHomeCountry(settings.homeCountry)
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await updateSettings({ homeCountry: localHomeCountry })
      if (success) {
        toast.success('System settings saved successfully')
      } else {
        // Show the error from the hook
        toast.error(error || 'Failed to save system settings')
      }
    } catch (err) {
      console.error('Error saving system settings:', err)
      toast.error('An unexpected error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const selectedCountry = countries.find(c => c.code === localHomeCountry)

  // Filter countries based on search
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries;
    
    const query = searchQuery.toLowerCase();
    return countries.filter(country => 
      country.code.toLowerCase().includes(query) ||
      country.name.toLowerCase().includes(query) ||
      country.dialCode.includes(query)
    );
  }, [searchQuery])

  const handleSelect = (countryCode: string) => {
    setLocalHomeCountry(countryCode)
    setIsOpen(false)
    setSearchQuery("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalHomeCountry("")
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Systems Settings
          </CardTitle>
          <CardDescription>
            Configure global system settings and defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Loading system settings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Systems Settings
          </CardTitle>
          <CardDescription>
            Configure global system settings and defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-red-600">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading system settings: {error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Systems Settings
        </CardTitle>
        <CardDescription>
          Configure global system settings and defaults
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="home-country" className="text-sm font-medium">
              Home Country
            </Label>
            <HelpTextTooltip 
              content="This setting determines the default country for the system and affects various defaults throughout the application."
            />
            {settings && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
          <div className="pb-6">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                  !selectedCountry && "text-muted-foreground"
                )}
                disabled={saving}
              >
                <span className="truncate">
                  {selectedCountry ? (
                    <span className="font-medium">{selectedCountry.name}</span>
                  ) : (
                    "Select home country..."
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {selectedCountry && (
                    <button
                      type="button"
                      onClick={handleClear}
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
                      placeholder="Search countries..."
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
                        className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors ml-2"
                        aria-label="Clear search"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    )}
                  </div>
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    {filteredCountries.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No countries found.
                      </div>
                    ) : (
                      <CommandGroup>
                        {filteredCountries.map((country) => (
                          <CommandItem
                            key={country.code}
                            value={country.code}
                            onSelect={() => handleSelect(country.code)}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent"
                          >
                            <CountryFlag countryCode={country.code} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{country.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{country.dialCode}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving || !localHomeCountry}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
