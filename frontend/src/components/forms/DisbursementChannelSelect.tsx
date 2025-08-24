import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DISBURSEMENT_CHANNEL_LABELS, DisbursementChannel } from '@/types/transaction';

// Shorter labels for the trigger display to prevent clipping
const DISBURSEMENT_CHANNEL_SHORT_LABELS: Record<DisbursementChannel, string> = {
  '1': 'Central Ministry/Treasury',
  '2': 'Direct to Institution', 
  '3': 'Aid in Kind via Third Party',
  '4': 'Not Reported'
};

interface DisbursementChannelSelectProps {
  value?: string;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DisbursementChannelSelect({
  value = '',
  onValueChange,
  placeholder = 'Select disbursement channel',
  disabled = false,
  className = '',
  id
}: DisbursementChannelSelectProps) {
  
  const handleValueChange = (selectedValue: string) => {
    // If the selected value is empty or the placeholder, pass null
    if (!selectedValue || selectedValue === '') {
      onValueChange?.(null);
    } else {
      onValueChange?.(selectedValue);
    }
  };

  return (
    <Select
      value={value || ''}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Disbursement channel options */}
        {Object.entries(DISBURSEMENT_CHANNEL_SHORT_LABELS).map(([code, shortLabel]) => {
          const fullLabel = DISBURSEMENT_CHANNEL_LABELS[code as DisbursementChannel];
          return (
            <SelectItem key={code} value={code}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {code}
                  </span>
                  <span className="font-medium">{shortLabel}</span>
                </div>
                <span className="text-xs text-muted-foreground pl-8">{fullLabel}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default DisbursementChannelSelect;
