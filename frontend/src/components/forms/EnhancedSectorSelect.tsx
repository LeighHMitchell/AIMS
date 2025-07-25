'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Search, 
  Check, 
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  buildSectorHierarchy, 
  searchSectors,
  getHierarchyByCode,
  SectorGroup,
  Sector,
  SubSector 
} from '@/data/sector-hierarchy';

// Helper function to determine level from code
const getLevel = (code: string): 'group' | 'sector' | 'subsector' => {
  if (code.length === 3) return 'group';
  if (code.length === 5) return 'subsector';
  return 'sector'; // Assume 4-digit codes are sectors
};

// Helper function to get display name for any level
const getDisplayName = (code: string, hierarchy: any): string => {
  const { group, sector, subsector } = getHierarchyByCode(code);
  
  if (subsector) return subsector.name;
  if (sector) return sector.name;
  if (group) return group.name;
  
  return `Unknown (${code})`;
};

interface EnhancedSectorSelectProps {
  value: string[];
  onValueChange: (codes: string[]) => void;
  placeholder?: string;
  className?: string;
  maxSelections?: number;
}

export function EnhancedSectorSelect({ 
  value, 
  onValueChange, 
  placeholder = "Select sectors...",
  className,
  maxSelections = 20
}: EnhancedSectorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const hierarchy = useMemo(() => buildSectorHierarchy(), []);
  
  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.values(hierarchy.groups);
    }
    
    const results = searchSectors(searchQuery);
    const filteredGroups: SectorGroup[] = [];
    
    // Create filtered groups with only matching sectors/subsectors
    const groupMap = new Map<string, SectorGroup>();
    
    // Add groups that match
    results.groupMatches.forEach(group => {
      if (!groupMap.has(group.code)) {
        groupMap.set(group.code, { ...group, sectors: {} });
      }
    });
    
    // Add sectors that match
    results.sectorMatches.forEach(({ group, sector }) => {
      if (!groupMap.has(group.code)) {
        groupMap.set(group.code, { ...group, sectors: {} });
      }
      groupMap.get(group.code)!.sectors[sector.code] = { ...sector, subsectors: [] };
    });
    
    // Add subsectors that match
    results.subsectorMatches.forEach(({ group, sector, subsector }) => {
      if (!groupMap.has(group.code)) {
        groupMap.set(group.code, { ...group, sectors: {} });
      }
      if (!groupMap.get(group.code)!.sectors[sector.code]) {
        groupMap.get(group.code)!.sectors[sector.code] = { ...sector, subsectors: [] };
      }
      groupMap.get(group.code)!.sectors[sector.code].subsectors.push(subsector);
    });
    
    return Array.from(groupMap.values());
  }, [hierarchy, searchQuery]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSubsector = (subsectorCode: string) => {
    const newValue = value.includes(subsectorCode)
      ? value.filter(code => code !== subsectorCode)
      : [...value, subsectorCode];
    
    // Enforce max selections
    if (newValue.length <= maxSelections) {
      onValueChange(newValue);
      // Clear search after selection
      setSearchQuery('');
    }
  };

  // Add toggle functions for groups and sectors
  const toggleGroup = (groupCode: string) => {
    const newValue = value.includes(groupCode)
      ? value.filter(code => code !== groupCode)
      : [...value, groupCode];
    
    // Enforce max selections
    if (newValue.length <= maxSelections) {
      onValueChange(newValue);
      // Clear search after selection
      setSearchQuery('');
    }
  };

  const toggleSector = (sectorCode: string) => {
    const newValue = value.includes(sectorCode)
      ? value.filter(code => code !== sectorCode)
      : [...value, sectorCode];
    
    // Enforce max selections
    if (newValue.length <= maxSelections) {
      onValueChange(newValue);
      // Clear search after selection
      setSearchQuery('');
    }
  };

  const removeSelection = (code: string) => {
    onValueChange(value.filter(c => c !== code));
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const clearAll = () => {
    onValueChange([]);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Dropdown trigger */}
      <div 
        className="border border-gray-300 rounded-lg p-3 cursor-pointer bg-white hover:border-gray-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {value.length === 0 ? (
              <span className="text-sm text-gray-500">{placeholder}</span>
            ) : (
              <span className="text-sm text-gray-700">
                {value.length} sector{value.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {value.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>
      </div>
      
      {/* Dropdown content */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden mt-1">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Selection info */}
          {value.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
              {value.length} of {maxSelections} sectors selected
            </div>
          )}
          
          {/* Hierarchical list - all expanded */}
          <div className="overflow-y-auto max-h-80">
            {filteredData.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No sectors found matching your search' : 'No sectors available'}
              </div>
            ) : (
              <div className="p-1">
                {filteredData.map((group) => (
                  <div key={group.code} className="mb-3">
                    {/* Group header - clickable for selection */}
                    <div 
                      className={cn(
                        "px-3 py-2 bg-gray-100 border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors",
                        value.includes(group.code) && "bg-blue-100 border-blue-300"
                      )}
                      onClick={() => toggleGroup(group.code)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900 text-sm">
                          <span className="font-mono mr-2">{group.code}</span>
                          {group.name}
                        </div>
                        <div className="flex items-center justify-center w-4 h-4">
                          {value.includes(group.code) ? (
                            <div className="w-3 h-3 bg-blue-500 rounded flex items-center justify-center">
                              <Check className="h-2 w-2 text-white" />
                            </div>
                          ) : (
                            <div className="w-3 h-3 border border-gray-300 rounded"></div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Sectors - always expanded */}
                    <div className="ml-0">
                      {Object.values(group.sectors).map((sector) => (
                        <div key={sector.code} className="mb-2">
                          {/* Sector header - clickable for selection */}
                          <div 
                            className={cn(
                              "px-3 py-1 bg-gray-50 border-l-4 border-blue-200 cursor-pointer hover:bg-gray-100 transition-colors",
                              value.includes(sector.code) && "bg-blue-50 border-blue-300"
                            )}
                            onClick={() => toggleSector(sector.code)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-gray-800 text-sm">
                                <span className="font-mono mr-2">{sector.code}</span>
                                {sector.name}
                              </div>
                              <div className="flex items-center justify-center w-4 h-4">
                                {value.includes(sector.code) ? (
                                  <div className="w-3 h-3 bg-blue-500 rounded flex items-center justify-center">
                                    <Check className="h-2 w-2 text-white" />
                                  </div>
                                ) : (
                                  <div className="w-3 h-3 border border-gray-300 rounded"></div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Sub-sectors - always expanded */}
                          <div className="ml-0">
                            {sector.subsectors.map((subsector) => (
                              <div 
                                key={subsector.code}
                                className={cn(
                                  "flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-l-4 border-gray-100",
                                  value.includes(subsector.code) && "bg-blue-50 border-blue-300"
                                )}
                                onClick={() => toggleSubsector(subsector.code)}
                              >
                                <div className="flex items-center justify-center w-4 h-4 mr-3">
                                  {value.includes(subsector.code) ? (
                                    <div className="w-3 h-3 bg-blue-500 rounded flex items-center justify-center">
                                      <Check className="h-2 w-2 text-white" />
                                    </div>
                                  ) : (
                                    <div className="w-3 h-3 border border-gray-300 rounded"></div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-gray-900">
                                    <span className="font-mono mr-2">{subsector.code}</span>
                                    {subsector.name}
                                  </div>
                                  {subsector.description && searchQuery && (
                                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                      {subsector.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 