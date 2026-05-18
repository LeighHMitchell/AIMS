'use client';

import React, { useEffect } from 'react';
import { MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, useMap, useMarkerContext } from '@/components/ui/map';
import { LocationPinIcon } from '@/components/maps/LocationPinIcon';

interface Location {
  id?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  site_type?: string;
  state_region_name?: string;
  township_name?: string;
  district_name?: string;
  village_name?: string;
  address?: string;
  city?: string;
  description?: string;
  location_description?: string;
  activity_location_description?: string;
  activity?: {
    id?: string;
    title?: string;
    acronym?: string;
    organization_name?: string;
    organization_acronym?: string;
  } | null;
  // Field-report signals that drive the amber pin + camera badge.
  field_report_count?: number;
  fieldReportCount?: number;
  field_report_photo_count?: number;
  fieldReportPhotoCount?: number;
  [key: string]: unknown;
}

interface SimpleActivityMarkersLayerProps {
  locations: Location[];
  activityTitle?: string;
  activityAcronym?: string;
  focusedLocationId?: string | null;
}

// Opens the marker's popup whenever `focused` flips true. Sits inside the
// MapMarker subtree so it can access the marker instance via context.
function FocusOpener({ focused }: { focused: boolean }) {
  const { marker } = useMarkerContext();
  useEffect(() => {
    if (!focused) return;
    const popup = marker.getPopup();
    if (popup && !popup.isOpen()) {
      marker.togglePopup();
    }
  }, [focused, marker]);
  return null;
}

const getFullAddress = (location: Location): string => {
  const parts = [];
  if (location.address) parts.push(location.address);
  if (location.village_name) parts.push(location.village_name);
  if (location.township_name) parts.push(location.township_name);
  if (location.district_name) parts.push(location.district_name);
  if (location.state_region_name) parts.push(location.state_region_name);
  if (location.city) parts.push(location.city);
  return parts.join(', ');
};

// Individual marker component
function SimpleLocationMarker({
  location,
  activityTitle,
  activityAcronym,
  focused,
}: {
  location: Location;
  activityTitle?: string;
  activityAcronym?: string;
  focused: boolean;
}) {
  const { map } = useMap();

  const lat = Number(location.latitude);
  const lng = Number(location.longitude);

  if (isNaN(lat) || isNaN(lng)) return null;

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1500,
      });
    }
  };

  const address = getFullAddress(location);
  const linkedActivityTitle = location.activity?.title || activityTitle;
  const linkedActivityAcronym = location.activity?.acronym || activityAcronym;
  const linkedActivityId = location.activity?.id;
  const titleWithAcronym = linkedActivityAcronym
    ? `${linkedActivityTitle} (${linkedActivityAcronym})`
    : linkedActivityTitle;

  const infoContent = (
    <div>
      <div className="bg-surface-muted px-3 py-2 border-b border-border pr-7">
        <p className="font-semibold text-helper text-foreground leading-snug">
          {location.location_name || 'Unnamed Location'}
        </p>
        {linkedActivityTitle && (
          linkedActivityId ? (
            <a
              href={`/activities/${linkedActivityId}`}
              onClick={(e) => e.stopPropagation()}
              className="block text-[11px] text-muted-foreground hover:text-primary mt-0.5 line-clamp-2 leading-snug no-underline"
            >
              {titleWithAcronym}
            </a>
          ) : (
            <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
              {titleWithAcronym}
            </div>
          )
        )}
      </div>
      <div className="p-3 text-[10px] space-y-1">
        {location.location_description && (
          <div className="text-muted-foreground leading-snug">{location.location_description}</div>
        )}
        {location.activity_location_description && (
          <div className="text-muted-foreground leading-snug">{location.activity_location_description}</div>
        )}
        {address && (
          <div className="text-muted-foreground leading-snug">{address}</div>
        )}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="font-mono text-muted-foreground">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
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
    <MapMarker
      longitude={lng}
      latitude={lat}
      onDoubleClick={handleDoubleClick}
    >
      {/* Custom marker — amber when the location has field reports. */}
      <MarkerContent>
        <LocationPinIcon
          size={28}
          hasFieldReports={
            (location.fieldReportCount ?? location.field_report_count ?? 0) > 0
          }
          hasPhotos={
            (location.fieldReportPhotoCount ?? location.field_report_photo_count ?? 0) > 0
          }
        />
      </MarkerContent>

      {/* Tooltip on hover */}
      <MarkerTooltip className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden">
        {infoContent}
      </MarkerTooltip>

      {/* Popup on click - same content, stays until clicked away */}
      <MarkerPopup className="!p-0 !bg-white !text-foreground max-w-[300px] overflow-hidden" closeButton>
        {infoContent}
      </MarkerPopup>

      <FocusOpener focused={focused} />
    </MapMarker>
  );
}

export default function SimpleActivityMarkersLayer({
  locations,
  activityTitle,
  activityAcronym,
  focusedLocationId,
}: SimpleActivityMarkersLayerProps) {
  // Filter to only locations with valid coordinates
  const validLocations = locations.filter(loc => {
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });

  return (
    <>
      {validLocations.map(location => (
        <SimpleLocationMarker
          key={location.id || `${location.latitude}-${location.longitude}`}
          location={location}
          activityTitle={activityTitle}
          activityAcronym={activityAcronym}
          focused={!!focusedLocationId && location.id === focusedLocationId}
        />
      ))}
    </>
  );
}
