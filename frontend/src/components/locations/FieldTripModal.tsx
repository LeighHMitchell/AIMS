'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectIATI, type SelectIATIGroup } from '@/components/ui/SelectIATI';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Save,
  X,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Info,
  Crosshair,
  Search,
  RefreshCw,
  Mountain,
  Map as MapIcon,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
import { isImageMime } from '@/lib/iatiDocumentLink';
import { smartLocationSearch, isValidCoordinate } from '@/lib/geo/nominatim';
import type { LocationSearchResult } from '@/lib/schemas/location';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  getCountryCoordinates,
} from '@/data/country-coordinates';

// LocationMap is the same map used by LocationModal — interactive MapLibre
// with click-to-drop, draggable pin, and the configurable basemap layer.
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
});
import {
  fieldTripFormSchema,
  type FieldTripFormSchema,
  type FieldTrip,
  type FieldReportAttachment,
  type FieldReportEventType,
  FIELD_REPORT_EVENT_TYPES,
  FIELD_REPORT_EVENT_TYPE_LABELS,
  getDefaultFieldTripValues,
} from '@/lib/schemas/field-report';
import { RequiredDot } from '@/components/ui/required-dot';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EVENT_TYPE_CODE_TO_ENUM: Record<string, FieldReportEventType> = {
  '1': 'workshop',
  '2': 'field_visit',
  '3': 'monitoring_evaluation',
  '4': 'training',
  '5': 'community_consultation',
  '6': 'inception',
  '7': 'handover',
  '8': 'other',
};

const EVENT_TYPE_ENUM_TO_CODE: Record<FieldReportEventType, string> = Object.fromEntries(
  Object.entries(EVENT_TYPE_CODE_TO_ENUM).map(([code, type]) => [type, code]),
) as Record<FieldReportEventType, string>;

const FIELD_REPORT_EVENT_TYPE_DESCRIPTIONS: Record<FieldReportEventType, string> = {
  workshop: 'Structured group session for capacity building, planning, or knowledge exchange.',
  field_visit: 'Staff or partner visit to the location to observe or carry out activities.',
  monitoring_evaluation: 'Formal monitoring or evaluation mission to assess progress.',
  training: 'Capacity-building session focused on skills transfer.',
  community_consultation: 'Engagement event with local communities or beneficiaries.',
  inception: 'Project kickoff, launch, or inception meeting.',
  handover: 'Handover, closing, or project completion event.',
  other: 'Any other event not covered by the categories above.',
};

const FIELD_TRIP_EVENT_TYPE_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Event types',
    options: FIELD_REPORT_EVENT_TYPES.map((type) => ({
      code: EVENT_TYPE_ENUM_TO_CODE[type],
      name: FIELD_REPORT_EVENT_TYPE_LABELS[type],
      description: FIELD_REPORT_EVENT_TYPE_DESCRIPTIONS[type],
    })),
  },
];

interface FieldTripModalProps {
  activityId: string;
  trip: FieldTrip | null;
  onClose: () => void;
  onSaved: () => void;
}

// Basemap layer configuration — mirrors LocationModal so users see the same
// map options across "Add Location" and "Add Field Trip".
type MapLayerKey =
  | 'osm_standard'
  | 'osm_humanitarian'
  | 'cyclosm'
  | 'opentopo'
  | 'satellite_esri';

const MAP_LAYERS: Record<MapLayerKey, { name: string }> = {
  osm_standard: { name: 'Streets (Voyager)' },
  osm_humanitarian: { name: 'Humanitarian (HOT)' },
  cyclosm: { name: 'Streets (Light)' },
  opentopo: { name: 'Streets (Positron)' },
  satellite_esri: { name: 'ESRI Satellite' },
};

const LAYER_PREFERENCE_KEY = 'aims-map-layer-preference';

