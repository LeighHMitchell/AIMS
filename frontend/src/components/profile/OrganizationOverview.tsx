"use client"

import React from "react"
import { SafeHtml } from "@/components/ui/safe-html"

interface OrganizationOverviewProps {
  organization: any
}

// Read-only "About" panel for the organisation profile — the description
// narrative only. The Mission now renders as its own rail card above Identity,
// and the website lives in the Contact Information rail (it used to be
// duplicated at the bottom here). Rendered borderless / card-less so the About
// text reads as the page's primary content; p-6 keeps the "About" heading at
// the same Y as the rail cards' headings.
export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
  const description = (organization?.description ?? "").trim()

  return (
    <div className="space-y-6">
      <div className="p-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground mb-3">About</h2>
        {description ? (
          <SafeHtml
            html={description}
            level="rich"
            className="text-body text-foreground/85 leading-relaxed"
          />
        ) : (
          <p className="text-helper text-muted-foreground">
            No description recorded for this organisation.
          </p>
        )}
      </div>
    </div>
  )
}
