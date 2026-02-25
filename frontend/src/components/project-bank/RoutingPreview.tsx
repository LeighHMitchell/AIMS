"use client"

import type { RoutingResult } from "@/types/project-bank"

interface RoutingPreviewProps {
  routing: RoutingResult
}

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
}

export function RoutingPreview({ routing }: RoutingPreviewProps) {
  const colors = colorClasses[routing.color] || colorClasses.blue

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className={`text-sm font-bold mb-1 ${colors.text}`}>
        → {routing.label}
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">
        {routing.description}
      </div>
    </div>
  )
}