const toFormValues = (trip: FieldTrip | null): FieldTripFormSchema => {
  if (!trip) return getDefaultFieldTripValues();
  return {
    event_type: trip.event_type,
    event_type_other: trip.event_type_other ?? null,
    title: trip.title,
    place_name: trip.place_name ?? '',
    latitude: typeof trip.latitude === 'number' ? trip.latitude : null,
    longitude: typeof trip.longitude === 'number' ? trip.longitude : null,
    event_date: trip.event_date ?? null,
    event_end_date: trip.event_end_date ?? null,
    narrative: trip.narrative ?? null,
    participants_count: null,
    lead_organisation_id: null,
  };
};

export const FieldTripModal: React.FC<FieldTripModalProps> = ({
  activityId,
  trip,
  onClose,
  onSaved,
}) => {
  const [savingDetails, setSavingDetails] = useState(false);
  const [tripId, setTripId] = useState<string | null>(trip?.id ?? null);
  const [attachments, setAttachments] = useState<FieldReportAttachment[]>(
    trip?.attachments ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [locating, setLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map state — mirrors LocationModal so the experience is identical.
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_MAP_ZOOM);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(
    typeof trip?.latitude === 'number' && typeof trip?.longitude === 'number'
      ? [trip.latitude, trip.longitude]
      : null,
  );
  const [currentLayer, setCurrentLayer] = useState<MapLayerKey>('osm_standard');
  const [homeCountryCenter, setHomeCountryCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [homeCountryZoom, setHomeCountryZoom] = useState<number>(DEFAULT_MAP_ZOOM);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<any>(null);

  // Centre the map on the trip's coords if editing, otherwise on the
  // configured home country.
  useEffect(() => {
    if (typeof trip?.latitude === 'number' && typeof trip?.longitude === 'number') {
      setMapCenter([trip.latitude, trip.longitude]);
      setMapZoom(15);
    }
  }, [trip?.id]);

  // Fetch home country from system settings (same as LocationModal).
  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/admin/system-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.homeCountry) return;
        const coords = getCountryCoordinates(data.homeCountry);
        setHomeCountryCenter(coords.center);
        setHomeCountryZoom(coords.zoom);
        if (!trip) {
          setMapCenter(coords.center);
          setMapZoom(coords.zoom);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trip]);

  // Load saved basemap preference.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(LAYER_PREFERENCE_KEY) as MapLayerKey | null;
    if (saved && Object.keys(MAP_LAYERS).includes(saved)) {
      setCurrentLayer(saved);
    }
  }, []);

  const handleLayerChange = useCallback((layer: MapLayerKey) => {
    setCurrentLayer(layer);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAYER_PREFERENCE_KEY, layer);
    }
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FieldTripFormSchema>({
    resolver: zodResolver(fieldTripFormSchema),
    defaultValues: toFormValues(trip),
  });

  const eventType = watch('event_type');

  const refetchAttachments = useCallback(
    async (id: string) => {
      try {
        const res = await apiFetch(
          `/api/activities/${activityId}/field-trips/${id}/attachments`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setAttachments(data.attachments ?? []);
      } catch (err) {
        console.error('[FieldTripModal] refetch attachments error:', err);
      }
    },
    [activityId],
  );

  // Apply a new lat/lng pair to the form + marker + map centre. Used by the
  // map click handler, marker drag-end, search-result selection, and the
  // "Use my current location" button.
  const applyCoordinates = useCallback(
    (lat: number, lng: number, opts?: { recentre?: boolean; zoom?: number }) => {
      if (!isValidCoordinate(lat, lng)) return;
      const rounded = (n: number) => Number(n.toFixed(6));
      setValue('latitude', rounded(lat), { shouldValidate: true });
      setValue('longitude', rounded(lng), { shouldValidate: true });
      setMarkerPosition([lat, lng]);
      if (opts?.recentre) {
        setMapCenter([lat, lng]);
        if (typeof opts.zoom === 'number') setMapZoom(opts.zoom);
        if (mapRef.current?.setView) {
          mapRef.current.setView([lat, lng], opts.zoom ?? mapZoom);
        }
      }
    },
    [mapZoom, setValue],
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => applyCoordinates(lat, lng),
    [applyCoordinates],
  );

  const handleMarkerDragEnd = useCallback(
    (lat: number, lng: number) => applyCoordinates(lat, lng),
    [applyCoordinates],
  );

  const handleSelectSearchResult = useCallback(
    (result: LocationSearchResult) => {
      applyCoordinates(result.lat, result.lon, { recentre: true, zoom: 15 });
      setSearchQuery('');
      setSearchResults([]);
    },
    [applyCoordinates],
  );

  // Debounced search — mirrors LocationModal's cascading search.
  useEffect(() => {
    const run = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await smartLocationSearch(searchQuery.trim(), { limit: 30 });
        setSearchResults(results);
      } catch (err) {
        console.error('[FieldTripModal] search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not available in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoordinates(pos.coords.latitude, pos.coords.longitude, {
          recentre: true,
          zoom: 15,
        });
        setLocating(false);
      },
      (err) => {
        console.error('[FieldTripModal] geolocation error:', err);
        toast.error("Couldn't get your location. Click on the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const onSubmit = async (values: FieldTripFormSchema) => {
    setSavingDetails(true);
    try {
      const isUpdate = !!tripId;
      const url = isUpdate
        ? `/api/activities/${activityId}/field-trips/${tripId}`
        : `/api/activities/${activityId}/field-trips`;
      const method = isUpdate ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save field trip');
      }
      const data = await res.json();
      const saved = data.fieldTrip;
      if (!isUpdate && saved?.id) {
        setTripId(saved.id);
        toast.success('Field trip created');
      } else {
        toast.success('Field trip updated');
      }
      // Save now finalises the trip — close the modal and refresh the list.
      // (Photos/documents are added by reopening an existing trip.)
      onSaved();
    } catch (err: any) {
      console.error('[FieldTripModal] save error:', err);
      toast.error(err.message || 'Failed to save field trip');
    } finally {
      setSavingDetails(false);
    }
  };

  const uploadAndAttach = async (file: File): Promise<void> => {
    if (!tripId) {
      toast.error('Save the field trip first');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`"${file.name}" exceeds the 10MB limit`);
      return;
    }

    const mediaType: 'photo' | 'document' = isImageMime(file.type) ? 'photo' : 'document';

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('activityId', activityId);

      const uploadRes = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const uploadData = await uploadRes.json();

      const attachRes = await apiFetch(
        `/api/activities/${activityId}/field-trips/${tripId}/attachments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: mediaType,
            url: uploadData.url,
            file_name: uploadData.filename,
            file_size: uploadData.size,
            mime_type: uploadData.mimeType,
            file_path: uploadData.path,
            thumbnail_url: uploadData.thumbnailUrl,
            title: mediaType === 'document' ? uploadData.filename : null,
          }),
        },
      );
      if (!attachRes.ok) {
        const err = await attachRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to attach file');
      }
      const attachData = await attachRes.json();
      setAttachments((prev) => [...prev, attachData.attachment]);
    } catch (err: any) {
      console.error('[FieldTripModal] upload error:', err);
      toast.error(err.message || `Failed to upload ${file.name}`);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!tripId) {
      toast.error('Save the field trip first');
      return;
    }
    const list = Array.from(files);
    setUploading(true);
    try {
      for (const file of list) {
        // eslint-disable-next-line no-await-in-loop
        await uploadAndAttach(file);
      }
      toast.success(list.length === 1 ? 'File added' : `${list.length} files added`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!tripId) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!tripId) return;
    handleFiles(e.dataTransfer.files);
  };

  const updateAttachment = async (
    attachment: FieldReportAttachment,
    patch: Partial<Pick<FieldReportAttachment, 'caption' | 'title' | 'description'>>,
  ) => {
    if (!tripId || !attachment.id) return;
    setAttachments((prev) =>
      prev.map((a) => (a.id === attachment.id ? { ...a, ...patch } : a)),
    );
    try {
      const res = await apiFetch(
        `/api/activities/${activityId}/field-trips/${tripId}/attachments/${attachment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) throw new Error('Failed to update attachment');
    } catch (err: any) {
      console.error('[FieldTripModal] attachment update error:', err);
      toast.error(err.message || 'Failed to update attachment');
      if (tripId) refetchAttachments(tripId);
    }
  };

  const removeAttachment = async (attachment: FieldReportAttachment) => {
    if (!tripId || !attachment.id) return;
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    try {
      const res = await apiFetch(
        `/api/activities/${activityId}/field-trips/${tripId}/attachments/${attachment.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to remove attachment');
      toast.success('Removed');
    } catch (err: any) {
      console.error('[FieldTripModal] remove attachment error:', err);
      toast.error(err.message || 'Failed to remove attachment');
      if (tripId) refetchAttachments(tripId);
    }
  };

  const attachmentsLocked = !tripId;

  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');
  const hasCoords = typeof watchedLat === 'number' && typeof watchedLng === 'number';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 mx-0 mt-0 rounded-t-lg">
          <DialogTitle>
            {trip ? 'Edit Field Trip' : 'Add Field Trip'}
          </DialogTitle>
          <DialogDescription>
            Record a workshop, visit, or other event — where it happened, what happened, and any photos
            or documents. A field trip stands on its own; it doesn't need an activity site.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: Map + Search — identical to the Add Location modal */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapIcon className="h-4 w-4" />
                        Location Map
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Select value={currentLayer} onValueChange={(v) => handleLayerChange(v as MapLayerKey)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select map type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                              <SelectItem key={key} value={key}>
                                {layer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMapCenter(homeCountryCenter);
                            setMapZoom(homeCountryZoom);
                            setMarkerPosition(null);
                            setValue('latitude', null);
                            setValue('longitude', null);
                            if (mapRef.current) {
                              mapRef.current.setView?.(homeCountryCenter, homeCountryZoom);
                              mapRef.current.setPitch?.(0);
                              mapRef.current.setBearing?.(0);
                            }
                          }}
                          className="h-8 w-8 p-0"
                          title="Reset View"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!mapRef.current) return;
                            const currentPitch = (mapRef.current as any).getPitch?.() || 0;
                            if (currentPitch > 0) {
                              (mapRef.current as any).easeTo?.({ pitch: 0, bearing: 0, duration: 1000 });
                            } else {
                              (mapRef.current as any).easeTo?.({ pitch: 60, bearing: -20, duration: 1000 });
                            }
                          }}
                          className="h-8 px-2.5 text-helper"
                          title="Toggle 3D View"
                        >
                          <Mountain className="h-3.5 w-3.5 mr-1" />
                          3D
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative h-[480px] bg-muted rounded-lg overflow-hidden">
                      <LocationMap
                        mapCenter={mapCenter}
                        mapZoom={mapZoom}
                        mapRef={mapRef}
                        currentLayer={currentLayer}
                        existingLocations={[]}
                        markerPosition={markerPosition}
                        onMarkerDragEnd={handleMarkerDragEnd}
                        onMapClick={handleMapClick}
                        locationName={watch('place_name') || watch('title') || null}
                        displayLatitude={watchedLat ?? null}
                        displayLongitude={watchedLng ?? null}
                      />
                      <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded shadow text-helper text-muted-foreground">
                        Click on the map to set coordinates
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Search bar — same as LocationModal */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Label className="text-body font-medium">Search Locations</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search for a location"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg max-h-96 overflow-auto z-50">
                            <div className="sticky top-0 bg-surface-muted px-4 py-2 border-b text-helper text-muted-foreground font-medium">
                              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                            </div>
                            {searchResults.map((result, index) => (
                              <button
                                type="button"
                                key={index}
                                onClick={() => handleSelectSearchResult(result)}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-border last:border-b-0 transition-colors"
                              >
                                <div className="font-medium text-foreground truncate">
                                  {result.name || result.display_name}
                                </div>
                                <div className="text-body text-muted-foreground mt-1 line-clamp-2">
                                  {result.display_name}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSearching && (
                        <div className="flex items-center gap-2 text-body text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </div>
                      )}
                      {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                        <div className="text-body text-muted-foreground bg-muted p-3 rounded border border-border">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">No results found</div>
                              <div className="text-helper mt-1">
                                Try searching with different terms (e.g., city name, street name, address)
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
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
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT: Field trip fields */}
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="place_name" className="flex items-center gap-2">
                      Place name
                      <RequiredDot />
                      <HelpTextTooltip content="The name of the place this field trip happened. A field trip carries its own coordinates and is not tied to an activity site." />
                    </Label>
                    <Input
                      id="place_name"
                      {...register('place_name')}
                      placeholder="e.g. Yangon training centre"
                    />
                    {errors.place_name?.message && (
                      <p className="text-helper text-destructive">
                        {errors.place_name.message as string}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="latitude" className="flex items-center gap-2">
                        Latitude
                        <RequiredDot />
                      </Label>
                      <Controller
                        control={control}
                        name="latitude"
                        render={({ field }) => (
                          <Input
                            id="latitude"
                            inputMode="decimal"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              const num = v === '' ? null : Number(v);
                              field.onChange(num);
                              if (typeof num === 'number' && typeof watchedLng === 'number') {
                                setMarkerPosition([num, watchedLng]);
                              }
                            }}
                            placeholder="-90 to 90"
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude" className="flex items-center gap-2">
                        Longitude
                        <RequiredDot />
                      </Label>
                      <Controller
                        control={control}
                        name="longitude"
                        render={({ field }) => (
                          <Input
                            id="longitude"
                            inputMode="decimal"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              const num = v === '' ? null : Number(v);
                              field.onChange(num);
                              if (typeof num === 'number' && typeof watchedLat === 'number') {
                                setMarkerPosition([watchedLat, num]);
                              }
                            }}
                            placeholder="-180 to 180"
                          />
                        )}
                      />
                    </div>
                  </div>
                  {(errors.latitude?.message || errors.longitude?.message) && (
                    <p className="text-helper text-destructive">
                      {(errors.latitude?.message || errors.longitude?.message) as string}
                    </p>
                  )}
                </section>

                {/* Details */}
                <section className="space-y-4">
                  <h3 className="text-body font-medium">Details</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Event type
                    <RequiredDot />
                    <HelpTextTooltip content="The kind of event — for example a workshop, field visit, training, or community consultation." />
                  </Label>
                  <Controller
                    control={control}
                    name="event_type"
                    render={({ field }) => (
                      <SelectIATI
                        groups={FIELD_TRIP_EVENT_TYPE_GROUPS}
                        value={EVENT_TYPE_ENUM_TO_CODE[field.value]}
                        onValueChange={(code) => {
                          const next = EVENT_TYPE_CODE_TO_ENUM[code];
                          if (next) field.onChange(next);
                        }}
                        placeholder="Choose event type"
                        dropdownId="field-trip-event-type"
                      />
                    )}
                  />
                </div>

                {eventType === 'other' && (
                  <div className="space-y-2">
                    <Label htmlFor="event_type_other" className="flex items-center gap-2">
                      Describe event type
                      <RequiredDot />
                      <HelpTextTooltip content="A short label for the event type when it doesn't fit any of the predefined categories." />
                    </Label>
                    <Input
                      id="event_type_other"
                      {...register('event_type_other')}
                      placeholder="e.g. Donor visit"
                    />
                    {errors.event_type_other?.message && (
                      <p className="text-helper text-destructive">
                        {errors.event_type_other.message as string}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  Title
                  <RequiredDot />
                  <HelpTextTooltip content="A short, recognisable name for the trip — used in lists and summaries." />
                </Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g. Inception workshop in Yangon"
                />
                {errors.title?.message && (
                  <p className="text-helper text-destructive">{errors.title.message as string}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event_date" className="flex items-center gap-2">
                    Start date
                    <HelpTextTooltip content="The day the trip took place. For multi-day trips, this is the first day." />
                  </Label>
                  <Controller
                    control={control}
                    name="event_date"
                    render={({ field }) => (
                      <DatePicker
                        id="event_date"
                        value={field.value ?? ''}
                        onChange={(value) => field.onChange(value || null)}
                        placeholder="Select start date"
                        dropdownId="field-trip-event-date"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_end_date" className="flex items-center gap-2">
                    End date
                    <HelpTextTooltip content="Optional. The last day if the trip spanned multiple days." />
                  </Label>
                  <Controller
                    control={control}
                    name="event_end_date"
                    render={({ field }) => (
                      <DatePicker
                        id="event_end_date"
                        value={field.value ?? ''}
                        onChange={(value) => field.onChange(value || null)}
                        placeholder="Select end date"
                        dropdownId="field-trip-event-end-date"
                      />
                    )}
                  />
                  {errors.event_end_date?.message && (
                    <p className="text-helper text-destructive">
                      {errors.event_end_date.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="narrative" className="flex items-center gap-2">
                  Description
                  <HelpTextTooltip content="A narrative of what happened — who was involved, what was discussed or done, and the main outcomes." />
                </Label>
                <Textarea
                  id="narrative"
                  rows={5}
                  {...register('narrative')}
                  placeholder="Brief description of the trip, who was involved, outcomes…"
                />
              </div>

            </section>

            {/* Photos & Documents */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-medium">Photos &amp; Documents</h3>
                <HelpTextTooltip content="Attach photos and supporting documents from this trip. Images are auto-classified as photos; everything else is treated as a document." />
              </div>

              {attachmentsLocked ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Save this field trip first, then reopen it to add photos and documents.
                  </AlertDescription>
                </Alert>
              ) : (
                <div
                  className={cn(
                    'flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted p-8 text-center transition-all',
                    isDragOver
                      ? 'scale-[1.01] border-primary bg-primary/10'
                      : 'border-input hover:border-slate-400',
                    uploading && 'pointer-events-none opacity-70',
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  {uploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload
                      className={cn(
                        'h-10 w-10',
                        isDragOver ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  )}
                  <div>
                    <p className="text-body font-medium text-foreground">
                      {uploading
                        ? 'Uploading…'
                        : isDragOver
                          ? 'Drop your files here'
                          : 'Drag & drop files here, or click to browse'}
                    </p>
                    <p className="mt-1 text-helper text-muted-foreground">
                      Photos (JPG, PNG, GIF…) and documents (PDF, DOCX, XLSX…) — up to 10MB each
                    </p>
                  </div>
                </div>
              )}

              {!attachmentsLocked && attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((a) => {
                    const isPhoto = a.media_type === 'photo';
                    return (
                      <Card key={a.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                            {isPhoto ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={a.thumbnail_url || a.url}
                                alt={a.caption || a.file_name || 'photo'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 truncate text-body font-medium text-primary hover:underline"
                            >
                              {a.title || a.file_name || (isPhoto ? 'Photo' : 'Document')}
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                            <Input
                              placeholder={isPhoto ? 'Caption (optional)' : 'Title'}
                              defaultValue={(isPhoto ? a.caption : a.title) ?? a.file_name ?? ''}
                              onBlur={(e) => {
                                const next = e.target.value || null;
                                const key = isPhoto ? 'caption' : 'title';
                                if (((isPhoto ? a.caption : a.title) ?? null) !== next) {
                                  updateAttachment(a, { [key]: next } as any);
                                }
                              }}
                              className="h-8 text-helper"
                            />
                            {!isPhoto && (
                              <Textarea
                                placeholder="Description (optional)"
                                defaultValue={a.description ?? ''}
                                rows={2}
                                onBlur={(e) => {
                                  const next = e.target.value || null;
                                  if ((a.description ?? null) !== next) {
                                    updateAttachment(a, { description: next });
                                  }
                                }}
                                className="text-helper"
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeAttachment(a)}
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={savingDetails} className="flex items-center gap-2">
              {savingDetails ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FieldTripModal;
