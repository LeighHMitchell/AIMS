'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { ProfileBannerUpload } from '@/components/profiles/ProfileBannerUpload'
import { HERO_HEIGHT_WITH_IMAGE, HERO_HEIGHT_WITHOUT_IMAGE } from '@/components/profile/ProfileHero'
import { useUserRole } from '@/hooks/useUserRole'

interface SDGHeroBannerProps {
  sdg: {
    id: number
    name: string
    description: string
    color: string
    targetCount: number
  }
  /** When provided and the user is a super user, renders an Edit pill on the
   *  banner (top-right) matching the Organisation profile. */
  editHref?: string
}

export function SDGHeroBanner({ sdg, editHref }: SDGHeroBannerProps) {
  const [banner, setBanner] = useState<string | null>(null)
  const [bannerPosition, setBannerPosition] = useState(50)
  const { isSuperUser } = useUserRole()

  const heroHeight = banner ? HERO_HEIGHT_WITH_IMAGE : HERO_HEIGHT_WITHOUT_IMAGE

  return (
    <div
      className="rounded-xl p-6 mb-6 border border-border relative overflow-hidden group flex flex-col justify-end"
      style={{ background: `linear-gradient(to right, ${sdg.color}15, ${sdg.color}08)`, height: heroHeight }}
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
      <div className="absolute top-4 right-4 z-[3] flex items-center gap-2">
        <ProfileBannerUpload
          profileType="sdg"
          profileId={String(sdg.id)}
          canEdit={isSuperUser()}
          buttonClassName="opacity-0 group-hover:opacity-100"
          onBannerChange={(b, pos) => { setBanner(b); setBannerPosition(pos) }}
        />
        {editHref && isSuperUser() && (
          <Link
            href={editHref}
            className="inline-flex items-center h-9 rounded-md bg-white/90 shadow-sm px-3 text-[13px] font-medium text-foreground hover:bg-white transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4 relative z-[1]">
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-sm">
          <img
            src={`/images/sdg/E_SDG_Icons-${sdg.id.toString().padStart(2, '0')}.jpg`}
            alt={`SDG ${sdg.id}: ${sdg.name}`}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-foreground">{sdg.name}</h1>
          <p className="text-body font-medium text-foreground/80 mt-1">
            {sdg.description}
          </p>
        </div>
      </div>
    </div>
  )
}
