'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Trash2, AlertCircle, Info, Upload, Copy, BarChart2, PieChart, HelpCircle } from 'lucide-react';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { SectorAllocation, SectorValidation, DAC5Sector } from '@/types/sector';
import { searchDACCodes } from '@/data/dac-codes';
import SectorDonutChart from './SectorDonutChart';
import SectorStackedBar from './SectorStackedBar';
import { v4 as uuidv4 } from 'uuid';

interface SectorAllocationFormProps {
  allocations: SectorAllocation[];
  onChange: (allocations: SectorAllocation[]) => void;
  onValidationChange?: (validation: SectorValidation) => void;
  allowPublish?: boolean;
}

export default function SectorAllocationForm({ 
  allocations = [], 
  onChange, 
  onValidationChange,
  allowPublish = true 
}: SectorAllocationFormProps) {
  const [localAllocations, setLocalAllocations] = useState<SectorAllocation[]>(
    allocations.length > 0 ? allocations : []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DAC5Sector[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeAllocationId, setActiveAllocationId] = useState<string | null>(null);
  const [validation, setValidation] = useState<SectorValidation>({ 
    isValid: false, 
    totalPercentage: 0, 
    remainingPercentage: 100,
    errors: [] 
  });
  const [visualizationType, setVisualizationType] = useState<'donut' | 'bar'>('donut');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Validate allocations
  useEffect(() => {
    const total = localAllocations.reduce((sum, alloc) => sum + (alloc.percentage || 0), 0);
    const errors: string[] = [];
    
    if (total !== 100 && localAllocations.length > 0) {
      if (total > 100) {
        errors.push(`Total allocation exceeds 100% (currently ${total}%)`);
      } else {
        errors.push(`Total allocation is less than 100% (currently ${total}%)`);
      }
    }
    
    if (localAllocations.length === 0) {
      errors.push('At least one sector allocation is required');
    }
    
    // Check for duplicates
    const seen = new Set<string>();
    localAllocations.forEach(alloc => {
      if (seen.has(alloc.dac5_code)) {
        errors.push(`Duplicate sector: ${alloc.dac5_code}`);
      }
      seen.add(alloc.dac5_code);
    });
    
    const newValidation: SectorValidation = {
      isValid: errors.length === 0 && total === 100,
      totalPercentage: total,
      remainingPercentage: 100 - total,
      errors
    };
    
    setValidation(newValidation);
    onValidationChange?.(newValidation);
  }, [localAllocations, onValidationChange]);

  // Search DAC codes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = searchDACCodes(searchQuery).slice(0, 10);
      setSearchResults(results);
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to auto-balance percentages equally
  const autoBalancePercentages = useCallback((allocations: SectorAllocation[]) => {
    if (allocations.length === 0) return allocations;
    
    const equalShare = 100 / allocations.length;
    const balanced = allocations.map(alloc => ({
      ...alloc,
      percentage: parseFloat(equalShare.toFixed(2))
    }));
    
    // Handle rounding errors by adjusting the first allocation
    const total = balanced.reduce((sum, alloc) => sum + alloc.percentage, 0);
    if (total !== 100 && balanced.length > 0) {
      balanced[0].percentage += (100 - total);
      balanced[0].percentage = parseFloat(balanced[0].percentage.toFixed(2));
    }
    
    return balanced;
  }, []);

  const addAllocation = (dac5: DAC5Sector) => {
    const newAllocation: SectorAllocation = {
      id: uuidv4(),
      dac5_code: dac5.dac5_code,
      dac5_name: dac5.dac5_name,
      dac3_code: dac5.dac3_code,
      dac3_name: dac5.dac3_name,
      percentage: 0 // Start with 0, will be auto-calculated below
    };
    
    const updatedWithNew = [...localAllocations, newAllocation];
    const autoBalanced = autoBalancePercentages(updatedWithNew);
    
    setLocalAllocations(autoBalanced);
    onChange(autoBalanced);
    setSearchQuery('');
    setShowDropdown(false);
    setActiveAllocationId(newAllocation.id || null);
  };

  const updateAllocationPercentage = (id: string, percentage: number) => {
    const updated = localAllocations.map(alloc => 
      alloc.id === id ? { ...alloc, percentage: Math.max(0, Math.min(100, percentage)) } : alloc
    );
    setLocalAllocations(updated);
    onChange(updated);
  };

  const removeAllocation = (id: string) => {
    const updated = localAllocations.filter(alloc => alloc.id !== id);
    const autoBalanced = autoBalancePercentages(updated);
    
    setLocalAllocations(autoBalanced);
    onChange(autoBalanced);
  };

  const handleAutoBalance = () => {
    if (localAllocations.length === 0) return;
    
    const autoBalanced = autoBalancePercentages(localAllocations);
    setLocalAllocations(autoBalanced);
    onChange(autoBalanced);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const newAllocations: SectorAllocation[] = [];
        
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const [dac5_code, percentage] = lines[i].split(',').map(s => s.trim());
          const dac5 = searchDACCodes(dac5_code)[0];
          
          if (dac5 && !isNaN(parseFloat(percentage))) {
            newAllocations.push({
              id: uuidv4(),
              dac5_code: dac5.dac5_code,
              dac5_name: dac5.dac5_name,
              dac3_code: dac5.dac3_code,
              dac3_name: dac5.dac3_name,
              percentage: parseFloat(percentage)
            });
          }
        }
        
        setLocalAllocations(newAllocations);
        onChange(newAllocations);
        setShowImportDialog(false);
      } catch (error) {
        console.error('CSV import error:', error);
        alert('Failed to import CSV. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header with helper text */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-800 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              For better granularity and aggregation, please report activities at the sub-sector level (DAC 5 codes).
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Aggregated to DAC 3 automatically. Sub-sector level ensures higher reporting quality.
            </p>
          </div>
        </div>
      </div>

      {/* Main form area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side - Form inputs */}
        <div className="space-y-4">
          {/* Search input */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Sub-sector
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search DAC 5 code or sub-sector name..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-800 focus:border-blue-800"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            {/* Search dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.dac5_code}
                    onClick={() => addAllocation(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{result.dac5_code} – {result.dac5_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      DAC 3: {result.dac3_code} – {result.dac3_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Allocations list */}
          <div className="space-y-3">
            {localAllocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No sectors assigned yet. Click "Add Sector" to begin.</p>
              </div>
            ) : (
              localAllocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className={`border rounded-lg p-4 ${
                    activeAllocationId === allocation.id ? 'border-blue-800 bg-gray-100' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {allocation.dac5_code} – {allocation.dac5_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        DAC 3: {allocation.dac3_code} – {allocation.dac3_name}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAllocation(allocation.id!)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mt-3 flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Percentage:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={allocation.percentage}
                      onChange={(e) => updateAllocationPercentage(allocation.id!, parseFloat(e.target.value) || 0)}
                      onFocus={() => setActiveAllocationId(allocation.id!)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-800 focus:border-blue-800"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAutoBalance}
              disabled={localAllocations.length === 0}
              className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Auto-balance
            </button>
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />
              <span className="inline-flex items-center text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                <Upload className="h-4 w-4 mr-1" />
                Import CSV
              </span>
            </label>
            
            <button
              onClick={() => setShowCopyDialog(true)}
              className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <Copy className="h-4 w-4 inline mr-1" />
              Copy from template
            </button>
          </div>

          {/* Validation messages */}
          {validation.errors.length > 0 && (
            <div className="bg-gray-100 border border-gray-300 rounded-md p-3">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-800 mt-0.5 mr-2" />
                <div className="text-sm text-blue-800">
                  {validation.errors.map((error, index) => (
                    <p key={index}>{error}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Total percentage display */}
          <div className={`text-lg font-medium ${
            validation.isValid ? 'text-green-600' : 
            validation.totalPercentage > 100 ? 'text-red-600' : 'text-yellow-600'
          }`}>
            Total: {validation.totalPercentage}%
            {validation.remainingPercentage !== 0 && (
              <span className="text-sm font-normal ml-2">
                ({validation.remainingPercentage > 0 ? 'Remaining' : 'Excess'}: {Math.abs(validation.remainingPercentage)}%)
              </span>
            )}
          </div>
        </div>

        {/* Right side - Visualization */}
        <div className="space-y-4">
          {/* Visualization toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">Sector Allocation Visualization</h3>
              <HelpTextTooltip content="Interactive sunburst chart showing sector allocation hierarchy and relationships">
                <HelpCircle className="w-4 h-4 text-gray-500 hover:text-gray-700 cursor-help" />
              </HelpTextTooltip>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setVisualizationType('donut')}
                className={`p-2 rounded-md ${
                  visualizationType === 'donut' ? 'bg-gray-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <PieChart className="h-5 w-5" />
              </button>
              <button
                onClick={() => setVisualizationType('bar')}
                className={`p-2 rounded-md ${
                  visualizationType === 'bar' ? 'bg-gray-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart2 className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Visualization container */}
          <div className="bg-gray-50 rounded-lg p-4 h-96">
            {localAllocations.length > 0 ? (
              visualizationType === 'donut' ? (
                <SectorDonutChart allocations={localAllocations} />
              ) : (
                <SectorStackedBar allocations={localAllocations} />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p className="text-sm">Add sectors to see visualization</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 