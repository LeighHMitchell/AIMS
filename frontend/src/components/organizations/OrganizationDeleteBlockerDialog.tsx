"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface BlockedOrganization {
  id: string;
  name: string;
  references: string[];
}

interface OrganizationDeleteBlockerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Organisations that could not be deleted because they are still referenced. */
  organizations: BlockedOrganization[];
  /**
   * Whether these orgs were *skipped* during a larger batch (some others were
   * deleted) vs. a single/all-blocked attempt. Only changes the wording.
   */
  skipped?: boolean;
}

/**
 * Read-only dialog explaining why one or more organisations cannot be deleted.
 * There is intentionally no delete/confirm action here — the user must remove
 * or reassign the referencing records first.
 */
export function OrganizationDeleteBlockerDialog({
  open,
  onOpenChange,
  organizations,
  skipped = false,
}: OrganizationDeleteBlockerDialogProps) {
  const count = organizations.length;
  const isSingle = count === 1;

  const title = skipped
    ? `${count} organisation${isSingle ? "" : "s"} skipped`
    : isSingle
    ? "Organisation can't be deleted"
    : `${count} organisations can't be deleted`;

  const description = skipped
    ? `${isSingle ? "This organisation" : "These organisations"} ${
        isSingle ? "was" : "were"
      } kept because ${
        isSingle ? "it is" : "they are"
      } still linked to other records. Remove or reassign the items below first.`
    : `${
        isSingle ? "This organisation is" : "These organisations are"
      } still linked to other records. Remove or reassign the items below before deleting.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-4 py-1">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="rounded-md border border-border bg-surface-muted/40 p-3"
            >
              <p className="text-body font-medium text-foreground">{org.name}</p>
              <ul className="mt-1.5 list-disc pl-5 space-y-0.5">
                {org.references.length > 0 ? (
                  org.references.map((ref, i) => (
                    <li key={i} className="text-body text-muted-foreground">
                      {ref}
                    </li>
                  ))
                ) : (
                  <li className="text-body text-muted-foreground">
                    Linked records could not be verified
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
