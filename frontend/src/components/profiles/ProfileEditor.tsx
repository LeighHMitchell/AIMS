"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { EnhancedImageUpload } from '@/components/ui/enhanced-image-upload'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { ArrowLeft, Save, Lock, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { useUserRole } from '@/hooks/useUserRole'
import { useUser } from '@/hooks/useUser'
import { POLICY_MARKER_ICON_OPTIONS, getIconComponent } from '@/lib/policy-marker-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface ProfileEditorProps {
  profileType: 'sdg' | 'sector' | 'location'
  profileId: string
  /** Standard (locked) display name. */
  name: string
  /** Standard (locked) code/identifier and its label. */
  code?: string
  codeLabel?: string
  /** The standard default description — shown as placeholder when no override. */
  defaultDescription?: string
  /** The standard/palette color used as the fallback preview color. */
  defaultColor: string
  /** Where Cancel returns to (the profile page). */
  backHref: string
  /** Breadcrumb trail above the editor. */
  breadcrumbItems: Array<{ label: string; href?: string }>
  /** Friendly entity label for the header, e.g. "SDG", "Sector", "Location". */
  entityLabel: string
}

const SECTIONS = [
  { id: 'details', label: 'Details' },
  { id: 'appearance', label: 'Appearance' },
]

const PRESET_COLORS = ['#4C5568', '#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#EA580C', '#0891B2', '#DB2777', '#64748B']

