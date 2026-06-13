'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  ImageIcon,
  FileText,
  Pencil,
  Trash2,
  Copy,
  MapPin,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-fetch';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import {
  FIELD_REPORT_EVENT_TYPE_LABELS,
  type FieldTrip,
} from '@/lib/schemas/field-report';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Map, MapMarker, MarkerContent } from '@/components/ui/map';
import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FieldTripsSectionProps {
  activityId: string;
  canEdit?: boolean;
  /** Bump to force a re-fetch (e.g. after the modal saves). */
  refreshKey?: number;
  /** Adding is driven by the buttons above the locations table now; kept
   *  optional so the parent can still pass its handler without effect. */
  onAdd?: () => void;
  /** Shared with the Activity Locations table so both switch together.
   *  Defaults to 'table' when used standalone. */
  viewMode?: 'cards' | 'table';
  onEdit: (trip: FieldTrip) => void;
  /** Called after the trip list changes here (e.g. a delete) so the parent
   *  can keep dependent views — like the map's amber pins — in sync. */
  onChanged?: () => void;
}

// "2023-07-12" → "12 Jul 2023". parseISO keeps date-only values in local
// time so the day doesn't shift in negative-UTC timezones.
const fmtDate = (d: string): string => {
  try {
    return format(parseISO(d), 'd MMM yyyy');
  } catch {
    return d;
  }
};

const formatDateRange = (start?: string | null, end?: string | null): string | null => {
  if (!start && !end) return null;
  if (start && end && start !== end) return `${fmtDate(start)} → ${fmtDate(end)}`;
  const single = start || end;
  return single ? fmtDate(single) : null;
};

// Map thumbnail for the card view — mirrors the Activity Locations card
// thumbnail (LocationCard's MapThumbnail) but with an amber marker so field
// trips stay visually distinct from red activity sites.
function FieldTripThumbnail({
  latitude,
  longitude,
  className = 'w-32 h-24',
}: {
  latitude?: number | string | null;
  longitude?: number | string | null;
  className?: string;
}) {
  const lat = latitude == null ? NaN : Number(latitude);
  const lng = longitude == null ? NaN : Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div
        className={`${className} bg-muted rounded flex items-center justify-center border border-border shrink-0`}
      >
        <MapPin className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div
      className={`${className} bg-muted rounded overflow-hidden relative border border-border shrink-0 [&_.maplibregl-ctrl-attrib]:hidden [&_.mapboxgl-ctrl-attrib]:hidden`}
    >
      <Map
        center={[lng, lat]}
        zoom={13}
        styles={{
          light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
          dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        }}
      >
        <MapMarker longitude={lng} latitude={lat}>
          <MarkerContent>
            <div className="w-3 h-3 bg-amber-600 rounded-full border-2 border-white shadow-sm" />
          </MarkerContent>
        </MapMarker>
      </Map>
    </div>
  );
}

