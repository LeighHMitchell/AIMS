import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrgRefDisplay } from '@/lib/org-ref-normalizer';

interface NormalizedOrgRefProps {
  ref?: string | null;
  className?: string;
  showValidationIndicator?: boolean;
}

/**
 * Component to display a normalized organization reference/ID
 * 
 * Features:
 * - Normalizes refs by removing spaces and converting to uppercase
 * - Validates IATI format and shows warning for invalid refs
 * - Preserves original data (doesn't mutate stored values)
 * 
 * @example
 * <NormalizedOrgRef ref="FR-RCS-523 369 619" />
 * // Displays: FR-RCS-523369619
 */
export function NormalizedOrgRef({ 
  ref: orgRef, 
  className = '',
  showValidationIndicator = true 
}: NormalizedOrgRefProps) {
  const refDisplay = getOrgRefDisplay(orgRef);
  
  if (!refDisplay.normalized) {
    return <span className="text-muted-foreground text-sm">Not set</span>;
  }
  
  const baseClasses = `text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 ${className}`;
  const invalidClasses = !refDisplay.isValid && showValidationIndicator 
    ? 'border border-red-300' 
    : '';
  
  return (
    <span className="flex items-center gap-1">
      <code className={`${baseClasses} ${invalidClasses}`}>
        {refDisplay.normalized}
      </code>
      {!refDisplay.isValid && showValidationIndicator && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-red-500 text-xs cursor-help">⚠</span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Invalid IATI organization identifier format</p>
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

