"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ArrowLeft, Save, Lock, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { useUserRole } from '@/hooks/useUserRole'
import { useUser } from '@/hooks/useUser'
import { POLICY_MARKER_ICON_OPTIONS, getIconForMarker, getMarkerColor } from '@/lib/policy-marker-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Marker {
  id: string; uuid: string; code: string; iati_code?: string; name: string;
  description: string; marker_type: string; is_iati_standard: boolean;
  display_order?: number; icon?: string | null; color?: string | null;
}

const SECTIONS = [
  { id: 'details', label: 'Details' },
  { id: 'appearance', label: 'Appearance' },
]

const PRESET_COLORS = ['#4C5568', '#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#EA580C', '#0891B2', '#DB2777', '#64748B']

export default function PolicyMarkerEditPage() {
  const params = useParams()
  const router = useRouter()
  const { isSuperUser } = useUserRole()
  const { isLoading: userLoading } = useUser()

  const [marker, setMarker] = useState<Marker | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('details')

  // Editable fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [displayOrder, setDisplayOrder] = useState<string>('')
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await apiFetch(`/api/policy-markers/${params?.id}`)
        if (!res.ok) throw new Error(res.status === 404 ? 'Policy marker not found' : 'Failed to load policy marker')
        const data = await res.json()
        if (cancelled) return
        const m: Marker = data.marker
        setMarker(m)
        setName(m.name || '')
        setDescription(m.description || '')
        setDisplayOrder(m.display_order != null ? String(m.display_order) : '')
        setIcon(m.icon ?? null)
        setColor(m.color ?? null)
        setLoading(false)
      } catch (e: any) {
        if (cancelled) return
        setError(e.message || 'Failed to load'); setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [params?.id])

  const locked = !!marker?.is_iati_standard
  const PreviewIcon = useMemo(() => getIconForMarker(marker?.iati_code, icon), [marker?.iati_code, icon])
  const previewColor = useMemo(() => getMarkerColor({ color, marker_type: marker?.marker_type }), [color, marker?.marker_type])

  const handleSave = async () => {
    if (!marker) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/policy-markers/${marker.uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          icon,
          color,
          display_order: displayOrder === '' ? null : Number(displayOrder),
          ...(locked ? {} : { name }),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save')
      }
      toast.success('Policy marker saved')
      router.push('/policy-markers')
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
            <p className="text-muted-foreground mb-4">You don&apos;t have permission to edit policy markers.</p>
            <Button variant="outline" onClick={() => router.push('/policy-markers')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Policy Markers</Button>
          </CardContent></Card>
        </div>
      </MainLayout>
    )
  }

  if (error || !marker) {
    return (
      <MainLayout>
        <div className="w-full p-6">
          <Card><CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">{error || 'Failed to load'}</p>
            <Button variant="outline" onClick={() => router.push('/policy-markers')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Policy Markers</Button>
          </CardContent></Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full p-6">
        <Breadcrumbs items={[
          { label: 'Policy Markers', href: '/policy-markers' },
          { label: marker.name, href: `/policy-markers/${marker.uuid}` },
          { label: 'Edit' },
        ]} />

        {/* Header */}
        <div className="flex items-center gap-3 min-w-0 mt-4 mb-6">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${previewColor}15`, border: `2px solid ${previewColor}40` }}>
            <PreviewIcon className="w-5 h-5" style={{ color: previewColor }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Edit Policy Marker</h1>
            <p className="text-helper text-muted-foreground truncate">{marker.name}</p>
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
                <div className="space-y-1.5">
                  <Label htmlFor="pm-name" className="flex items-center gap-1.5">Name
                    <HelpTextTooltip size="sm" content="The marker's display name. The 12 official IATI markers keep their standard name; only custom markers can be renamed." />
                    {locked && <span className="inline-flex items-center gap-1 text-muted-foreground font-normal"><Lock className="h-3 w-3" /> IATI standard (locked)</span>}</Label>
                  <Input id="pm-name" value={name} onChange={e => setName(e.target.value)} disabled={locked} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pm-code" className="flex items-center gap-1.5">Code
                      <HelpTextTooltip size="sm" content="The marker's identifier. IATI markers use the official OECD-DAC code (1–12) and can't be changed." />
                      <span className="inline-flex items-center gap-1 text-muted-foreground font-normal"><Lock className="h-3 w-3" /> locked</span></Label>
                    <Input id="pm-code" value={marker.is_iati_standard ? (marker.iati_code || marker.code) : marker.code} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pm-order" className="flex items-center gap-1.5">Display Order
                      <HelpTextTooltip size="sm" content="Controls where this marker appears in its list; lower numbers show first." />
                    </Label>
                    <Select value={displayOrder || undefined} onValueChange={setDisplayOrder}>
                      <SelectTrigger id="pm-order"><SelectValue placeholder="Select position" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 20 }, (_, i) => String(i + 1)).map(n => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pm-desc" className="flex items-center gap-1.5">Description
                    <HelpTextTooltip size="sm" content="A short, plain-language explanation of what activities this marker covers. Shown on the marker's card and profile page." />
                  </Label>
                  <Textarea id="pm-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short, plain-language description shown on cards and the profile" />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card id="section-appearance">
              <CardHeader><CardTitle className="text-body">Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* Icon picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">Icon
                    <HelpTextTooltip size="sm" content="The icon shown on this marker's card and in the preview below. Pick one, or leave it unset to use the marker's default icon." />
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
                    {icon ? 'Custom icon selected.' : 'Using the default icon for this marker.'} Click a selected icon again to reset.
                  </p>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label htmlFor="pm-color" className="flex items-center gap-1.5">Theme colour
                    <HelpTextTooltip size="sm" content="The accent colour used for this marker's card banner and the charts on its profile page. Leave unset to use the default palette colour." />
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="pm-color"
                      type="color"
                      value={color || previewColor}
                      onChange={e => setColor(e.target.value)}
                      className="h-9 w-12 rounded border border-border bg-card cursor-pointer p-0.5"
                    />
                    <Input value={color || ''} onChange={e => setColor(e.target.value || null)} placeholder={previewColor} className="w-32 font-mono text-helper" />
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
                      <PreviewIcon className="w-10 h-10 text-white/25" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-2 left-3 right-3 text-helper font-bold text-white truncate">{name || marker.name}</span>
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
            <Button variant="outline" onClick={() => router.push(`/policy-markers/${marker.uuid}`)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />{saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
