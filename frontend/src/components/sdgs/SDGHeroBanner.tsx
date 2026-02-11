'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface SDGHeroBannerProps {
  sdg: {
    id: number
    name: string
    description: string
    color: string
    targetCount: number
  }
  activityCount: number
  organizationCount: number
}

export function SDGHeroBanner({ sdg, activityCount, organizationCount }: SDGHeroBannerProps) {
  return (
    <div
      className="w-full rounded-xl px-6 py-5 mb-6"
      style={{ backgroundColor: sdg.color }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg">
            <img
              src={`/images/sdg/E_SDG_Icons-${sdg.id.toString().padStart(2, '0')}.jpg`}
              alt={`SDG ${sdg.id}: ${sdg.name}`}
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-0.5">
            Sustainable Development Goal {sdg.id}
          </p>
          <h1 className="text-2xl font-bold text-white mb-1">
            {sdg.name}
          </h1>
          <p className="text-sm text-white/85 mb-3 max-w-3xl">
            {sdg.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
              {sdg.targetCount} Targets
            </Badge>
            <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
              {activityCount} Activities
            </Badge>
            <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/30">
              {organizationCount} Organizations
            </Badge>
          </div>
        </div>

        <div className="flex-shrink-0 hidden md:block">
          <Button
            variant="outline"
            size="sm"
            className="border-white/40 text-white bg-white/10 hover:bg-white/20 hover:text-white"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
