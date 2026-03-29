'use client'

import React, { useState } from 'react'
import { ProfileBannerUpload } from '@/components/profiles/ProfileBannerUpload'

interface SDGHeroBannerProps {
  sdg: {
    id: number
    name: string
    description: string
    color: string
    targetCount: number
  }
}

export function SDGHeroBanner({ sdg }: SDGHeroBannerProps) {
  const [banner, setBanner] = useState<string | null>(null)
  const [bannerPosition, setBannerPosition] = useState(50)

  return (
    <div
      className="rounded-xl p-6 mb-6 border border-border relative overflow-hidden group"
      style={{ background: `linear-gradient(to right, ${sdg.color}15, ${sdg.color}08)` }}
    >
      {banner && (
        <div className="absolute inset-0">
          <img
            src={banner}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: `center ${bannerPosition}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-background/30" />
        </div>
      )}
      <ProfileBannerUpload
        profileType="sdg"
        profileId={String(sdg.id)}
        onBannerChange={(b, pos) => { setBanner(b); setBannerPosition(pos) }}
      />
      <div className="flex items-center gap-4 relative z-[1]">
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-sm">
          <img
            src={`/images/sdg/E_SDG_Icons-${sdg.id.toString().padStart(2, '0')}.jpg`}
            alt={`SDG ${sdg.id}: ${sdg.name}`}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{sdg.name}</h1>
          <p className="text-sm font-medium text-foreground/80 mt-1">
            {sdg.description}
          </p>
        </div>
      </div>
    </div>
  )
}
