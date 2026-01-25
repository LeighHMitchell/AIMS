"use client"

import * as React from "react"
import Link from "next/link"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card"
import { ScrollArea } from "./scroll-area"
import { Calendar, ExternalLink } from "lucide-react"
import releases from "@/data/releases.json"

export function VersionBadge() {
  const latestRelease = releases.releases[0]
  const currentVersion = releases.currentVersion

  if (!latestRelease) {
    return null
  }

  // Format date nicely
  const formattedDate = new Date(latestRelease.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          className="text-[10px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer text-left mt-0.5"
          aria-label={`Version ${currentVersion}`}
          onClick={(e) => e.preventDefault()}
        >
          v{currentVersion}
        </button>
      </HoverCardTrigger>
      <HoverCardContent 
        side="right" 
        align="start" 
        sideOffset={8}
        className="w-80 bg-white shadow-lg border border-gray-200"
        style={{ backgroundColor: 'white', opacity: 1 }}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                v{latestRelease.version}
              </span>
              <span className="text-xs text-muted-foreground">Latest</span>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>

          {/* Changes */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">What's New</h4>
            <ScrollArea className="h-[140px] pr-3">
              <ul className="space-y-1.5">
                {latestRelease.changes.slice(0, 8).map((change, index) => (
                  <li 
                    key={index} 
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-1.5 h-1 w-1 rounded-full bg-current flex-shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
                {latestRelease.changes.length > 8 && (
                  <li className="text-xs text-muted-foreground/60 italic pl-3">
                    +{latestRelease.changes.length - 8} more changes...
                  </li>
                )}
              </ul>
            </ScrollArea>
          </div>

          {/* Footer Link */}
          <div className="pt-2 border-t">
            <Link 
              href="/build-history"
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <span>View full build history</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
