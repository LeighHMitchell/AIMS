'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, MapPin, X } from 'lucide-react';
import { useLocations } from '@/hooks/use-results';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
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
  const { confirm, ConfirmDialog } = useConfirmDialog();
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
    if (await confirm({ title: 'Delete location reference?', description: 'This can’t be undone.', confirmLabel: 'Delete', cancelLabel: 'Keep' })) {
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
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
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
        <form onSubmit={handleSubmit} className="bg-muted p-4 rounded border space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-foreground">Add Location Reference</h4>
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
            <Label className="text-xs text-foreground">
              Location Reference * 
              <span className="text-muted-foreground font-normal ml-1">
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
            <p className="text-xs text-muted-foreground mt-1">
              Use ISO 3166 country codes or IATI administrative area codes
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !locationRef.trim()}
              className="bg-muted hover:bg-gray-300 text-foreground border border-gray-400"
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
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground font-medium">{loc.location_ref}</span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(loc.id)}
                  className="text-destructive hover:text-destructive h-4 w-4 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredLocations.length === 0 && !showAddForm && (
        <p className="text-xs text-muted-foreground italic">No location references</p>
      )}
      <ConfirmDialog />
    </div>
  );
}

