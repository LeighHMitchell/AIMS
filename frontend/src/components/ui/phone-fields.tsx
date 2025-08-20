'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries } from '@/data/countries';

interface PhoneFieldsProps {
  countryCode?: string;
  phoneNumber?: string;
  onCountryCodeChange?: (code: string) => void;
  onPhoneNumberChange?: (number: string) => void;
  disabled?: boolean;
  className?: string;
  phoneLabel?: string;
  phonePlaceholder?: string;
}

export function PhoneFields({
  countryCode = '',
  phoneNumber = '',
  onCountryCodeChange,
  onPhoneNumberChange,
  disabled = false,
  className,
  phoneLabel = "Phone Number",
  phonePlaceholder = "Enter your phone number",
}: PhoneFieldsProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(() => {
    return countries.find(country => country.dialCode === countryCode) || countries[0];
  });

  useEffect(() => {
    const country = countries.find(c => c.dialCode === countryCode);
    if (country) {
      setSelectedCountry(country);
    }
  }, [countryCode]);

  // Lock body scroll when dropdown is open
  useEffect(() => {
    if (open) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Memoized filtered countries to prevent re-computation
  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;
    const lowercaseSearch = searchTerm.toLowerCase();
    return countries.filter(country =>
      country.name.toLowerCase().includes(lowercaseSearch) ||
      country.dialCode.includes(searchTerm) ||
      country.code.toLowerCase().includes(lowercaseSearch)
    );
  }, [searchTerm]);

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearchTerm(''); // Reset search when selecting
    onCountryCodeChange?.(country.dialCode);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if user is typing a full international number
    if (value.startsWith('+')) {
      const match = countries.find(country => 
        value.startsWith(country.dialCode)
      );
      if (match && match.dialCode !== selectedCountry.dialCode) {
        setSelectedCountry(match);
        onCountryCodeChange?.(match.dialCode);
        // Remove the country code from the phone number
        const localNumber = value.substring(match.dialCode.length);
        onPhoneNumberChange?.(localNumber);
        return;
      }
    }
    
    onPhoneNumberChange?.(value);
  };

  return (
    <div className={cn("flex gap-3 items-end", className)}>
      {/* Country Code Field */}
      <div className="flex flex-col">
        <Popover open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen);
          if (!newOpen) {
            setSearchTerm(''); // Clear search when closing
          }
        }}>
          <PopoverTrigger
            role="combobox"
            aria-expanded={open}
            aria-label="Select country code"
            className={cn(
              "w-[120px] justify-between h-9 flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
          >
              <div className="flex items-center gap-2">
                <img
                  src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                  alt={`${selectedCountry.name} flag`}
                  className="w-4 h-3 object-cover rounded-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span className="font-mono text-sm">{selectedCountry.dialCode}</span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent 
            className="w-[320px] p-0" 
            align="start"
            sideOffset={4}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col max-h-80">
              {/* Search Input */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                    autoComplete="off"
                  />
                </div>
              </div>
              
              {/* Countries List - No scrolling */}
              <div 
                className="overflow-hidden max-h-60"
                onWheel={(e) => {
                  // Completely prevent all scroll events
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchMove={(e) => {
                  // Prevent touch scrolling on mobile
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {filteredCountries.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No country found.
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredCountries.map((country) => (
                      <div
                        key={country.code}
                        onClick={() => handleCountrySelect(country)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer rounded-sm",
                          "hover:bg-accent hover:text-accent-foreground",
                          selectedCountry.code === country.code && "bg-accent text-accent-foreground"
                        )}
                      >
                        <img
                          src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                          alt={`${country.name} flag`}
                          className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">{country.name}</span>
                        </div>
                        <span className="text-sm font-mono text-muted-foreground flex-shrink-0">
                          {country.dialCode}
                        </span>
                        {selectedCountry.code === country.code && (
                          <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Phone Number Field */}
      <div className="flex flex-col flex-1">
        <label className="text-sm font-medium text-gray-700 mb-2">
          {phoneLabel}
        </label>
        <Input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={phonePlaceholder}
          disabled={disabled}
          className="w-full h-9"
        />
      </div>
    </div>
  );
}
