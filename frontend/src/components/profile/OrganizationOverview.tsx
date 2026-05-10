"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { SafeHtml } from "@/components/ui/safe-html"
import { Globe } from "lucide-react"

interface OrganizationOverviewProps {
  organization: any
}

// Read-only "About" panel for the organisation profile. Shows the description /
// mission narrative plus a small contact line if a website is set. The Identity
// rail block sits beside this panel on the Overview tab.
export function OrganizationOverview({ organization }: OrganizationOverviewProps) {
  const description = (organization?.description ?? "").trim()
  const mission = (organization?.mission ?? "").trim()

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card p-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight text-foreground mb-3">About</h2>
        {description || mission ? (
          <div className="space-y-4">
            {description && (
              <SafeHtml
                html={description}
                level="rich"
                className="text-body text-foreground/85 leading-relaxed"
              />
            )}
            {mission && (
              <section>
                <h3 className="text-body font-semibold text-foreground mb-2">Mission</h3>
                <SafeHtml
                  html={mission}
                  level="rich"
                  className="text-body text-foreground/85 leading-relaxed"
                />
              </section>
            )}
          </div>
        ) : (
          <p className="text-helper text-muted-foreground">
            No description recorded for this organisation.
          </p>
        )}
        {organization?.website && (
          <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 text-body">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline break-all"
            >
              {organization.website}
            </a>
          </div>
        )}
      </Card>
    </div>
  )
}
