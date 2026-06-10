'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnhancedImageUpload } from '@/components/ui/enhanced-image-upload'
import { apiFetch } from '@/lib/api-fetch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ProfileBannerUploadProps {
  profileType: 'sdg' | 'sector' | 'location' | 'policy_marker' | 'tag'
  profileId: string
  onBannerChange?: (banner: string | null, position: number) => void
  /** When false, the banner still loads/displays but the edit button is hidden. Defaults to true. */
  canEdit?: boolean
  /** Overrides the trigger button's positioning classes. Defaults to its own
   *  absolute top-right placement; pass non-absolute classes to flow it inside
   *  a shared actions cluster (e.g. alongside an Edit pill). */
  buttonClassName?: string
}

interface BannerData {
  banner: string | null
  banner_position: number
}

export function ProfileBannerUpload({ profileType, profileId, onBannerChange, canEdit = true, buttonClassName }: ProfileBannerUploadProps) {
  const [bannerData, setBannerData] = useState<BannerData>({ banner: null, banner_position: 50 })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const onBannerChangeRef = React.useRef(onBannerChange)
  onBannerChangeRef.current = onBannerChange
  const saveVersionRef = React.useRef(0)
  // Mirror of bannerData read synchronously by the change handlers. The
  // EnhancedImageUpload "Replace" flow fires onChange(newUrl) AND
  // onPositionChange(50) in the same tick; reading bannerData directly in the
  // second handler would see the pre-render (stale) value and overwrite the new
  // image with the old URL. The ref always holds the latest committed values.
  const bannerDataRef = React.useRef(bannerData)
  bannerDataRef.current = bannerData
  const pendingSaveRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchBanner() {
      try {
        const res = await apiFetch(`/api/profile-banners/${profileType}/${profileId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setBannerData(data)
          onBannerChangeRef.current?.(data.banner, data.banner_position)
        }
      } catch {
        // Banner is optional
      }
    }
    fetchBanner()
    return () => { cancelled = true }
  }, [profileType, profileId])

  const saveBanner = useCallback(async (banner: string | null, position: number) => {
    const version = ++saveVersionRef.current
    setIsSaving(true)
    try {
      const res = await apiFetch(`/api/profile-banners/${profileType}/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner, banner_position: position }),
      })
      if (!res.ok) throw new Error('Failed to save banner')
      const data = await res.json()
      // Only apply response if this is still the latest save
      if (version === saveVersionRef.current) {
        setBannerData(data)
        onBannerChangeRef.current?.(data.banner, data.banner_position)
        toast.success('Banner saved')
      }
    } catch {
      if (version === saveVersionRef.current) {
        toast.error('Failed to save banner')
      }
    } finally {
      if (version === saveVersionRef.current) {
        setIsSaving(false)
      }
    }
  }, [profileType, profileId])

  // Apply a banner/position change, update the ref synchronously, notify the
  // parent immediately, and coalesce the persistence call. Coalescing collapses
  // the onChange + onPositionChange pair fired by a single "Replace" into one
  // PUT that carries the final, correct { banner, position } pair — avoiding the
  // racing double-save that previously reverted the image to the old URL.
  const commit = useCallback((next: BannerData) => {
    bannerDataRef.current = next
    setBannerData(next)
    onBannerChangeRef.current?.(next.banner, next.banner_position)
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current)
    pendingSaveRef.current = setTimeout(() => {
      pendingSaveRef.current = null
      saveBanner(bannerDataRef.current.banner, bannerDataRef.current.banner_position)
    }, 0)
  }, [saveBanner])

  useEffect(() => () => {
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current)
  }, [])

  if (!canEdit) return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "bg-white/90 shadow-sm text-foreground hover:bg-white h-7 px-2 text-helper transition-opacity",
          buttonClassName ?? "absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100",
        )}
        onClick={() => setIsEditing(true)}
      >
        <Camera className="h-3 w-3 mr-1" />
        {bannerData.banner ? 'Change' : 'Add'} Banner
      </Button>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile Banner</DialogTitle>
          </DialogHeader>
          <EnhancedImageUpload
            value={bannerData.banner || ''}
            onChange={(value) => {
              commit({ banner: value || null, banner_position: bannerDataRef.current.banner_position })
            }}
            position={bannerData.banner_position}
            onPositionChange={(pos) => {
              commit({ banner: bannerDataRef.current.banner, banner_position: pos })
            }}
            variant="banner"
            label="Banner"
            recommendedSize="1200x300px"
            maxSize={5 * 1024 * 1024}
            disabled={isSaving}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
