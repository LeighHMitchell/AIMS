"use client"

import React, { useState } from "react"
import { Mail, MessageSquare } from "lucide-react"
import { RailBlock } from "./RailBlock"
import { FocalPointAvatar } from "./FocalPointAvatar"
import { cn } from "@/lib/utils"

export interface FocalPoint {
  id: string
  /** Honorific (e.g. "U", "Ms.", "Dr.") shown before the name on the same line. */
  title?: string
  name: string
  role: string
  jobTitle?: string
  department?: string
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
  helpText?: React.ReactNode
}

const DEFAULT_FOCAL_POINTS_HELP =
  "Government and development partner contacts who are responsible for managing this activity. They are the primary points of contact for questions, validation, and coordination."

export function RailFocalPoints({
  focalPoints,
  maxVisible = 3,
  emptyState,
  helpText = DEFAULT_FOCAL_POINTS_HELP,
}: RailFocalPointsProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? focalPoints : focalPoints.slice(0, maxVisible)
  const overflow = focalPoints.length - maxVisible

  if (focalPoints.length === 0) {
    return (
      <RailBlock label="Focal Points" helpText={helpText}>
        <div className="text-muted-foreground">
          {emptyState ?? "No focal points assigned yet."}
        </div>
      </RailBlock>
    )
  }

  return (
    <RailBlock
      label="Focal Points"
      helpText={helpText}
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
          <li key={fp.id} className="flex items-start gap-2 min-w-0">
            <FocalPointAvatar name={fp.name} photoUrl={fp.photoUrl} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground break-words">
                {fp.title ? `${fp.title} ` : ''}{fp.name}
              </div>
              <div className="mt-0.5">
                <span className="inline-flex items-center align-baseline px-2 h-5 text-caption font-medium rounded bg-muted text-foreground border border-border">
                  {fp.role}
                </span>
              </div>
              {fp.jobTitle && (
                <div className="text-muted-foreground break-words">{fp.jobTitle}</div>
              )}
              {fp.department && (
                <div className="text-muted-foreground break-words">{fp.department}</div>
              )}
              {fp.organisation && (
                <div className="text-muted-foreground break-words">{fp.organisation}</div>
              )}
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
