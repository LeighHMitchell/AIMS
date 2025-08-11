'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AddressComponents {
  addressLine1?: string;
  addressLine2?: string;
  street?: string; // Keep for backward compatibility
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  fullAddress?: string;
}

interface AddressSearchProps {
  value?: AddressComponents;
  onChange?: (address: AddressComponents) => void;
  disabled?: boolean;
  className?: string;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  lat: string;
  lon: string;
}

export function AddressSearch({
  value = {},
  onChange,
  disabled = false,
  className,
}: AddressSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addressComponents, setAddressComponents] = useState<AddressComponents>(value);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update internal state when value changes
  useEffect(() => {
    setAddressComponents(value);
  }, [value]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      // Search globally with address details
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&extratags=1`
      );
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error('Address search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Handle address selection from search results
  const handleAddressSelect = (result: SearchResult) => {
    const streetInfo = [result.address.house_number, result.address.road].filter(Boolean).join(' ');
    const newAddress: AddressComponents = {
      addressLine1: streetInfo,
      addressLine2: '',
      street: streetInfo, // Keep for backward compatibility
      city: result.address.city || result.address.town || result.address.village || '',
      state: result.address.state || '',
      country: result.address.country || '',
      postalCode: result.address.postcode || '',
      fullAddress: result.display_name,
    };

    setAddressComponents(newAddress);
    setSearchQuery('');
    setShowDropdown(false);
    onChange?.(newAddress);
  };

  // Handle manual field updates
  const handleFieldUpdate = (field: keyof AddressComponents, value: string) => {
    const updated = { ...addressComponents, [field]: value };
    setAddressComponents(updated);
    onChange?.(updated);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.address-search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Address Search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Search Address
        </Label>
        <div className="address-search-container relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an address..."
              disabled={disabled}
              className="pl-9 pr-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={() => handleAddressSelect(result)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0"
                  disabled={disabled}
                >
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.display_name.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.display_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Address Components */}
      <div className="space-y-4">

        
        {/* Address Line 1 */}
        <div>
          <Label htmlFor="addressLine1" className="text-sm text-gray-600">
            Address Line 1
          </Label>
          <Input
            id="addressLine1"
            type="text"
            value={addressComponents.addressLine1 || ''}
            onChange={(e) => handleFieldUpdate('addressLine1', e.target.value)}
            placeholder="123 Main Street"
            disabled={disabled}
            className="mt-1"
          />
        </div>

        {/* Address Line 2 */}
        <div>
          <Label htmlFor="addressLine2" className="text-sm text-gray-600">
            Address Line 2
          </Label>
          <Input
            id="addressLine2"
            type="text"
            value={addressComponents.addressLine2 || ''}
            onChange={(e) => handleFieldUpdate('addressLine2', e.target.value)}
            placeholder="Apartment, suite, etc. (optional)"
            disabled={disabled}
            className="mt-1"
          />
        </div>

        {/* City and State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city" className="text-sm text-gray-600">
              City
            </Label>
            <Input
              id="city"
              type="text"
              value={addressComponents.city || ''}
              onChange={(e) => handleFieldUpdate('city', e.target.value)}
              placeholder="City"
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="state" className="text-sm text-gray-600">
              State/Province
            </Label>
            <Input
              id="state"
              type="text"
              value={addressComponents.state || ''}
              onChange={(e) => handleFieldUpdate('state', e.target.value)}
              placeholder="State or Province"
              disabled={disabled}
              className="mt-1"
            />
          </div>
        </div>

        {/* Country and Postal Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country" className="text-sm text-gray-600">
              Country
            </Label>
            <Input
              id="country"
              type="text"
              value={addressComponents.country || ''}
              onChange={(e) => handleFieldUpdate('country', e.target.value)}
              placeholder="Country"
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="postalCode" className="text-sm text-gray-600">
              Postal Code
            </Label>
            <Input
              id="postalCode"
              type="text"
              value={addressComponents.postalCode || ''}
              onChange={(e) => handleFieldUpdate('postalCode', e.target.value)}
              placeholder="Postal Code"
              disabled={disabled}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
