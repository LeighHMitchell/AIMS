"use client"

import React from "react"

interface SubSectionProps {
  /** Heading for the sub-section (h3-level). */
  title: string
  /** Optional one-line descriptive intro shown under the heading. */
  intro?: string
  /** id for anchor links / scroll-to / a11y. */
  id?: string
  /** Fields/controls that belong to this sub-section. */
  children: React.ReactNode
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
export function SubSection({ title, intro, id, children }: SubSectionProps) {
  return (
    <section id={id} className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {intro && (
          <p className="text-body text-muted-foreground">{intro}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
