import React, { useState, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries, Country, DEFAULT_COUNTRY, findCountryByDialCode } from '@/data/countries';

interface SimplePhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function SimplePhoneInput({
  value = '',
  onChange,
  placeholder = "Enter phone number",
  disabled = false,
  className,
  id
}: SimplePhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse initial value
  React.useEffect(() => {
    if (value) {
      const country = findCountryByDialCode(value);
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(value.replace(country.dialCode, '').trim());
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearchValue('');
    const fullNumber = phoneNumber ? `${country.dialCode} ${phoneNumber}` : '';
    if (onChange) {
      onChange(fullNumber);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Auto-detect country code if user types +
    if (input.startsWith('+')) {
      const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
      
      for (const country of sortedCountries) {
        if (input.startsWith(country.dialCode)) {
          const remainingInput = input.substring(country.dialCode.length);
          if (remainingInput === '' || remainingInput.startsWith(' ') || /^\d/.test(remainingInput)) {
            const newPhoneNumber = remainingInput.trim();
            setSelectedCountry(country);
            setPhoneNumber(newPhoneNumber);
            if (onChange) {
              onChange(input);
            }
            return;
          }
        }
      }
    }
    
    setPhoneNumber(input);
    const fullNumber = input ? `${selectedCountry.dialCode} ${input}` : '';
    if (onChange) {
      onChange(fullNumber);
    }
  };

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    country.dialCode.includes(searchValue) ||
    country.code.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className={cn("flex w-full items-stretch", className)}>
      {/* Country Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="Select country"
            className={cn(
              "flex items-center justify-between w-[100px] h-10 px-2 py-2 rounded-l-md rounded-r-none border border-input border-r-0 bg-background text-sm flex-shrink-0 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-1">
              <img
                src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`}
                alt={`${selectedCountry.name} flag`}
                className="w-4 h-3 object-cover rounded-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <span className="text-sm font-mono">
                {selectedCountry.dialCode}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search countries..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandList className="max-h-[200px]">
              <CommandGroup>
                {filteredCountries.map((country) => (
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
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Phone Number Input */}
      <input
        ref={inputRef}
        id={id}
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex h-10 w-full rounded-r-md rounded-l-none border border-input border-l-0 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground -ml-px"
      />
    </div>
  );
}

export default SimplePhoneInput;
