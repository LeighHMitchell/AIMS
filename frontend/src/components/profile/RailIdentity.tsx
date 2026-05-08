"use client"

import React from "react"
import { RailBlock } from "./RailBlock"
import { cn } from "@/lib/utils"

export interface IdentityRow {
  label: string
  value: React.ReactNode
  mono?: boolean
}

interface RailIdentityProps {
  rows: IdentityRow[]
  helpText?: React.ReactNode
}

const DEFAULT_IDENTITY_HELP =
  "Identifiers used to reference this activity — the system Activity ID, IATI Identifier, and any other reference codes assigned to it."

export function RailIdentity({
  rows,
  helpText = DEFAULT_IDENTITY_HELP,
}: RailIdentityProps) {
  const visible = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "")
  if (visible.length === 0) return null
  return (
    <RailBlock label="Identity" helpText={helpText}>
      <dl className="space-y-2.5">
        {visible.map((r, i) => (
          <div key={i} className="grid grid-cols-[100px_1fr] gap-2">
            <dt className="text-caption text-muted-foreground font-medium pt-0.5">{r.label}</dt>
            <dd
              className={cn("text-foreground min-w-0 break-words", r.mono && "font-mono")}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </RailBlock>
  )
}
