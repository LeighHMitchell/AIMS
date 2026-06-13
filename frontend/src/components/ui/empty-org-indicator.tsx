"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type OrgRole = "provider" | "receiver";

const COPY: Record<OrgRole, string> = {
  provider:
    "No provider organisation was recorded for this transaction. Under the IATI standard the provider can be left blank, for example when the funds originate outside the activities reported here, or the reporting organisation chose not to disclose it.",
  receiver:
    "No receiver organisation was recorded for this transaction. Under the IATI standard the receiver can be left blank, for example when the funds are spent directly, the recipient isn't an organisation, or the reporting organisation chose not to disclose it.",
};

interface EmptyOrgIndicatorProps {
  /** Which side of the transaction is missing — tailors the explanation. */
  role: OrgRole;
  /** Glyph shown in place of an organisation name. Defaults to an em-dash. */
  placeholder?: string;
  /** Tooltip placement. */
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * Renders a dash placeholder for a missing provider/receiver organisation with a
 * hover tooltip explaining *why* the cell is blank. Self-provides a
 * TooltipProvider so it works anywhere (tables, hover cards, overlays) without
 * relying on an app-wide provider.
 */
export function EmptyOrgIndicator({
  role,
  placeholder = "—",
  side = "top",
  className,
}: EmptyOrgIndicatorProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "cursor-help text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-2",
              className
            )}
            aria-label={`No ${role} organisation recorded`}
          >
            {placeholder}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p className="text-helper">{COPY[role]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default EmptyOrgIndicator;
