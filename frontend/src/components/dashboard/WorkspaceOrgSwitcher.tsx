"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { OrganizationSearchableSelect } from "@/components/ui/organization-searchable-select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrganizations } from "@/hooks/use-organizations";

interface WorkspaceOrgSwitcherProps {
  /** Currently-viewed organisation id. */
  value: string;
  /** Called with the chosen organisation id. */
  onChange: (orgId: string) => void;
  /** Called when the selection is cleared (X) — return to the user's own org. */
  onReset?: () => void;
}

/**
 * Compact organisation switcher for the Workspace header. Super users use it to
 * view the workspace from another organisation's perspective. Reuses the exact
 * same OrganizationSearchableSelect the Activity Editor's "Reporting
 * Organisation" field renders, so it looks and behaves identically — minus the
 * editor-only lock/save wrapper, which has no meaning for switching the view.
 */
export function WorkspaceOrgSwitcher({ value, onChange, onReset }: WorkspaceOrgSwitcherProps) {
  const { organizations, loading } = useOrganizations();

  return (
    <div className="w-[640px] max-w-[70vw]">
      <OrganizationSearchableSelect
        organizations={organizations}
        value={value}
        onValueChange={(v) => {
          // Clearing (the X) snaps the workspace back to the user's own org.
          if (v) onChange(v);
          else onReset?.();
        }}
        placeholder="Select organisation..."
        searchPlaceholder="Search organisations by name, acronym, or IATI ID..."
        disabled={loading}
      />
    </div>
  );
}

/**
 * Inline "(Viewing as if you were X)" note shown next to the super user's own
 * organisation in the Workspace header when they've switched to view another
 * org's perspective. Resolves the org's display label from the same list.
 */
export function ViewingAsIndicator({ orgId }: { orgId: string }) {
  const { organizations } = useOrganizations();
  const org = organizations.find((o) => o.id === orgId);
  if (!org) return null;
  const label = org.acronym || org.name;
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-body font-normal text-muted-foreground align-middle">
      {`(Viewing ${label}’s workspace)`}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-body">
              As a super user you can view the workspace from another organisation
              without changing who you are. All data on this page is scoped to{" "}
              {label} as if you were a member of that organisation. Your own account,
              role, and permissions are unchanged — switch back any time with the
              organisation selector.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}
