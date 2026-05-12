'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';
import { LocationPickerDialog } from './LocationPickerDialog';
import { FieldReportModal } from './FieldReportModal';
import type { LocationSchema } from '@/lib/schemas/location';

interface QuickLogFieldEventButtonProps {
  activityId: string;
  existingLocations: LocationSchema[];
  /** Called when something changes that warrants refreshing the parent's
   *  locations list (a new location was created, or a field report was added). */
  onLocationsChanged?: () => void;
  canEdit?: boolean;
  /** Optional className for the trigger button. */
  className?: string;
}

export const QuickLogFieldEventButton: React.FC<QuickLogFieldEventButtonProps> = ({
  activityId,
  existingLocations,
  onLocationsChanged,
  canEdit = true,
  className,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState<LocationSchema | null>(null);

  if (!canEdit) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setPickerOpen(true)}
        className={className}
      >
        <CalendarPlus className="mr-2 h-4 w-4" />
        Log field event
      </Button>

      {pickerOpen && (
        <LocationPickerDialog
          activityId={activityId}
          existingLocations={existingLocations}
          onCancel={() => setPickerOpen(false)}
          onLocationChosen={(location, isNew) => {
            setPickerOpen(false);
            setActiveLocation(location);
            if (isNew) onLocationsChanged?.();
          }}
        />
      )}

      {activeLocation && (activeLocation as any).id && (
        <FieldReportModal
          activityId={activityId}
          locationId={(activeLocation as any).id as string}
          report={null}
          onClose={() => setActiveLocation(null)}
          onSaved={() => {
            setActiveLocation(null);
            onLocationsChanged?.();
          }}
        />
      )}
    </>
  );
};

export default QuickLogFieldEventButton;