export function ProfileEditor(props: ProfileEditorProps) {
  const { profileType, profileId, name, code, codeLabel, defaultDescription, defaultColor, backHref, breadcrumbItems, entityLabel } = props
  const router = useRouter()
  const { isSuperUser } = useUserRole()
  const { isLoading: userLoading } = useUser()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('details')

  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string | null>(null)
  const [icon, setIcon] = useState<string | null>(null)
  const [banner, setBanner] = useState<string>('')
  const [bannerPosition, setBannerPosition] = useState(50)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await apiFetch(`/api/profile-banners/${profileType}/${profileId}`)
        if (res.ok) {
          const d = await res.json()
          if (cancelled) return
          setDescription(d.description ?? '')
          setColor(d.color ?? null)
          setIcon(d.icon ?? null)
          setBanner(d.banner ?? '')
          setBannerPosition(d.banner_position ?? 50)
        }
      } catch {
        // optional
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [profileType, profileId])

  const previewColor = color || defaultColor
  const PreviewIcon = useMemo(() => getIconComponent(icon), [icon])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(`/api/profile-banners/${profileType}/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || null,
          color: color || null,
          icon: icon || null,
          banner: banner || null,
          banner_position: bannerPosition,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b.error || 'Failed to save')
      }
      toast.success(`${entityLabel} updated`)
      router.push(backHref)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const scrollTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading || userLoading) {
    return (
      <MainLayout>
        <div className="w-full p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </MainLayout>
    )
  }

  if (!isSuperUser()) {
    return (
      <MainLayout>
        <div className="w-full p-6">
          <Card><CardContent className="p-8 text-center">
            <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Super users only</h2>
            <p className="text-muted-foreground mb-4">You don&apos;t have permission to edit this profile.</p>
            <Button variant="outline" onClick={() => router.push(backHref)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          </CardContent></Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full p-6">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Header */}
        <div className="flex items-center gap-3 min-w-0 mt-4 mb-6">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${previewColor}15`, border: `2px solid ${previewColor}40` }}>
            {PreviewIcon ? <PreviewIcon className="w-5 h-5" style={{ color: previewColor }} /> : <span className="text-helper font-bold" style={{ color: previewColor }}>{(code || name).substring(0, 2)}</span>}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Edit {entityLabel}</h1>
            <p className="text-helper text-muted-foreground truncate">{name}</p>
          </div>
        </div>

        <div className="flex gap-6 pb-20">
          {/* Left section nav */}
          <nav className="hidden md:block w-48 flex-shrink-0">
            <div className="sticky top-6 space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-helper transition-colors',
                    activeSection === s.id ? 'bg-surface-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Field cards */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Details */}
            <Card id="section-details">
              <CardHeader><CardTitle className="text-body">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">Name
                      <HelpTextTooltip size="sm" content={`The ${entityLabel.toLowerCase()}'s official name. This is a fixed standard and can't be changed.`} />
                      <span className="inline-flex items-center gap-1 text-muted-foreground font-normal"><Lock className="h-3 w-3" /> locked</span>
                    </Label>
                    <Input value={name} disabled />
                  </div>
                  {code != null && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">{codeLabel || 'Code'}
                        <span className="inline-flex items-center gap-1 text-muted-foreground font-normal"><Lock className="h-3 w-3" /> locked</span>
                      </Label>
                      <Input value={code} disabled />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pe-desc" className="flex items-center gap-1.5">Description
                    <HelpTextTooltip size="sm" content="A short, plain-language description shown on this profile and its cards. Leave blank to use the standard default." />
                  </Label>
                  <Textarea id="pe-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={defaultDescription || 'Short description shown on the profile'} />
                  {defaultDescription && !description && (
                    <p className="text-helper text-muted-foreground">Default: {defaultDescription}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card id="section-appearance">
              <CardHeader><CardTitle className="text-body">Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* Banner */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">Banner image
                    <HelpTextTooltip size="sm" content="A wide banner shown at the top of this profile page. Recommended 1200×300px." />
                  </Label>
                  <EnhancedImageUpload
                    value={banner}
                    onChange={(v) => setBanner(v)}
                    position={bannerPosition}
                    onPositionChange={(p) => setBannerPosition(p)}
                    variant="banner"
                    label="Banner"
                    recommendedSize="1200x300px"
                    maxSize={5 * 1024 * 1024}
                    disabled={saving}
                  />
                </div>

                {/* Icon picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">Icon
                    <HelpTextTooltip size="sm" content="An optional icon shown on this profile's card. Pick one, or leave it unset to use the default." />
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {POLICY_MARKER_ICON_OPTIONS.map(({ key, Icon }) => {
                      const selected = icon === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setIcon(selected ? null : key)}
                          title={key}
                          className={cn(
                            'w-10 h-10 rounded-lg border flex items-center justify-center transition-colors',
                            selected ? 'border-2' : 'border-border hover:bg-muted'
                          )}
                          style={selected ? { borderColor: previewColor, backgroundColor: `${previewColor}12` } : undefined}
                        >
                          <Icon className="w-4 h-4" style={{ color: selected ? previewColor : undefined }} />
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-helper text-muted-foreground">
                    {icon ? 'Custom icon selected.' : 'No custom icon; using the default.'} Click a selected icon again to reset.
                  </p>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label htmlFor="pe-color" className="flex items-center gap-1.5">Theme color
                    <HelpTextTooltip size="sm" content="The accent color for this profile's banner and charts. Leave unset to use the standard default color." />
                  </Label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input id="pe-color" type="color" value={color || previewColor} onChange={e => setColor(e.target.value)} className="h-9 w-12 rounded border border-border bg-card cursor-pointer p-0.5" />
                    <Input value={color || ''} onChange={e => setColor(e.target.value || null)} placeholder={defaultColor} className="w-32 font-mono text-helper" />
                    <div className="flex items-center gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)} title={c} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    {color && <Button variant="ghost" size="sm" className="h-7 text-helper" onClick={() => setColor(null)}>Reset</Button>}
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="rounded-xl border border-border overflow-hidden w-64">
                    <div className="h-24 flex items-center justify-center relative" style={{ backgroundColor: previewColor }}>
                      {banner && <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `center ${bannerPosition}%` }} />}
                      {!banner && PreviewIcon && <PreviewIcon className="w-10 h-10 text-white/25" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-2 left-3 right-3 text-helper font-bold text-white truncate">{name}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer toolbar */}
        <div className="sticky bottom-0 z-20 -mx-6 border-t border-border bg-card/80 backdrop-blur-md px-6 py-3">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push(backHref)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />{saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