export const FieldTripsSection: React.FC<FieldTripsSectionProps> = ({
  activityId,
  canEdit = true,
  refreshKey = 0,
  viewMode = 'table',
  onEdit,
  onChanged,
}) => {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [trips, setTrips] = useState<FieldTrip[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/activities/${activityId}/field-trips`);
      if (!res.ok) throw new Error('Failed to load field trips');
      const data = await res.json();
      setTrips(data.fieldTrips ?? []);
    } catch (err: any) {
      console.error('[FieldTripsSection] fetch error:', err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips, refreshKey]);

  const handleDelete = async (trip: FieldTrip) => {
    const ok = await confirm({
      title: 'Delete field trip?',
      description: `"${trip.title}" and all its photos and documents will be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
    });
    if (!ok) return;
    try {
      const res = await apiFetch(
        `/api/activities/${activityId}/field-trips/${trip.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to delete field trip');
      toast.success('Field trip deleted');
      setTrips((prev) => prev.filter((t) => t.id !== trip.id));
      onChanged?.();
    } catch (err: any) {
      console.error('[FieldTripsSection] delete error:', err);
      toast.error(err.message || 'Failed to delete field trip');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Field Trips</h3>
        <HelpTextTooltip content="One-off events such as workshops, visits, and M&E missions. Each carries its own location and shows as an amber pin on the map, separate from activity sites." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading field trips…
        </div>
      ) : trips.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <img
            src="/images/empty-field-trips.png"
            alt="No field trips"
            className="h-28 w-28 object-contain"
          />
          <div className="text-body font-medium">No field trips yet</div>
          <p className="max-w-md text-helper text-muted-foreground">
            Log a workshop, site visit, or community consultation: where it happened, what happened,
            and any photos or documents. Use the “Add Field Trip” button above the locations table.
          </p>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trips.map((trip) => {
            const typeLabel =
              trip.event_type === 'other' && trip.event_type_other
                ? trip.event_type_other
                : FIELD_REPORT_EVENT_TYPE_LABELS[trip.event_type];
            const dateRange = formatDateRange(trip.event_date, trip.event_end_date);
            const photoCount = trip.photo_count ?? 0;
            const documentCount = trip.document_count ?? 0;
            return (
              <Card
                key={trip.id}
                className="transition-all duration-200 hover:shadow-card-hover w-full"
              >
                <CardContent className="p-5 relative">
                  <div className="flex items-start gap-5">
                    <FieldTripThumbnail
                      latitude={trip.latitude}
                      longitude={trip.longitude}
                    />

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-foreground break-words">
                          {trip.title}
                        </h4>
                        <div className="text-helper text-muted-foreground">{typeLabel}</div>

                        {trip.narrative && (
                          <p className="text-body text-muted-foreground line-clamp-3 whitespace-normal break-words">
                            {trip.narrative}
                          </p>
                        )}

                        <div className="text-body text-muted-foreground">
                          {trip.place_name || (
                            <span className="italic">No place name</span>
                          )}
                        </div>

                        {trip.latitude != null && trip.longitude != null && (
                          <div className="text-body text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {Number(trip.latitude).toFixed(4)},{' '}
                              {Number(trip.longitude).toFixed(4)}
                            </span>
                            <a
                              href={`https://www.google.com/maps?q=${Number(trip.latitude)},${Number(trip.longitude)}&t=k`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Open in Google Maps"
                              aria-label="Open in Google Maps"
                              className="hover:opacity-80 flex-shrink-0 ml-0.5"
                            >
                              <img
                                src="https://www.gstatic.com/marketing-cms/assets/images/0f/9a/58f1d92b46069b4a8bdc556b612c/google-maps.webp"
                                alt=""
                                className="h-3.5 w-3.5"
                              />
                            </a>
                          </div>
                        )}

                        {dateRange && (
                          <div className="text-body text-muted-foreground">{dateRange}</div>
                        )}

                        {(photoCount > 0 || documentCount > 0) && (
                          <div className="flex flex-wrap items-center gap-3 text-helper text-muted-foreground">
                            {photoCount > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon className="h-3.5 w-3.5" />
                                {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                              </span>
                            )}
                            {documentCount > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="mt-auto pt-2 flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Field trip actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => onEdit(trip)}>
                                <Pencil className="h-4 w-4 mr-2 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(trip)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <TooltipProvider>
          <TableContainer className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Trip Name and Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                  {canEdit && <TableHead className="w-[100px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => {
                  const typeLabel =
                    trip.event_type === 'other' && trip.event_type_other
                      ? trip.event_type_other
                      : FIELD_REPORT_EVENT_TYPE_LABELS[trip.event_type];
                  const dateRange = formatDateRange(trip.event_date, trip.event_end_date);
                  const photoCount = trip.photo_count ?? 0;
                  const documentCount = trip.document_count ?? 0;
                  return (
                    <TableRow key={trip.id}>
                      <TableCell className="text-body align-top">
                        {typeLabel}
                      </TableCell>
                      <TableCell className="text-body align-top">
                        <div className="font-medium">{trip.title}</div>
                        {trip.narrative && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-2 whitespace-normal break-words cursor-default text-helper text-muted-foreground">
                                {trip.narrative}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <p>{trip.narrative}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {(photoCount > 0 || documentCount > 0) && (
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-helper text-muted-foreground">
                            {photoCount > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <ImageIcon className="h-3.5 w-3.5" />
                                {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                              </span>
                            )}
                            {documentCount > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-body align-top">
                        <div>{trip.place_name || 'N/A'}</div>
                        {trip.latitude != null && trip.longitude != null && (
                          <div className="group/coords flex items-center gap-1.5 text-helper text-muted-foreground mt-0.5 w-fit">
                            <span>
                              {Number(trip.latitude).toFixed(4)}, {Number(trip.longitude).toFixed(4)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const coords = `${Number(trip.latitude).toFixed(6)}, ${Number(trip.longitude).toFixed(6)}`;
                                navigator.clipboard.writeText(coords);
                                toast.success('Coordinates copied');
                              }}
                              className="opacity-0 group-hover/coords:opacity-100 transition-opacity hover:text-foreground"
                              title="Copy coordinates"
                              aria-label="Copy coordinates"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <a
                              href={`https://www.google.com/maps?q=${Number(trip.latitude)},${Number(trip.longitude)}&t=k`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Open in Google Maps"
                              aria-label="Open in Google Maps"
                              className="opacity-0 group-hover/coords:opacity-100 transition-opacity hover:opacity-80 flex-shrink-0"
                            >
                              <img
                                src="https://www.gstatic.com/marketing-cms/assets/images/0f/9a/58f1d92b46069b4a8bdc556b612c/google-maps.webp"
                                alt=""
                                className="h-3.5 w-3.5"
                              />
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-body align-top">
                        {dateRange || '-'}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="align-top">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => onEdit(trip)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                              title="Edit field trip"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(trip)}
                              className="p-1.5 rounded hover:bg-muted text-destructive"
                              title="Delete field trip"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TooltipProvider>
      )}

      <ConfirmDialog />
    </div>
  );
};

export default FieldTripsSection;
