"use client"

import React from "react"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { RailBlock } from "./RailBlock"
import { cn } from "@/lib/utils"

const ROLE_LABEL: Record<string, string> = {
  funding: "Funding",
  accountable: "Accountable",
  extending: "Extending",
  implementing: "Implementing",
  reporting: "Reporting",
}

export interface ParticipatingOrg {
  id?: string
  name: string
  acronym?: string
  role: string
  logoUrl?: string | null
}

interface RailParticipatingOrgsProps {
  orgs: ParticipatingOrg[]
  maxVisible?: number
  onViewAll?: () => void
  helpText?: React.ReactNode
}

const DEFAULT_PARTICIPATING_ORGS_HELP =
  "Organisations that are involved in this activity, with their IATI role: Funding (provides resources), Accountable (oversees outcomes), Extending (channels funds onward) or Implementing (delivers the work on the ground)."

export function RailParticipatingOrgs({
  orgs,
  maxVisible = 5,
  onViewAll,
  helpText = DEFAULT_PARTICIPATING_ORGS_HELP,
}: RailParticipatingOrgsProps) {
  if (orgs.length === 0) return null

  const visible = orgs.slice(0, maxVisible)
  const overflow = orgs.length - maxVisible

  return (
    <RailBlock
      label="Participating Organisations"
      helpText={helpText}
      action={
        overflow > 0 && onViewAll ? (
          <button
            onClick={onViewAll}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            All {orgs.length} →
          </button>
        ) : null
      }
    >
      <ul className="space-y-3">
        {visible.map((o, i) => {
          const roleLabel = ROLE_LABEL[o.role] ?? o.role
          const showAcronym = o.acronym && o.acronym !== o.name
          return (
            <li key={o.id ?? `${o.name}-${i}`} className="flex items-start gap-2.5 min-w-0">
              <span className="flex-shrink-0 w-7 h-7 rounded-md bg-muted flex items-center justify-center overflow-hidden mt-0.5">
                {o.logoUrl ? (
                  <img
                    src={o.logoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                )}
              </span>
              <div className="flex-1 min-w-0 break-words">
                {o.id ? (
                  <Link
                    href={`/organizations/${o.id}`}
                    className="text-foreground font-medium hover:underline"
                    title={o.name}
                  >
                    {o.name}
                    {showAcronym && <> ({o.acronym})</>}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium" title={o.name}>
                    {o.name}
                    {showAcronym && <> ({o.acronym})</>}
                  </span>
                )}
                <span className="ml-1.5 inline-flex items-center align-baseline px-2 h-5 text-caption font-medium rounded bg-muted text-foreground border border-border">
                  {roleLabel}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </RailBlock>
  )
}
