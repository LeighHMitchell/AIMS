"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { modKeyLabel } from "@/hooks/useActivityEditorShortcuts"

interface ShortcutRow {
  label: string
  keys: string[]
}

interface KeyboardShortcutsCheatsheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Read-only modal listing the keyboard shortcuts available in the Activity Editor.
 * Opened via Cmd/Ctrl + /.
 */
export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: KeyboardShortcutsCheatsheetProps) {
  const mod = modKeyLabel()

  const navigation: ShortcutRow[] = [
    { label: "Next section", keys: [mod, "↓"] },
    { label: "Previous section", keys: [mod, "↑"] },
    { label: "Next field", keys: ["Tab"] },
    { label: "Previous field", keys: ["Shift", "Tab"] },
  ]

  const actions: ShortcutRow[] = [
    { label: "Save activity", keys: [mod, "Enter"] },
    { label: "Show this help", keys: [mod, "/"] },
    { label: "Close modal", keys: ["Esc"] },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Move through the editor without leaving the keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <ShortcutTable heading="Navigation" rows={navigation} />
          <ShortcutTable heading="Actions" rows={actions} />
        </div>

        <p className="border-t pt-3 text-helper text-muted-foreground">
          Tip: use the sidebar to jump to any section, or <Kbd>{mod}</Kbd>
          <span className="mx-1">+</span>
          <Kbd>↓</Kbd> to step through them in order.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutTable({
  heading,
  rows,
}: {
  heading: string
  rows: ShortcutRow[]
}) {
  return (
    <div>
      <h3 className="mb-2 text-body font-semibold text-foreground">{heading}</h3>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between text-body"
          >
            <span className="text-foreground">{row.label}</span>
            <span className="flex items-center gap-1">
              {row.keys.map((k, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span className="text-muted-foreground">+</span>
                  )}
                  <Kbd>{k}</Kbd>
                </React.Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </kbd>
  )
}
