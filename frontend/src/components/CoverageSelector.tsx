'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select, { SingleValue, StylesConfig } from 'react-select';
import { Target, X, Globe, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import myanmarData from '@/data/myanmar-locations.json';

// Types
interface Township {
  id: string;
  name: string;
  code: string;
}

interface StateRegion {
  id: string;
  name: string;
  code: string;
  townships: Township[];
}

interface CoverageArea {
  id: string;
  scope: 'national' | 'subnational';
  description: string;
  regions?: {
    id: string;
    name: string;
    code: string;
    townships: Township[];
  }[];
}

interface CoverageSelectorProps {
  coverageAreas: CoverageArea[];
  onCoverageAreasChange: (areas: CoverageArea[]) => void;
}

// 3-Tiered Option Structure
interface CoverageOption {
  value: string;
  label: string;
  type: 'national' | 'state' | 'township';
  stateId?: string;
  stateCode?: string;
  stateName?: string;
}

// Myanmar approximate boundaries for visualization (simplified)
const myanmarBounds: [number, number][] = [
  [28.335, 92.189],
  [28.335, 101.168],
  [9.784, 101.168],
  [9.784, 92.189],
];

// State/Region boundaries (simplified for demo - in production use GeoJSON)
const stateBounds: { [key: string]: [number, number][] } = {
  '01': [[25.3, 97.4], [28.3, 97.4], [28.3, 98.7], [25.3, 98.7]], // Kachin (approximation)
  '05': [[21.8, 94.0], [25.3, 94.0], [25.3, 96.5], [21.8, 96.5]], // Sagaing (approximation)
  '12': [[16.7, 96.0], [17.2, 96.0], [17.2, 96.6], [16.7, 96.6]], // Yangon (approximation)
  // Add more state bounds as needed
};

// Custom styles for react-select to match Tailwind theme
const selectStyles: StylesConfig<CoverageOption, false> = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: '#9ca3af',
    },
    minHeight: '40px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? '#3b82f6'
      : state.isFocused
      ? '#eff6ff'
      : 'white',
    color: state.isSelected ? 'white' : '#374151',
    '&:active': {
      backgroundColor: '#3b82f6',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#9ca3af',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#374151',
  }),
};

