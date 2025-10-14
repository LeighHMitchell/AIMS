'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, MapPin, X } from 'lucide-react';
import { useLocations } from '@/hooks/use-results';
import { LocationReference } from '@/types/results';

interface LocationsManagerProps {
  entityType: 'baseline' | 'period';
  entityId: string;
  locations: LocationReference[];
  locationType?: 'target' | 'actual'; // For periods only
  onUpdate: () => void;
  readOnly?: boolean;
}

export function LocationsManager({
  entityType,
  entityId,
  locations = [],
  locationType,
  onUpdate,
  readOnly = false
}: LocationsManagerProps) {
  const { createLocation, deleteLocation, loading } = useLocations();
  const [showAddForm, setShowAddForm] = useState(false);
  const [locationRef, setLocationRef] = useState('');

  // Filter locations by type if specified (for periods)
  const filteredLocations = locationType
    ? locations.filter(loc => loc.location_type === locationType)
    : locations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!locationRef.trim()) {
      return;
    }

    const data = {
      location_ref: locationRef,
      location_type: locationType
    };

    const success = await createLocation(entityType, entityId, data);
    
    if (success) {
      setLocationRef('');
      setShowAddForm(false);
      onUpdate();
    }
  };

  const handleDelete = async (locationId: string) => {
    if (window.confirm('Delete this location reference?')) {
      const success = await deleteLocation(entityType, entityId, locationId);
      if (success) {
        onUpdate();
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location References {locationType && `(${locationType})`}
        </Label>
        {!readOnly && !showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Location
          </Button>
        )}
      </div>

      {/* Add Location Form */}
      {showAddForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded border space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Add Location Reference</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-700">
              Location Reference * 
              <span className="text-gray-500 font-normal ml-1">
                (IATI location code, e.g., AF-KAN, KH-PNH)
              </span>
            </Label>
            <Input
              value={locationRef}
              onChange={(e) => setLocationRef(e.target.value)}
              placeholder="e.g., AF-KAN (Afghanistan - Kandahar)"
              required
              className="text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use ISO 3166 country codes or IATI administrative area codes
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !locationRef.trim()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
            >
              Add Location
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Locations List */}
      {filteredLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border text-sm"
            >
              <MapPin className="h-3 w-3 text-gray-500" />
              <span className="text-gray-900 font-medium">{loc.location_ref}</span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(loc.id)}
                  className="text-red-600 hover:text-red-800 h-5 w-5 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredLocations.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-500 italic">No location references</p>
      )}
    </div>
  );
}

