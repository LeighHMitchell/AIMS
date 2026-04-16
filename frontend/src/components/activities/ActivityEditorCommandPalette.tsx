"use client"

import React, { useMemo } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { modKeyLabel } from "@/hooks/useActivityEditorShortcuts"

export interface PaletteSection {
  id: string
  label: string
}

export interface PaletteGroup {
  title: string
  sections: PaletteSection[]
}

export interface PaletteAction {
  id: string
  label: string
  hint?: string
  onRun: () => void
}

interface ActivityEditorCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: PaletteGroup[]
  actions?: PaletteAction[]
  /** Called with a section id when the user chooses a section */
  onSelectSection: (sectionId: string) => void
}

/**
 * Quick-jump palette. Type any section or action name; press Enter to go.
 * Sections are grouped by their parent navigation group; actions live in a
 * separate group above sections for visibility.
 */
export function ActivityEditorCommandPalette({
  open,
  onOpenChange,
  groups,
  actions = [],
  onSelectSection,
}: ActivityEditorCommandPaletteProps) {
  const handleSection = (sectionId: string) => {
    onOpenChange(false)
    // Defer so the dialog-close animation doesn't fight the scroll
    requestAnimationFrame(() => onSelectSection(sectionId))
  }

  const handleAction = (action: PaletteAction) => {
    onOpenChange(false)
    requestAnimationFrame(() => action.onRun())
  }

  // Memoize flattened sections so CommandInput filtering is stable
  const flatGroups = useMemo(() => groups, [groups])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Jump to section or run action…"
        autoFocus
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {actions.length > 0 && (
          <CommandGroup heading="Actions">
            {actions.map((action) => (
              <CommandItem
                key={action.id}
                value={`action:${action.label}`}
                onSelect={() => handleAction(action)}
              >
                <span className="flex-1">{action.label}</span>
                {action.hint && (
                  <kbd className="pointer-events-none ml-auto text-xs text-muted-foreground">
                    {action.hint}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {flatGroups.map((group) => (
          <CommandGroup key={group.title} heading={group.title}>
            {group.sections.map((section) => (
              <CommandItem
                key={section.id}
                value={`${group.title} ${section.label}`}
                onSelect={() => handleSection(section.id)}
              >
                <span className="flex-1">{section.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {group.title}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
        <span>↑↓ to navigate · Enter to select · Esc to close</span>
        <span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">
            {modKeyLabel()}K
          </kbd>
        </span>
      </div>
    </CommandDialog>
  )
}
