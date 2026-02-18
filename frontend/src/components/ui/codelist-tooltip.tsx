"use client"

import React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getCodelistDefinition,
  CodelistType,
} from "@/data/codelist-definitions"

interface CodelistTooltipProps {
  /** The type of codelist (aid_type, finance_type, flow_type, tied_status) */
  type: CodelistType;
  /** The code value to look up */
  code: string;
  /** Optional custom display label (defaults to definition name) */
  displayLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CodelistTooltip - Displays IATI/DAC codelist values with hover tooltips
 * 
 * Shows the code, full name, and official definition on hover.
 * Tooltips are keyboard accessible (focus triggers tooltip).
 * Consistent definitions across the entire app.
 */
export function CodelistTooltip({
  type,
  code,
  displayLabel,
  className = ""
}: CodelistTooltipProps) {
  const definition = getCodelistDefinition(type, code);

  // If no definition found, just display the label/code without tooltip
  if (!definition) {
    return <span className={className}>{displayLabel || code}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={`cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-0.5 -mx-0.5 ${className}`}
            tabIndex={0}
            role="button"
            aria-label={`${definition.name}. Press to show definition.`}
          >
            {displayLabel || definition.name}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-sm bg-white border shadow-lg p-4 z-[100]"
          side="top"
          sideOffset={5}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="text-left">
            {/* Code and Title - visually distinct */}
            <div className="mb-2">
              <span className="font-mono text-sm bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {definition.code}
              </span>
              <span className="font-medium text-sm text-foreground ml-2">
                {definition.name}
              </span>
            </div>

            {/* Definition - flows naturally */}
            <p className="text-sm text-muted-foreground">
              {definition.definition[0]} {definition.definition[1]}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * CodelistTooltipInline - A more compact version for inline use
 * Shows just the code with tooltip on hover
 */
export function CodelistTooltipInline({
  type,
  code,
  className = ""
}: Omit<CodelistTooltipProps, 'displayLabel'>) {
  const definition = getCodelistDefinition(type, code);

  if (!definition) {
    return <span className={className}>{code}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={`cursor-help font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
            tabIndex={0}
            role="button"
            aria-label={`Code ${definition.code}: ${definition.name}`}
          >
            {definition.code}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-sm bg-white border shadow-lg p-4 z-[100]"
          side="top"
          sideOffset={5}
        >
          <div className="text-left">
            <div className="mb-2">
              <span className="font-mono text-sm bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {definition.code}
              </span>
              <span className="font-medium text-sm text-foreground ml-2">
                {definition.name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {definition.definition[0]} {definition.definition[1]}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}






