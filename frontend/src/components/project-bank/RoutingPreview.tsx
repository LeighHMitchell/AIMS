"use client"

import type { RoutingResult } from "@/types/project-bank"

interface RoutingPreviewProps {
  routing: RoutingResult
}

export function RoutingPreview({ routing }: RoutingPreviewProps) {
  return (
    <div className="p-4 rounded-lg border bg-[#f6f5f3] border-[#5f7f7a]/20">
      <div className="text-body font-bold mb-1 text-foreground">
        → {routing.label}
      </div>
      <div className="text-body text-muted-foreground leading-relaxed">
        {routing.description}
      </div>
    </div>
  )
}
