"use client";

import * as React from "react";
import { Copy, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AutoRefFieldProps {
  value?: string | null;
  label?: string;
  className?: string;
}

/**
 * Read-only display of an app-generated ID (auto_ref) with lock-on-hover
 * and a persistent copy button. Used for activities, transactions, budgets,
 * and planned disbursements.
 */
export function AutoRefField({ value, label = "ID", className }: AutoRefFieldProps) {
  const [hovered, setHovered] = React.useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${value}`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <label className="text-xs font-medium text-muted-foreground w-fit cursor-help">
              {label}
            </label>
          </TooltipTrigger>
          <TooltipContent>Unique app-generated identifier</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div
        className="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <input
          readOnly
          value={value ?? ""}
          placeholder="Will be assigned on save"
          className={cn(
            "w-full rounded-md border border-input bg-muted px-3 py-2 pr-16 text-sm",
            "text-muted-foreground font-mono tracking-wide",
            "focus:outline-none focus:ring-0 cursor-default",
            !value && "italic",
          )}
        />

        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {hovered && value && (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Immutable" />
          )}
          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded hover:bg-accent transition-colors"
              aria-label="Copy ID"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
