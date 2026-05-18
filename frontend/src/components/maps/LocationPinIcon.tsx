'use client';

import React from 'react';
import { MapPin, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationPinIconProps {
  /** Pixel size of the pin glyph. Default 28. */
  size?: number;
  /** Render the field-report variant (amber). */
  hasFieldReports?: boolean;
  /** When true (and hasFieldReports is true), the corner badge shows a camera
   *  icon to signal that photos are attached. Otherwise the badge is a plain
   *  amber dot meaning "events recorded, no photos yet". */
  hasPhotos?: boolean;
  /** Selected/focused state — darkens the fill. */
  selected?: boolean;
  /**
   * Pin variant. 'location' (default) is the red activity-site pin.
   * 'field-trip' is the amber standalone field-trip pin (no corner badge),
   * so the two are visually distinct on the same map.
   */
  variant?: 'location' | 'field-trip';
  className?: string;
}

const FIELD_REPORT_FILL = '#D97706'; // amber-600
const FIELD_REPORT_FILL_SELECTED = '#92400E'; // amber-800
const DEFAULT_FILL = '#DC2626'; // red-600
const DEFAULT_FILL_SELECTED = '#7F1D1D'; // red-900
const FIELD_TRIP_FILL = '#D97706'; // amber-600
const FIELD_TRIP_FILL_SELECTED = '#92400E'; // amber-800

/**
 * Map pin used across every locations map in the app. Renders an amber pin and
 * a small corner badge when the location has field reports — a camera if any
 * report has photos, otherwise a solid dot meaning "events recorded".
 */
export const LocationPinIcon: React.FC<LocationPinIconProps> = ({
  size = 28,
  hasFieldReports = false,
  hasPhotos = false,
  selected = false,
  variant = 'location',
  className,
}) => {
  const isFieldTrip = variant === 'field-trip';
  const fill = isFieldTrip
    ? selected
      ? FIELD_TRIP_FILL_SELECTED
      : FIELD_TRIP_FILL
    : hasFieldReports
      ? selected
        ? FIELD_REPORT_FILL_SELECTED
        : FIELD_REPORT_FILL
      : selected
        ? DEFAULT_FILL_SELECTED
        : DEFAULT_FILL;
  // Field-trip pins never carry the field-report corner badge.
  const showBadge = !isFieldTrip && hasFieldReports;

  // Badge sits in the upper-right of the pin glyph. Sized relative to the pin
  // so it scales together if a caller passes a different `size`.
  const badgeSize = Math.max(12, Math.round(size * 0.45));
  const iconSize = Math.max(8, Math.round(badgeSize * 0.62));

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-label={
        isFieldTrip
          ? 'Field trip'
          : hasFieldReports
            ? hasPhotos
              ? 'Location with field reports and photos'
              : 'Location with field reports'
            : 'Location'
      }
    >
      <MapPin
        width={size}
        height={size}
        style={{ fill, stroke: '#FFFFFF', strokeWidth: 1.5 }}
      />
      {showBadge && (
        <span
          className="absolute flex items-center justify-center rounded-full bg-amber-500 ring-2 ring-white shadow-sm"
          style={{
            width: badgeSize,
            height: badgeSize,
            top: -Math.round(badgeSize * 0.15),
            right: -Math.round(badgeSize * 0.15),
          }}
          aria-hidden="true"
        >
          {hasPhotos ? (
            <Camera
              width={iconSize}
              height={iconSize}
              style={{ color: '#FFFFFF' }}
              strokeWidth={2.5}
            />
          ) : null}
        </span>
      )}
    </div>
  );
};

export default LocationPinIcon;
