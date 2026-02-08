'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDropdownState } from '@/contexts/DropdownContext';
import { useOutsideClick } from '@/hooks/useOutsideClick';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus,
  Trash2,
  Edit2,
  Globe,
  MapPin,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Search,
  X,
  Loader2,
  ChevronsUpDown,
  Info
} from 'lucide-react';
import { GeographyLevelToggle } from '@/components/activities/GeographyLevelToggle';
import { IATI_COUNTRIES, IATICountry, searchCountries } from '@/data/iati-countries';
import { IATI_REGIONS, IATIRegion, searchRegions } from '@/data/iati-regions';
import { EnhancedSearchableSelect } from '@/components/ui/enhanced-searchable-select';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-fetch';

export interface CountryAllocation {
  id: string;
  country: IATICountry;
  percentage: number;
  vocabulary?: string;
  vocabularyUri?: string;
  narrative?: string;
}

export interface RegionAllocation {
  id: string;
  region: IATIRegion;
  percentage: number;
  vocabulary?: string;
  vocabularyUri?: string;
  narrative?: string;
}

export interface CustomGeographyAllocation {
  id: string;
  name: string;
  code: string;
  percentage: number;
  vocabularyUri: string;
  narrative?: string;
}

interface CountriesRegionsTabProps {
  activityId: string;
  countries?: CountryAllocation[];
  regions?: RegionAllocation[];
  customGeographies?: CustomGeographyAllocation[];
  onCountriesChange?: (countries: CountryAllocation[]) => void;
  onRegionsChange?: (regions: RegionAllocation[]) => void;
  onCustomGeographiesChange?: (customGeographies: CustomGeographyAllocation[]) => void;
  canEdit?: boolean;
  geographyLevel?: 'activity' | 'transaction';
  onGeographyLevelChange?: (level: 'activity' | 'transaction') => void;
}