export default function EnhancedCoverageSelector({ coverageAreas, onCoverageAreasChange }: CoverageSelectorProps) {
  const [description, setDescription] = useState('');
  const [selectedOption, setSelectedOption] = useState<CoverageOption | null>(null);

  // Create 3-tiered options structure
  const coverageOptions = useMemo((): CoverageOption[] => {
    const options: CoverageOption[] = [];
    
    // Tier 1: Nationwide
    options.push({
      value: 'nationwide',
      label: 'Nationwide (Myanmar)',
      type: 'national',
    });

    // Tier 2: States/Regions
    myanmarData.states.forEach(state => {
      options.push({
        value: state.id,
        label: state.name,
        type: 'state',
        stateId: state.id,
        stateCode: state.code,
        stateName: state.name,
      });

      // Tier 3: Townships within each state
      state.townships.forEach(township => {
        options.push({
          value: `${state.id}-${township.id}`,
          label: `${township.name} (${state.name})`,
          type: 'township',
          stateId: state.id,
          stateCode: state.code,
          stateName: state.name,
        });
      });
    });

    return options;
  }, []);

  // Custom option renderer with icons
  const formatOption = (option: CoverageOption) => (
    <div className="flex items-center gap-2">
      {option.type === 'national' && <Globe className="h-4 w-4 text-green-600" />}
      {option.type === 'state' && <MapPin className="h-4 w-4 text-blue-600" />}
      {option.type === 'township' && <MapPin className="h-3 w-3 text-gray-600 ml-2" />}
      <span>{option.label}</span>
    </div>
  );

  // Handle selection change
  const handleSelectionChange = (selectedOption: SingleValue<CoverageOption>) => {
    setSelectedOption(selectedOption);
  };

  // Add coverage area
  const handleAddCoverageArea = () => {
    if (!description.trim() || !selectedOption) return;

    const newArea: CoverageArea = {
      id: crypto.randomUUID(),
      scope: selectedOption.type === 'national' ? 'national' : 'subnational',
      description: description.trim(),
    };

    if (selectedOption.type !== 'national') {
      if (selectedOption.type === 'state') {
        // State-wide coverage
        const state = myanmarData.states.find(s => s.id === selectedOption.stateId);
        if (state) {
          newArea.regions = [{
            id: state.id,
            name: state.name,
            code: state.code,
            townships: [] // All townships in state
          }];
        }
      } else if (selectedOption.type === 'township') {
        // Specific township coverage
        const state = myanmarData.states.find(s => s.id === selectedOption.stateId);
        const townshipId = selectedOption.value.split('-')[1];
        const township = state?.townships.find(t => t.id === townshipId);
        
        if (state && township) {
          newArea.regions = [{
            id: state.id,
            name: state.name,
            code: state.code,
            townships: [{
              id: township.id,
              name: township.name,
              code: township.code,
            }]
          }];
        }
      }
    }

    onCoverageAreasChange([...coverageAreas, newArea]);

    // Reset form
    setDescription('');
    setSelectedOption(null);
  };

  // Remove coverage area
  const removeCoverageArea = (id: string) => {
    onCoverageAreasChange(coverageAreas.filter(area => area.id !== id));
  };

  // Check if add button should be enabled
  const canAddCoverage = description.trim() && selectedOption;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Add a Broader Coverage Area
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3-Tiered Cascading Dropdown */}
        <div>
          <Label className="text-sm font-medium">Coverage Area *</Label>
          <div className="mt-1">
            <Select<CoverageOption>
              value={selectedOption}
              onChange={handleSelectionChange}
              options={coverageOptions}
              placeholder="Select coverage area (Nationwide, State, or Township)"
              isClearable
              isSearchable
              styles={selectStyles}
              formatOptionLabel={formatOption}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>
          
          {/* Selected Option Display */}
          {selectedOption && (
            <div className="mt-2">
              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                {selectedOption.type === 'national' && <Globe className="h-3 w-3 text-green-600" />}
                {selectedOption.type === 'state' && <MapPin className="h-3 w-3 text-blue-600" />}
                {selectedOption.type === 'township' && <MapPin className="h-3 w-3 text-gray-600" />}
                {selectedOption.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setSelectedOption(null)}
                />
              </Badge>
            </div>
          )}
        </div>

        {/* Coverage Preview Map - Aligned with LocationSelector map height (h-80) */}
        <div>
          <Label className="text-sm font-medium">Coverage Preview</Label>
          <div className="h-80 w-full border rounded-md overflow-hidden">
            <MapContainer
              center={[21.9, 95.9]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Show Myanmar bounds for national coverage */}
              {selectedOption?.type === 'national' && (
                <Polygon
                  positions={myanmarBounds}
                  color="#10b981"
                  weight={2}
                  fillOpacity={0.2}
                />
              )}

              {/* Show selected location bounds for subnational coverage */}
              {selectedOption && selectedOption.type !== 'national' && (() => {
                const stateId = selectedOption.stateId;
                const bounds = stateId ? stateBounds[stateId] : null;
                return bounds ? (
                  <Polygon
                    key={stateId}
                    positions={bounds}
                    color="#3b82f6"
                    weight={2}
                    fillOpacity={0.3}
                  />
                ) : null;
              })()}
            </MapContainer>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {selectedOption
              ? selectedOption.type === 'national'
                ? 'Nationwide coverage highlighted in green'
                : `Selected ${selectedOption.type === 'township' ? 'township' : 'state/region'} highlighted in blue`
              : 'Select a coverage area to preview on map'
            }
          </p>
        </div>

        {/* Activity Description */}
        <div>
          <Label htmlFor="coverage-description" className="text-sm font-medium">
            Activity Description *
          </Label>
          <Textarea
            id="coverage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the type of activity in this coverage area..."
            rows={3}
          />
        </div>

        <Button 
          onClick={handleAddCoverageArea}
          disabled={!canAddCoverage}
          className="w-full"
        >
          <Target className="h-4 w-4 mr-2" />
          Add Coverage Area
        </Button>

        {/* Added Coverage Areas */}
        {coverageAreas.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium">Added Coverage Areas ({coverageAreas.length})</h4>
            {coverageAreas.map((area) => (
              <div key={area.id} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm flex items-center gap-2">
                      {area.scope === 'national' ? (
                        <>
                          <Globe className="h-4 w-4" />
                          Myanmar (Nationwide)
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4" />
                          Subnational Coverage
                        </>
                      )}
                    </h5>
                    
                    {area.scope === 'subnational' && area.regions && (
                      <div className="mt-2 space-y-1">
                        {area.regions.map(region => (
                          <div key={region.id} className="text-xs">
                            <span className="font-medium">{region.name}</span>
                            {region.townships.length > 0 && (
                              <span className="text-gray-500 ml-1">
                                ({region.townships.length} townships)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-600 mt-2">{area.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCoverageArea(area.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}