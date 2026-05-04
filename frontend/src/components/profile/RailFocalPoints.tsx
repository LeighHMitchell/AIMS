"use client"

import React, { useState } from "react"
import { Mail, MessageSquare } from "lucide-react"
import { RailBlock } from "./RailBlock"
import { FocalPointAvatar } from "./FocalPointAvatar"
import { cn } from "@/lib/utils"

export interface FocalPoint {
  id: string
  name: string
  role: string
  organisation?: string
  photoUrl?: string | null
  contactEmail?: string | null
  contactChannel?: string | null
  isPrimary?: boolean
}

interface RailFocalPointsProps {
  focalPoints: FocalPoint[]
  maxVisible?: number
  emptyState?: React.ReactNode
}

export function RailFocalPoints({
  focalPoints,
  maxVisible = 3,
  emptyState,
}: RailFocalPointsProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? focalPoints : focalPoints.slice(0, maxVisible)
  const overflow = focalPoints.length - maxVisible

  if (focalPoints.length === 0) {
    return (
      <RailBlock label="Focal Points">
        <div className="text-muted-foreground">
          {emptyState ?? "No focal points assigned yet."}
        </div>
      </RailBlock>
    )
  }

  return (
    <RailBlock
      label="Focal Points"
      action={
        overflow > 0 && !showAll ? (
          <button
            onClick={() => setShowAll(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            +{overflow} more
          </button>
        ) : showAll && overflow > 0 ? (
          <button
            onClick={() => setShowAll(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Show fewer
          </button>
        ) : null
      }
    >
      <ul className="space-y-2">
        {visible.map((fp) => (
          <li key={fp.id} className="flex items-center gap-2 min-w-0">
            <FocalPointAvatar name={fp.name} photoUrl={fp.photoUrl} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {fp.name}
                {fp.isPrimary && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-foreground/60" aria-label="Primary" />
                )}
              </div>
              <div className="text-muted-foreground truncate">
                {fp.role}
                {fp.organisation && <> · {fp.organisation}</>}
              </div>
            </div>
            {fp.contactEmail ? (
              <a
                href={`mailto:${fp.contactEmail}`}
                className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-md inline-flex items-center justify-center text-muted-foreground",
                  "hover:bg-muted hover:text-foreground transition-colors",
                )}
                aria-label={`Email ${fp.name}`}
                title={fp.contactEmail}
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            ) : fp.contactChannel ? (
              <span
                className="flex-shrink-0 w-6 h-6 rounded-md inline-flex items-center justify-center text-muted-foreground"
                title={fp.contactChannel}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </RailBlock>
  )
}
