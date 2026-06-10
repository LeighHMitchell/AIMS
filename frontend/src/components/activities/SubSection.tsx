"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"

interface SubSectionProps {
  /** Heading for the sub-section (h3-level). */
  title: string
  /** Optional one-line descriptive intro shown under the heading. */
  intro?: string
  /** Optional help text shown in a "?" tooltip next to the heading (like top-level sections). */
  help?: string
  /** id for anchor links / scroll-to / a11y. */
  id?: string
  /** Fields/controls that belong to this sub-section. */
  children: React.ReactNode
  /**
   * Render the heading at the larger top-level size (h2 / text-3xl) used by primary
   * sections like "Overview", rather than the default h3 / text-lg. Use when a
   * SubSection stands on its own as a navigable top-level section.
   */
  prominentTitle?: boolean
}

/**
 * A lightweight wrapper that groups related fields within a parent form
 * section. Renders an h3 heading, optional intro line, then the children.
 *
 * Deliberately does NOT wrap children in another Card / border — the
 * parent form section already owns that chrome. Nesting cards inside
 * cards is a classic AI-slop anti-pattern that flattens visual hierarchy.
 * Rhythm comes from spacing (space-y-12 between SubSections in the
 * parent) and the typographic step from h2 → h3.
 */
export function SubSection({ title, intro, id, children, prominentTitle = false, help }: SubSectionProps) {
  const Heading = prominentTitle ? "h2" : "h3"
  return (
    <section id={id} className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Heading className={`font-semibold text-foreground ${prominentTitle ? "text-3xl" : "text-lg"}`}>{title}</Heading>
          {help && (
            <HelpTextTooltip content={help}>
              <HelpCircle className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-help" />
            </HelpTextTooltip>
          )}
        </div>
        {intro && (
          <p className="text-body text-muted-foreground">{intro}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
