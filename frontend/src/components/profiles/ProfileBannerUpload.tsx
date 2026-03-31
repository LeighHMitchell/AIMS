'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnhancedImageUpload } from '@/components/ui/enhanced-image-upload'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'

interface ProfileBannerUploadProps {
  profileType: 'sdg' | 'sector' | 'location'
  profileId: string
  onBannerChange?: (banner: string | null, position: number) => void
}

interface BannerData {
  banner: string | null
  banner_position: number
}

export function ProfileBannerUpload({ profileType, profileId, onBannerChange }: ProfileBannerUploadProps) {
  const [bannerData, setBannerData] = useState<BannerData>({ banner: null, banner_position: 50 })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const onBannerChangeRef = React.useRef(onBannerChange)
  onBannerChangeRef.current = onBannerChange
  const saveVersionRef = React.useRef(0)

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

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10 bg-black/30 hover:bg-black/50 text-white h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
              const newBanner = value || null
              setBannerData(prev => ({ ...prev, banner: newBanner }))
              onBannerChangeRef.current?.(newBanner, bannerData.banner_position)
              saveBanner(newBanner, bannerData.banner_position)
            }}
            position={bannerData.banner_position}
            onPositionChange={(pos) => {
              setBannerData(prev => ({ ...prev, banner_position: pos }))
              onBannerChangeRef.current?.(bannerData.banner, pos)
              saveBanner(bannerData.banner, pos)
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
