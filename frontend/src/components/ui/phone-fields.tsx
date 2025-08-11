'use client';

import React, { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries } from '@/data/countries';

interface PhoneFieldsProps {
  countryCode?: string;
  phoneNumber?: string;
  onCountryCodeChange?: (code: string) => void;
  onPhoneNumberChange?: (number: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PhoneFields({
  countryCode = '',
  phoneNumber = '',
  onCountryCodeChange,
  onPhoneNumberChange,
  disabled = false,
  className,
}: PhoneFieldsProps) {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(() => {
    return countries.find(country => country.dialCode === countryCode) || countries[0];
  });

  useEffect(() => {
    const country = countries.find(c => c.dialCode === countryCode);
    if (country) {
      setSelectedCountry(country);
    }
  }, [countryCode]);

  const handleCountrySelect = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    setOpen(false);
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
    <div className={cn("flex gap-3", className)}>
      {/* Country Code Field */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Country Code
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-label="Select country code"
              className={cn(
                "w-[160px] justify-between",
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
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandList>
                <CommandGroup>
                  {countries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode} ${country.code}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="flex items-center gap-2"
                    >
                      <img
                        src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                        alt={`${country.name} flag`}
                        className="w-4 h-3 object-cover rounded-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{country.name}</span>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">
                        {country.dialCode}
                      </span>
                      {selectedCountry.code === country.code && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Phone Number Field */}
      <div className="flex flex-col space-y-2 flex-1">
        <label className="text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <Input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder="Enter your phone number"
          disabled={disabled}
          className="w-full"
        />
      </div>
    </div>
  );
}
