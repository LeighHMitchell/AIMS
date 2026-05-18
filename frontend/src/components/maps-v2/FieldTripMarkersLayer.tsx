'use client';

import React from 'react';
import { MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, useMap } from '@/components/ui/map';
import { LocationPinIcon } from '@/components/maps/LocationPinIcon';
import { format, parseISO } from 'date-fns';
import {
  FIELD_REPORT_EVENT_TYPE_LABELS,
  type FieldReportEventType,
} from '@/lib/schemas/field-report';

export interface FieldTripMarker {
  id?: string;
  title?: string;
  place_name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  event_type?: FieldReportEventType;
  event_type_other?: string | null;
  event_date?: string | null;
  event_end_date?: string | null;
  narrative?: string | null;
}

interface FieldTripMarkersLayerProps {
  fieldTrips: FieldTripMarker[];
}

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

function FieldTripMarkerPin({ trip }: { trip: FieldTripMarker }) {
  const { map } = useMap();

  const lat = Number(trip.latitude);
  const lng = Number(trip.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (map) {
      map.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 });
    }
  };

  const typeLabel =
    trip.event_type === 'other' && trip.event_type_other
      ? trip.event_type_other
      : trip.event_type
        ? FIELD_REPORT_EVENT_TYPE_LABELS[trip.event_type]
        : null;
  const dateRange = formatDateRange(trip.event_date, trip.event_end_date);

  const infoContent = (
    <div>
      <div className="bg-surface-muted px-3 py-2 border-b border-border pr-7">
        <p className="font-semibold text-helper text-foreground leading-snug">
          {trip.title || 'Field trip'}
        </p>
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          Field trip{typeLabel ? ` · ${typeLabel}` : ''}
        </div>
      </div>
      <div className="p-3 text-[10px] space-y-1">
        {trip.place_name && (
          <div className="text-muted-foreground leading-snug">{trip.place_name}</div>
        )}
        {dateRange && (
          <div className="text-muted-foreground leading-snug">{dateRange}</div>
        )}
        {trip.narrative && (
          <div className="text-muted-foreground leading-snug line-clamp-3">{trip.narrative}</div>
        )}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="font-mono text-muted-foreground">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}&t=k`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Maps"
            className="hover:opacity-80 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="https://www.gstatic.com/marketing-cms/assets/images/0f/9a/58f1d92b46069b4a8bdc556b612c/google-maps.webp"
              alt="Open in Google Maps"
              className="h-3.5 w-3.5"
            />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <MapMarker longitude={lng} latitude={lat} onDoubleClick={handleDoubleClick}>
      <MarkerContent>
        <LocationPinIcon size={28} variant="field-trip" />
      </MarkerContent>

      <MarkerTooltip className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden">
        {infoContent}
      </MarkerTooltip>

      <MarkerPopup className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden" closeButton>
        {infoContent}
      </MarkerPopup>
    </MapMarker>
  );
}

// Renders standalone field trips as amber pins, visually distinct from the
// red activity-site pins (SimpleActivityMarkersLayer) on the same map.
export default function FieldTripMarkersLayer({ fieldTrips }: FieldTripMarkersLayerProps) {
  const valid = fieldTrips.filter((t) => {
    const lat = Number(t.latitude);
    const lng = Number(t.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });

  return (
    <>
      {valid.map((trip, idx) => (
        <FieldTripMarkerPin key={trip.id || `ft-${idx}`} trip={trip} />
      ))}
    </>
  );
}