export default function CountriesRegionsTab({
  activityId,
  countries: initialCountries = [],
  regions: initialRegions = [],
  customGeographies: initialCustomGeographies = [],
  onCountriesChange,
  onRegionsChange,
  onCustomGeographiesChange,
  canEdit = true,
  geographyLevel = 'activity',
  onGeographyLevelChange
}: CountriesRegionsTabProps) {
  const [countries, setCountries] = useState<CountryAllocation[]>(initialCountries);
  const [regions, setRegions] = useState<RegionAllocation[]>(initialRegions);
  const [customGeographies, setCustomGeographies] = useState<CustomGeographyAllocation[]>(initialCustomGeographies);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'country' | 'region' | 'custom' | ''>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [percentage, setPercentage] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>('');
  const [customVocabularyUri, setCustomVocabularyUri] = useState<string>('');
  const [narrative, setNarrative] = useState<string>('');
  const [vocabulary, setVocabulary] = useState<string>('');
  const { isOpen: typeDropdownOpen, setOpen: setTypeDropdownOpen } = useDropdownState('countries-regions-type');
  const { isOpen: itemDropdownOpen, setOpen: setItemDropdownOpen } = useDropdownState('countries-regions-item');
  const { isOpen: vocabularyDropdownOpen, setOpen: setVocabularyDropdownOpen } = useDropdownState('countries-regions-vocabulary');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Close all dropdowns when clicking outside the form
  const closeAllDropdowns = () => {
    // Only close dropdowns if any are open (don't close if they're already closed)
    if (typeDropdownOpen || itemDropdownOpen || vocabularyDropdownOpen) {
      setTypeDropdownOpen(false);
      setItemDropdownOpen(false);
      setVocabularyDropdownOpen(false);
    }
  };

  // Use outside click to close dropdowns when clicking outside the form container
  const formRef = useOutsideClick(closeAllDropdowns, true);

  const [allocationStatus, setAllocationStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const isDirtyRef = useRef(false);

  // Type options for the dropdown
  const typeOptions = [
    { value: 'country', label: 'Country', description: 'Use official ISO-3166 countries. For non-standard geographies, choose Custom Geography.' },
    { value: 'region', label: 'Region', description: 'Select a region' },
    { value: 'custom', label: 'Custom Geography', description: 'Publishes as an IATI custom region (vocabulary 99) with your URI.' }
  ];

  // Vocabulary options based on type
  const getVocabularyOptions = () => {
    if (selectedType === 'country') {
      return [{ value: 'A4', label: 'ISO Country (3166-1 alpha-2)' }];
    } else if (selectedType === 'region') {
      return [{ value: '1', label: 'OECD DAC' }];
    } else if (selectedType === 'custom') {
      return [{ value: '99', label: 'Reporting Organization' }];
    }
    return [];
  };


  // Use the imported country and region data
  const COUNTRIES = IATI_COUNTRIES.map(country => ({
    code: country.code,
    name: country.name,
    description: country.withdrawn ? 'withdrawn' : ''
  }));

  const REGIONS = IATI_REGIONS.map(region => ({
    code: region.code,
    name: region.name,
    description: region.withdrawn ? 'withdrawn' : ''
  }));


  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    const countryTotal = countries.reduce((sum, c) => sum + (c.percentage || 0), 0);
    const regionTotal = regions.reduce((sum, r) => sum + (r.percentage || 0), 0);
    const customTotal = customGeographies.reduce((sum, c) => sum + (c.percentage || 0), 0);
    return countryTotal + regionTotal + customTotal;
  }, [countries, regions, customGeographies]);

  // Filter items based on selected type and search query
  const filteredItems = useMemo(() => {
    const items = selectedType === 'country' ? COUNTRIES : REGIONS;
    if (!itemSearchQuery) return items;
    
    const query = itemSearchQuery.toLowerCase();
    return items.filter(item => 
      item.code.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query)
    );
  }, [selectedType, itemSearchQuery]);

  // Check if allocation is valid (100% total)
  const isValidAllocation = useMemo(() => {
    return Math.abs(totalPercentage - 100) < 0.01; // Allow for floating point precision
  }, [totalPercentage]);

  // Check for overlapping allocations
  const hasOverlappingAllocations = useMemo(() => {
    const allCodes = [
      ...countries.map(c => c.country?.code),
      ...regions.map(r => r.region?.code),
      ...customGeographies.map(c => c.code)
    ];
    
    // Check for duplicate codes
    const uniqueCodes = new Set(allCodes);
    return allCodes.length !== uniqueCodes.size;
  }, [countries, regions, customGeographies]);

  // Get validation errors - only show errors when there's data to validate
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Only validate if there's data to validate
    const hasAnyData = countries.length > 0 || regions.length > 0 || customGeographies.length > 0;

    if (hasAnyData && !isValidAllocation) {
      errors.push(`Total allocation must equal 100%. Currently at ${totalPercentage.toFixed(1)}%.`);
    }

    if (hasOverlappingAllocations) {
      errors.push('Duplicate country/region codes detected. Each location can only be allocated once.');
    }

    return errors;
  }, [isValidAllocation, totalPercentage, hasOverlappingAllocations, countries, regions, customGeographies]);

  // Helper function to determine if allocation should show green tick
  const shouldShowGreenTick = (allocation: any) => {
    const status = allocationStatus[allocation.id];

    // Only show green tick if:
    // 1. The allocation has a valid percentage (> 0) OR is a user-selected allocation (any percentage)
    // 2. AND it's either explicitly marked as saved OR loaded from backend
    // 3. AND it's not currently saving or in error state
    if ((allocation.percentage > 0 || allocation.id) && status !== 'saving' && status !== 'error') {
      return true;
    }

    return false;
  };

  // Load data from API on mount
  useEffect(() => {
    if (activityId && activityId !== 'new') {
      loadData();
    }
  }, [activityId]);

  // Advanced fields are collapsed by default - users can expand manually if needed

  // Autosave when data changes (skip initial load)
  useEffect(() => {
    if (activityId && activityId !== 'new' && isDirtyRef.current) {
      const timeoutId = setTimeout(() => {
        saveData();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [countries, regions, customGeographies, activityId]);

  // Load data from API
  const loadData = async () => {
    if (!activityId || activityId === 'new') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch(`/api/activities/${activityId}/countries-regions`);
      if (!response.ok) {
        throw new Error('Failed to load countries/regions data');
      }
      
      const data = await response.json();
      
      // Transform countries data to ensure proper structure with full names
      const transformedCountries = (data.countries || [])
        .filter((country: any) => country && (country.country?.code || country.code))
        .map((country: any) => {
          const countryCode = country.country?.code || country.code;
          const countryData = IATI_COUNTRIES.find(c => c.code === countryCode);
          const countryName = countryData ? countryData.name : (country.country?.name || country.name || countryCode);

          return {
            ...country,
            country: {
              code: countryCode,
              name: countryName,
              iso2: countryCode,
              withdrawn: false
            }
          };
        });
      
      // Transform regions data to ensure proper structure with full names
      const transformedRegions = (data.regions || [])
        .filter((region: any) => region && (region.region?.code || region.code))
        .map((region: any) => {
          const regionCode = region.region?.code || region.code;
          const regionData = IATI_REGIONS.find(r => r.code === regionCode);
          const regionName = regionData ? regionData.name : (region.region?.name || region.name || regionCode);

          return {
            ...region,
            region: {
              code: regionCode,
              name: regionName,
              vocabulary: region.vocabulary || '1',
              withdrawn: false
            }
          };
        });
      
      // Custom geographies should already have the correct structure
      const transformedCustomGeographies = data.customGeographies || [];
      
      setCountries(transformedCountries);
      setRegions(transformedRegions);
      setCustomGeographies(transformedCustomGeographies);
      onCountriesChange?.(transformedCountries);
      onRegionsChange?.(transformedRegions);
      onCustomGeographiesChange?.(transformedCustomGeographies);

      // Mark all loaded allocations as saved (they came from backend)
      const newStatus: Record<string, 'saving' | 'saved' | 'error'> = {};
      [...transformedCountries, ...transformedRegions, ...transformedCustomGeographies].forEach(allocation => {
        newStatus[allocation.id] = 'saved';
      });
      setAllocationStatus(newStatus);
    } catch (err) {
      console.error('Error loading countries/regions data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Save data to API
  const saveData = async () => {
    if (!activityId || activityId === 'new') return;

    setIsSaving(true);
    setError(null);

    // Mark all allocations as saving
    const allAllocations = [...countries, ...regions, ...customGeographies];
    const newStatus: Record<string, 'saving' | 'saved' | 'error'> = {};

    allAllocations.forEach(allocation => {
      newStatus[allocation.id] = 'saving';
    });

    setAllocationStatus(newStatus);
    
    try {
      const response = await apiFetch(`/api/activities/${activityId}/countries-regions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countries,
          regions,
          customGeographies
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save countries/regions data');
      }

      setLastSaved(new Date());

      // Mark all allocations as saved
      const allAllocations = [...countries, ...regions, ...customGeographies];
      const newStatus: Record<string, 'saving' | 'saved' | 'error'> = {};

      allAllocations.forEach(allocation => {
        newStatus[allocation.id] = 'saved';
      });

      setAllocationStatus(newStatus);
    } catch (err) {
      console.error('Error saving countries/regions data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
      toast.error('Failed to save countries/regions data');

      // Mark all allocations as error
      const errorStatus: Record<string, 'saving' | 'saved' | 'error'> = {};
      allAllocations.forEach(allocation => {
        errorStatus[allocation.id] = 'error';
      });
      setAllocationStatus(errorStatus);
    } finally {
      setIsSaving(false);
    }
  };

  // Add/Update allocation with percentage
  const addAllocation = () => {
    isDirtyRef.current = true;
    if (!selectedType || !percentage) return;
    
    const percentageValue = parseFloat(percentage);
    if (isNaN(percentageValue) || percentageValue <= 0) return;

    // If editing, update existing allocation
    if (editingId) {
      if (selectedType === 'country') {
        const updatedCountries = countries.map(country => 
          country.id === editingId 
            ? {
                ...country,
                percentage: percentageValue,
                narrative: narrative.trim() || undefined,
                vocabulary: vocabulary || 'A4'
              }
            : country
        );
        setCountries(updatedCountries);
        onCountriesChange?.(updatedCountries);
      } else if (selectedType === 'region') {
        const updatedRegions = regions.map(region => 
          region.id === editingId 
            ? {
                ...region,
                percentage: percentageValue,
                narrative: narrative.trim() || undefined,
                vocabulary: vocabulary || '1'
              }
            : region
        );
        setRegions(updatedRegions);
        onRegionsChange?.(updatedRegions);
      } else if (selectedType === 'custom') {
        const updatedCustomGeographies = customGeographies.map(custom => 
          custom.id === editingId 
            ? {
                ...custom,
                name: customName.trim(),
                code: customCode.trim(),
                percentage: percentageValue,
                vocabularyUri: customVocabularyUri.trim() || null,
                narrative: narrative.trim() || undefined
              }
            : custom
        );
        setCustomGeographies(updatedCustomGeographies);
        onCustomGeographiesChange?.(updatedCustomGeographies);
      }
      
      // Reset form after editing
      cancelEdit();
      return;
    }
    
    // Handle custom geography
    if (selectedType === 'custom') {
      if (!customName.trim() || !customCode.trim()) {
        toast.error('Name and Code are required for custom geography');
        return;
      }
      
      // Check for duplicate codes
      const allCodes = [
        ...countries.map(c => c.country?.code),
        ...regions.map(r => r.region?.code),
        ...customGeographies.map(c => c.code)
      ];
      
      if (allCodes.includes(customCode)) {
        toast.error('This code has already been allocated');
        return;
      }
      
      const newCustomGeography: CustomGeographyAllocation = {
        id: `custom-${Date.now()}`,
        name: customName.trim(),
        code: customCode.trim(),
        percentage: percentageValue,
        vocabularyUri: customVocabularyUri.trim() || null,
        narrative: narrative.trim() || undefined
      };
      
      const updatedCustomGeographies = [...customGeographies, newCustomGeography];
      setCustomGeographies(updatedCustomGeographies);
      onCustomGeographiesChange?.(updatedCustomGeographies);

      // Mark the new allocation as saved
      setAllocationStatus(prev => ({ ...prev, [newCustomGeography.id]: 'saved' }));
      
      // Reset form
      setSelectedType('');
      setCustomName('');
      setCustomCode('');
      setCustomVocabularyUri('');
      setPercentage('');
      setVocabulary('');
      return;
    }
    
    // Handle country and region (existing logic)
    if (!selectedItem) return;
    
    
    // Check for duplicate codes
    const allCodes = [
      ...countries.map(c => c.country?.code),
      ...regions.map(r => r.region?.code),
      ...customGeographies.map(c => c.code)
    ];
    
    if (allCodes.includes(selectedItem)) {
      toast.error('This country/region has already been allocated');
      return;
    }
    
    if (selectedType === 'country') {
      const countryData = COUNTRIES.find(c => c.code === selectedItem);
      if (countryData && !countries.some(c => c.country?.code === countryData.code)) {
        const country: IATICountry = {
          code: countryData.code,
          name: countryData.name,
          withdrawn: countryData.description === 'withdrawn'
        };
        
        const newCountry: CountryAllocation = {
          id: `country-${Date.now()}`,
          country,
          percentage: percentageValue,
          vocabulary: vocabulary || (selectedType === 'country' ? 'A4' : '1'),
          vocabularyUri: undefined,
          narrative: narrative.trim() || undefined
        };
        
        const updatedCountries = [...countries, newCountry];
        setCountries(updatedCountries);
        onCountriesChange?.(updatedCountries);

        // Mark the new allocation as saved
        setAllocationStatus(prev => ({ ...prev, [newCountry.id]: 'saved' }));
      }
    } else if (selectedType === 'region') {
      const regionData = REGIONS.find(r => r.code === selectedItem);
      if (regionData && !regions.some(r => r.region?.code === regionData.code)) {
        const region: IATIRegion = {
          code: regionData.code,
          name: regionData.name,
          vocabulary: vocabulary || 'DAC',
          withdrawn: regionData.description === 'withdrawn'
        };
        
        const newRegion: RegionAllocation = {
          id: `region-${Date.now()}`,
          region,
          percentage: percentageValue,
          vocabulary: vocabulary || (selectedType === 'country' ? 'A4' : '1'),
          vocabularyUri: undefined,
          narrative: narrative.trim() || undefined
        };
        
        const updatedRegions = [...regions, newRegion];
        setRegions(updatedRegions);
        onRegionsChange?.(updatedRegions);

        // Mark the new allocation as saved
        setAllocationStatus(prev => ({ ...prev, [newRegion.id]: 'saved' }));
      }
    }
    
    // Reset form
    setSelectedType('');
    setSelectedItem('');
    setPercentage('');
    setNarrative('');
    setVocabulary('');
    setItemSearchQuery('');
  };

  // Handle type selection
  const handleTypeChange = (type: 'country' | 'region' | 'custom' | '') => {
    setSelectedType(type);
    setSelectedItem('');
    setItemSearchQuery('');
    setNarrative('');

    // Auto-select appropriate vocabulary based on type
    if (type === 'country') {
      setVocabulary('A4');
    } else if (type === 'region') {
      setVocabulary('1');
    } else if (type === 'custom') {
      setVocabulary('99');
    } else {
      setVocabulary('');
    }

    // Reset custom fields when switching away from custom
    if (type !== 'custom') {
      setCustomName('');
      setCustomCode('');
      setCustomVocabularyUri('');
    }

    // Close dropdown immediately
    setTypeDropdownOpen(false);
  };

  // Handle vocabulary selection
  const handleVocabularyChange = (vocab: string) => {
    setVocabulary(vocab);
    // Close dropdown immediately
    setVocabularyDropdownOpen(false);
  };

  // Edit functions
  const editCountry = (countryAllocation: CountryAllocation) => {
    setEditingId(countryAllocation.id);
    setSelectedType('country');
    setSelectedItem(countryAllocation.country?.code || '');
    setPercentage(countryAllocation.percentage.toString());
    setNarrative(countryAllocation.narrative || '');
    setVocabulary(countryAllocation.vocabulary || 'A4');
    setItemSearchQuery(countryAllocation.country?.name || '');
  };

  const editRegion = (regionAllocation: RegionAllocation) => {
    setEditingId(regionAllocation.id);
    setSelectedType('region');
    setSelectedItem(regionAllocation.region?.code || '');
    setPercentage(regionAllocation.percentage.toString());
    setNarrative(regionAllocation.narrative || '');
    setVocabulary(regionAllocation.vocabulary || '1');
    setItemSearchQuery(regionAllocation.region?.name || '');
  };

  const editCustomGeography = (customAllocation: CustomGeographyAllocation) => {
    setEditingId(customAllocation.id);
    setSelectedType('custom');
    setCustomName(customAllocation.name);
    setCustomCode(customAllocation.code);
    setCustomVocabularyUri(customAllocation.vocabularyUri);
    setPercentage(customAllocation.percentage.toString());
    setNarrative(customAllocation.narrative || '');
    setVocabulary('99');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedType('');
    setSelectedItem('');
    setPercentage('');
    setNarrative('');
    setVocabulary('');
    setItemSearchQuery('');
    setCustomName('');
    setCustomCode('');
    setCustomVocabularyUri('');
  };


  // Handle item selection
  const handleItemChange = (itemCode: string) => {
    setSelectedItem(itemCode);
    // Close dropdown immediately
    setItemDropdownOpen(false);
  };

  // Update country percentage
  const updateCountryPercentage = (id: string, percentage: number) => {
    isDirtyRef.current = true;
    const updatedCountries = countries.map(c =>
      c.id === id ? { ...c, percentage: Math.max(0, Math.min(100, percentage)) } : c
    );
    setCountries(updatedCountries);
    onCountriesChange?.(updatedCountries);
  };

  // Update region percentage
  const updateRegionPercentage = (id: string, percentage: number) => {
    isDirtyRef.current = true;
    const updatedRegions = regions.map(r =>
      r.id === id ? { ...r, percentage: Math.max(0, Math.min(100, percentage)) } : r
    );
    setRegions(updatedRegions);
    onRegionsChange?.(updatedRegions);
  };

  // Remove country allocation
  const removeCountry = (id: string) => {
    isDirtyRef.current = true;
    const updatedCountries = countries.filter(c => c.id !== id);
    setCountries(updatedCountries);
    onCountriesChange?.(updatedCountries);
  };

  // Remove region allocation
  const removeRegion = (id: string) => {
    isDirtyRef.current = true;
    const updatedRegions = regions.filter(r => r.id !== id);
    setRegions(updatedRegions);
    onRegionsChange?.(updatedRegions);
  };

  // Update custom geography percentage
  const updateCustomGeographyPercentage = (id: string, percentage: number) => {
    isDirtyRef.current = true;
    const updatedCustomGeographies = customGeographies.map(c =>
      c.id === id ? { ...c, percentage: Math.max(0, Math.min(100, percentage)) } : c
    );
    setCustomGeographies(updatedCustomGeographies);
    onCustomGeographiesChange?.(updatedCustomGeographies);
  };

  // Remove custom geography allocation
  const removeCustomGeography = (id: string) => {
    isDirtyRef.current = true;
    const updatedCustomGeographies = customGeographies.filter(c => c.id !== id);
    setCustomGeographies(updatedCustomGeographies);
    onCustomGeographiesChange?.(updatedCustomGeographies);
  };

  // Auto-distribute remaining percentage
  const autoDistributeRemaining = () => {
    isDirtyRef.current = true;
    const remaining = 100 - totalPercentage;
    if (remaining <= 0) return;

    const allAllocations = [...countries, ...regions, ...customGeographies];
    if (allAllocations.length === 0) return;

    const perAllocation = remaining / allAllocations.length;
    
    const updatedCountries = countries.map(c => ({
      ...c,
      percentage: c.percentage + perAllocation
    }));
    
    const updatedRegions = regions.map(r => ({
      ...r,
      percentage: r.percentage + perAllocation
    }));

    const updatedCustomGeographies = customGeographies.map(c => ({
      ...c,
      percentage: c.percentage + perAllocation
    }));

    setCountries(updatedCountries);
    setRegions(updatedRegions);
    setCustomGeographies(updatedCustomGeographies);
    onCountriesChange?.(updatedCountries);
    onRegionsChange?.(updatedRegions);
    onCustomGeographiesChange?.(updatedCustomGeographies);
  };

  // Show skeleton loader when loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        
        {/* Alert Skeleton */}
        <div className="rounded-lg border p-4">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
        
        {/* Add Form Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="md:col-span-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="md:col-span-2">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="md:col-span-1">
                <Skeleton className="h-4 w-4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={formRef as any} className="space-y-6">
      {/* Geography Level Setting */}
      <GeographyLevelToggle
        geographyLevel={geographyLevel}
        onGeographyLevelChange={onGeographyLevelChange}
        disabled={!canEdit}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Countries & Regions Allocation</h3>
          {geographyLevel === 'transaction' && (
            <Badge variant="secondary" className="text-xs">
              Disabled - Using Transaction Level
            </Badge>
          )}
        </div>
        
        {geographyLevel === 'activity' && !isValidAllocation && !hasOverlappingAllocations && (countries.length > 0 || regions.length > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={autoDistributeRemaining}
            disabled={!canEdit}
          >
            Auto-distribute remaining
          </Button>
        )}
      </div>

      {/* Transaction Level Info */}
      {geographyLevel === 'transaction' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Geography is set at the transaction level. Each transaction will specify its own recipient country or region. 
            The allocation form below is disabled.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Alerts */}
      {validationErrors.length > 0 && (countries.length > 0 || regions.length > 0) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading countries/regions data...</span>
        </div>
      )}

      {!isLoading && (
        <div className={`space-y-6 ${geographyLevel === 'transaction' ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Add Allocation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Add Countries & Regions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Main form section */}
                <div className="space-y-4">
                  {/* First row: Type, Vocabulary, Item, Percentage, Add Button */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {/* Type Selection */}
                  <div className="space-y-2 md:col-span-3">
                  <Label>Type</Label>
                  <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                    <PopoverTrigger
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
                      disabled={!canEdit}
                    >
                      <span className="truncate">
                        {selectedType ? (
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {selectedType === 'country' ? 'CT' : 'RG'}
                            </span>
                            <span className="font-medium">
                              {typeOptions.find(opt => opt.value === selectedType)?.label}
                            </span>
                          </span>
                        ) : (
                          'Select type...'
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedType && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTypeChange('');
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
                      className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 shadow-lg border"
                      align="start"
                      side="bottom"
                      sideOffset={4}
                    >
                      <Command>
                        <CommandGroup>
                          {typeOptions.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={() => {
                                  handleTypeChange(option.value as 'country' | 'region' | 'custom' | '');
                              }}
                                className="flex items-center gap-2 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                            >
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {option.value === 'country' ? 'CT' : option.value === 'region' ? 'RG' : 'CG'}
                              </span>
                              <span className="font-medium">{option.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                  {/* Vocabulary Selection */}
                  <div className="space-y-2 md:col-span-3">
                    <Label>Vocabulary</Label>
                  {selectedType ? (
                      <Popover open={vocabularyDropdownOpen} onOpenChange={setVocabularyDropdownOpen}>
                        <PopoverTrigger
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
                          disabled={!canEdit}
                        >
                          <span className="truncate">
                            {vocabulary ? (
                              <span className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {vocabulary}
                                </span>
                                <span className="font-medium">
                                  {getVocabularyOptions().find(opt => opt.value === vocabulary)?.label}
                                </span>
                              </span>
                            ) : (
                              'Select vocabulary...'
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            {vocabulary && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVocabularyChange('');
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
                          className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0 shadow-lg border"
                          align="start"
                          side="bottom"
                          sideOffset={4}
                        >
                          <Command>
                            <CommandGroup>
                              {getVocabularyOptions().map((option) => (
                                <CommandItem
                                  key={option.value}
                                  value={option.value}
                                  onSelect={() => {
                                    handleVocabularyChange(option.value);
                                  }}
                                  className="flex items-center gap-2 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                                >
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {option.value}
                                  </span>
                                  <span className="font-medium">{option.label}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors">
                        <span className="truncate text-muted-foreground">
                          Select type first
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Item Selection */}
                  <div className="space-y-2 md:col-span-3">
                    <Label>Item</Label>
                    {selectedType === 'custom' ? (
                      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors">
                        <span className="truncate text-muted-foreground">
                          Custom Geography fields below
                        </span>
                      </div>
                    ) : selectedType ? (
                    <Popover open={itemDropdownOpen} onOpenChange={setItemDropdownOpen}>
                      <PopoverTrigger
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
                        disabled={!canEdit}
                      >
                        <span className="truncate">
                          {selectedItem ? (
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {selectedItem}
                              </span>
                              <span className="font-medium">
                                {filteredItems.find(item => item.code === selectedItem)?.name}
                              </span>
                            </span>
                          ) : (
                              `Select ${selectedType === 'country' ? 'Country' : 'Region'}...`
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          {selectedItem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemChange('');
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
                        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <Command>
                          <div className="flex items-center border-b px-3 py-2">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                                placeholder={`Search ${selectedType === 'country' ? 'countries' : 'regions'}...`}
                              value={itemSearchQuery}
                              onChange={(e) => setItemSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setItemDropdownOpen(false);
                                    setItemSearchQuery("");
                                  } else if (e.key === 'Enter' || e.key === 'Tab') {
                                    // Close dropdown and keep current search query
                                    setItemDropdownOpen(false);
                                  }
                                }}
                                className="flex h-9 w-full rounded-md bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 focus:border-none"
                                autoFocus
                              />
                              {itemSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setItemSearchQuery("")}
                                  className="ml-2 h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                                  aria-label="Clear search"
                                >
                                  <span className="text-xs">×</span>
                                </button>
                              )}
                          </div>
                            <CommandList>
                              <CommandEmpty>No {selectedType === 'country' ? 'countries' : 'regions'} found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {filteredItems.map((item) => (
                              <CommandItem
                                key={item.code}
                                value={item.code}
                                onSelect={() => {
                                  handleItemChange(item.code);
                                  setItemSearchQuery("");
                                }}
                                    className="flex items-center gap-2 cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                              >
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {item.code}
                                </span>
                                    <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                      {item.description && (
                                        <span className="text-xs text-muted-foreground">{item.description}</span>
                                      )}
                                    </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                            </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors">
                      <span className="truncate text-muted-foreground">
                        Select type first
                      </span>
                    </div>
                  )}
                </div>

                  {/* Percentage */}
                  <div className="space-y-2 md:col-span-2">
                  <Label>Percentage (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    placeholder="0.0"
                      disabled={!canEdit || (selectedType !== 'custom' && !selectedItem)}
                    className="w-full border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                  />
                </div>

                  {/* Add Button */}
                  <div className="space-y-2 md:col-span-1">
                  <Label>&nbsp;</Label>
                  <Button
                    onClick={addAllocation}
                      disabled={
                        !canEdit || 
                        !selectedType || 
                        !vocabulary ||
                        !percentage || 
                        (selectedType !== 'custom' && !selectedItem) ||
                        (selectedType === 'custom' && (!customName.trim() || !customCode.trim()))
                      }
                      className="w-full bg-black hover:bg-gray-800 text-white"
                    variant="default"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                      {editingId ? 'Update' : 'Add'}
                  </Button>
                  </div>
                  </div>

                  {/* Narrative field */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="space-y-2 md:col-span-12">
                      <Label className="text-sm font-medium">Narrative / Description</Label>
                      <Input
                        type="text"
                        value={narrative}
                        onChange={(e) => setNarrative(e.target.value)}
                        placeholder="e.g., Covers all South Asian states except India"
                        disabled={!canEdit}
                        className="w-full border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                      />
                    </div>
                  </div>

                  {/* Custom Geography Fields - Below the main row */}
                  {selectedType === 'custom' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium">Name</Label>
                          <Input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="e.g., Horn of Africa"
                            disabled={!canEdit}
                            className="w-full border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Code</Label>
                          <Input
                            type="text"
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value)}
                            placeholder="e.g., HOA"
                            disabled={!canEdit}
                            className="w-full border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Vocabulary URI</Label>
                        <Input
                          type="url"
                          value={customVocabularyUri}
                          onChange={(e) => setCustomVocabularyUri(e.target.value)}
                          placeholder="https://donor.org/vocab/regions"
                          disabled={!canEdit}
                          className="w-full border-gray-300 focus:ring-gray-500 focus:border-gray-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allocations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Current Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              {countries.length === 0 && regions.length === 0 && customGeographies.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No allocations added</p>
                  <p className="text-sm">Use the form above to add countries and regions</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Type</TableHead>
                      <TableHead className="w-64">Name</TableHead>
                      <TableHead className="w-40">Vocabulary</TableHead>
                      <TableHead className="w-20">Percentage</TableHead>
                      <TableHead className="min-w-48">Narrative</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Countries */}
                    {countries.map((countryAllocation) => (
                      <TableRow key={countryAllocation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-600" />
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                              Country
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                            {countryAllocation.country?.code}
                          </Badge>
                            <span className="text-sm font-medium text-gray-900">{countryAllocation.country?.name}</span>
                            {countryAllocation.id && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">A4</span>
                            <span className="text-xs text-gray-400 font-normal">ISO Country</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{countryAllocation.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 min-w-48" title={countryAllocation.narrative}>
                          {countryAllocation.narrative || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600"
                              onClick={() => editCountry(countryAllocation)}
                              disabled={!canEdit}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => removeCountry(countryAllocation.id)}
                              disabled={!canEdit}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Regions */}
                    {regions.map((regionAllocation) => (
                      <TableRow key={regionAllocation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-600" />
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                              Region
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                            {regionAllocation.region?.code}
                          </Badge>
                            <span className="text-sm font-medium text-gray-900">{regionAllocation.region?.name}</span>
                            {regionAllocation.id && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                            <span className="text-xs text-gray-400 font-normal">OECD DAC</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{regionAllocation.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 min-w-48" title={regionAllocation.narrative}>
                          {regionAllocation.narrative || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600"
                              onClick={() => editRegion(regionAllocation)}
                              disabled={!canEdit}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => removeRegion(regionAllocation.id)}
                              disabled={!canEdit}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Custom Geographies */}
                    {customGeographies.map((customAllocation) => (
                      <TableRow key={customAllocation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <MapPin className="h-4 w-4 text-gray-600" />
                              <Plus className="h-2 w-2 text-gray-600 absolute -top-1 -right-1" />
                            </div>
                            <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                              Custom
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                              {customAllocation.code}
                            </Badge>
                            <span className="text-sm font-medium text-gray-900">{customAllocation.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">99</span>
                                  <span className="text-xs text-gray-400 font-normal">Custom</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs border border-gray-200 bg-white shadow-lg">
                                <p className="text-sm text-gray-600 font-normal">
                                  {customAllocation.vocabularyUri ? `Vocabulary URI: ${customAllocation.vocabularyUri}` : 'No vocabulary URI specified'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{customAllocation.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 min-w-48" title={customAllocation.narrative}>
                          {customAllocation.narrative || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600"
                              onClick={() => editCustomGeography(customAllocation)}
                              disabled={!canEdit}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => removeCustomGeography(customAllocation.id)}
                              disabled={!canEdit}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}