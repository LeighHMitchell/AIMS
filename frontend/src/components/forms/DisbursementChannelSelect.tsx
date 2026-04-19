import React from 'react';
import { DISBURSEMENT_CHANNEL_LABELS, DisbursementChannel } from '@/types/transaction';
import { ChevronsUpDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

const DISBURSEMENT_CHANNEL_SHORT_LABELS: Record<DisbursementChannel, string> = {
  '1': 'Central Ministry/Treasury',
  '2': 'Direct to Institution',
  '3': 'Aid in Kind (Third Party)',
  '4': 'Aid in Kind (Donor)'
};

interface DisbursementChannelSelectProps {
  value?: string;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function DisbursementChannelSelect({
  value = '',
  onValueChange,
  placeholder = 'Select disbursement channel',
  disabled = false,
  className = '',
  id,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: DisbursementChannelSelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const selectedLabel = value ? DISBURSEMENT_CHANNEL_SHORT_LABELS[value as DisbursementChannel] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {selectedLabel ? (
            <span className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{value}</span>
              <span className="font-medium">{selectedLabel}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-2">
          {value && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onValueChange?.(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange?.(null);
                }
              }}
              className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Clear selection"
            >
              <span className="text-helper">×</span>
            </div>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandList>
            <CommandGroup>
              {Object.entries(DISBURSEMENT_CHANNEL_SHORT_LABELS).map(([code, shortLabel]) => {
                const fullLabel = DISBURSEMENT_CHANNEL_LABELS[code as DisbursementChannel];
                return (
                  <CommandItem
                    key={code}
                    onSelect={() => {
                      onValueChange?.(code);
                      setOpen(false);
                    }}
                    className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{code}</span>
                        <span className="font-medium text-foreground">{shortLabel}</span>
                      </div>
                      <div className="text-body text-muted-foreground mt-1.5 leading-relaxed">
                        {fullLabel}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default DisbursementChannelSelect;
