'use client';

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MapPin, Plus, Loader2, ArrowRight, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
import { SelectIATI, type SelectIATIGroup } from '@/components/ui/SelectIATI';
import { RequiredDot } from '@/components/ui/required-dot';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { countries } from '@/data/countries';
import { type LocationSchema, validateCoordinates } from '@/lib/schemas/location';

const COUNTRY_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Countries',
    options: countries.map((c) => ({ code: c.code, name: c.name })),
  },
];

type Mode = 'choose' | 'create';

interface LocationPickerDialogProps {
  activityId: string;
  existingLocations: LocationSchema[];
  onCancel: () => void;
  /** Called with the chosen / newly-created location. The parent should refresh
   *  its locations list when `isNew` is true. */
  onLocationChosen: (location: LocationSchema, isNew: boolean) => void;
}

export const LocationPickerDialog: React.FC<LocationPickerDialogProps> = ({
  activityId,
  existingLocations,
  onCancel,
  onLocationChosen,
}) => {
  const sitesOnly = useMemo(
    () => existingLocations.filter((l) => l && (l as any).id),
    [existingLocations],
  );
  const hasExisting = sitesOnly.length > 0;

  const [mode, setMode] = useState<Mode>(hasExisting ? 'choose' : 'create');
  const [selectedId, setSelectedId] = useState<string>('');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not available in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (err) => {
        console.error('[LocationPickerDialog] geolocation error:', err);
        toast.error("Couldn't get your location. Enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleConfirmExisting = () => {
    const found = sitesOnly.find((l) => (l as any).id === selectedId);
    if (!found) {
      toast.error('Please select a location');
      return;
    }
    onLocationChosen(found, false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Enter a location name');
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !validateCoordinates(lat, lng)) {
      toast.error('Enter valid coordinates (latitude -90..90, longitude -180..180)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        location_type: 'site',
        location_name: name.trim(),
        latitude: lat,
        longitude: lng,
        country_code: countryCode || undefined,
        site_type: 'project_site',
        source: 'manual',
        validation_status: 'valid',
      };
      const res = await apiFetch(`/api/activities/${activityId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create location');
      }
      const data = await res.json();
      if (!data?.location) throw new Error('Location was not returned by the API');
      toast.success('Location created');
      onLocationChosen(data.location as LocationSchema, true);
    } catch (err: any) {
      console.error('[LocationPickerDialog] create error:', err);
      toast.error(err.message || 'Failed to create location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="flex max-h-[92vh] w-[min(92vw,640px)] max-w-[640px] flex-col overflow-hidden p-0">
        <DialogHeader className="bg-surface-muted border-b px-6 py-4 mx-0 mt-0 rounded-t-lg">
          <DialogTitle>Log a field event</DialogTitle>
          <DialogDescription>
            First, tell us where it happened. You can attach a field event to an existing location or pin a
            new one.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Mode toggle */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('choose')}
              disabled={!hasExisting}
              className={cn(
                'flex items-start gap-3 rounded-md border p-3 text-left transition',
                mode === 'choose'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-slate-400',
                !hasExisting && 'cursor-not-allowed opacity-50',
              )}
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-body font-medium">Existing location</div>
                <div className="text-helper text-muted-foreground">
                  {hasExisting
                    ? `Choose from ${sitesOnly.length} location${sitesOnly.length === 1 ? '' : 's'} already on this activity.`
                    : 'No locations on this activity yet.'}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={cn(
                'flex items-start gap-3 rounded-md border p-3 text-left transition',
                mode === 'create'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-slate-400',
              )}
            >
              <Plus className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-body font-medium">Create new location</div>
                <div className="text-helper text-muted-foreground">
                  Pin a new place with a name and coordinates. Refine details later.
                </div>
              </div>
            </button>
          </div>

          {mode === 'choose' && hasExisting && (
            <Card className="space-y-3 p-4">
              <Label className="flex items-center gap-2">
                Pick a location
                <RequiredDot />
              </Label>
              <div className="space-y-1.5">
                {sitesOnly.map((loc) => {
                  const l = loc as any;
                  const id = l.id as string;
                  const subtitle = [l.city, l.state_region_name, l.country_code]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedId(id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md border p-2 text-left transition',
                        selectedId === id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-slate-400',
                      )}
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-medium">{l.location_name}</div>
                        {subtitle && (
                          <div className="truncate text-helper text-muted-foreground">{subtitle}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {mode === 'create' && (
            <Card className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="quick-loc-name" className="flex items-center gap-2">
                  Location name
                  <RequiredDot />
                  <HelpTextTooltip content="A short name for the place — e.g. 'Yangon office' or 'Village A'." />
                </Label>
                <Input
                  id="quick-loc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Yangon training centre"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Country
                  <HelpTextTooltip content="Country where the event took place." />
                </Label>
                <SelectIATI
                  groups={COUNTRY_GROUPS}
                  value={countryCode}
                  onValueChange={(v) => setCountryCode(v)}
                  placeholder="Select country"
                  dropdownId="quick-loc-country"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quick-loc-lat" className="flex items-center gap-2">
                    Latitude
                    <RequiredDot />
                  </Label>
                  <Input
                    id="quick-loc-lat"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="-90 to 90"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-loc-lng" className="flex items-center gap-2">
                    Longitude
                    <RequiredDot />
                  </Label>
                  <Input
                    id="quick-loc-lng"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="-180 to 180"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={useMyLocation}
                disabled={locating}
                className="flex items-center gap-2"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                Use my current location
              </Button>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {mode === 'choose' ? (
            <Button
              type="button"
              onClick={handleConfirmExisting}
              disabled={!selectedId}
              className="flex items-center gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create location &amp; continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPickerDialog;
