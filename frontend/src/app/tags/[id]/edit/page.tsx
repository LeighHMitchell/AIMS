"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ArrowLeft, Save, Lock, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { useUserRole } from '@/hooks/useUserRole'
import { useUser } from '@/hooks/useUser'
import { TAG_ICON_OPTIONS, getIconForTag, getTagColor } from '@/lib/tag-utils'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Tag {
  id: string; name: string; code?: string | null; vocabulary?: string | null;
  description?: string | null; color?: string | null; icon?: string | null;
}

const SECTIONS = [
  { id: 'details', label: 'Details' },
  { id: 'appearance', label: 'Appearance' },
]

const PRESET_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#16A34A', '#EA580C', '#0891B2', '#CA8A04', '#DC2626', '#4F46E5']

export default function TagEditPage() {
  const params = useParams()
  const router = useRouter()
  const { isSuperUser } = useUserRole()
  const { isLoading: userLoading } = useUser()

  const [tag, setTag] = useState<Tag | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('details')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await apiFetch(`/api/tags/${params?.id}`)
        if (!res.ok) throw new Error(res.status === 404 ? 'Tag not found' : 'Failed to load tag')
        const data = await res.json()
        if (cancelled) return
        const t: Tag = data.tag
        setTag(t)
        setName(t.name || '')
        setDescription(t.description || '')
        setIcon(t.icon ?? null)
        setColor(t.color ?? null)
        setLoading(false)
      } catch (e: any) {
        if (cancelled) return
        setError(e.message || 'Failed to load'); setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [params?.id])

  const PreviewIcon = useMemo(() => getIconForTag(icon), [icon])
  const previewColor = useMemo(() => getTagColor({ color, name: name || tag?.name, id: tag?.id }), [color, name, tag])

  const handleSave = async () => {
    if (!tag) return
    if (!name.trim()) { toast.error('Tag name is required'); return }
    setSaving(true)
    try {
      // 1) Identity (name + description) lives on the tags table.
      const idRes = await apiFetch(`/api/tags/${tag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (!idRes.ok) {
        const body = await idRes.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save tag')
      }

      // 2) Appearance (color + icon) lives in profile_banners overrides.
      const apRes = await apiFetch(`/api/profile-banners/tag/${tag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color, icon }),
      })
      if (!apRes.ok) {
        const body = await apRes.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save appearance')
      }

      toast.success('Tag saved')
      router.push(`/tags/${tag.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!tag) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/tags/${tag.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete tag')
      }
      toast.success('Tag deleted')
      router.push('/tags')
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete tag')
      setDeleting(false)
      setShowDelete(false)
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
            <p className="text-muted-foreground mb-4">You don&apos;t have permission to edit tags.</p>
            <Button variant="outline" onClick={() => router.push('/tags')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Tags</Button>
          </CardContent></Card>
        </div>
      </MainLayout>
    )
  }

  if (error || !tag) {
    return (
      <MainLayout>
        <div className="w-full p-6">
          <Card><CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">{error || 'Failed to load'}</p>
            <Button variant="outline" onClick={() => router.push('/tags')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Tags</Button>
          </CardContent></Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full p-6">
        <Breadcrumbs items={[
          { label: 'Tags', href: '/tags' },
          { label: tag.name, href: `/tags/${tag.id}` },
          { label: 'Edit' },
        ]} />

        {/* Header */}
        <div className="flex items-center gap-3 min-w-0 mt-4 mb-6">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${previewColor}15`, border: `2px solid ${previewColor}40` }}>
            <PreviewIcon className="w-5 h-5" style={{ color: previewColor }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Edit Tag</h1>
            <p className="text-helper text-muted-foreground truncate">{tag.name}</p>
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

              {/* Delete Tag Button — matches the activity editor's Delete Activity button */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  disabled={saving || deleting}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-md text-body font-medium bg-destructive/100 text-white hover:bg-destructive transition-colors flex items-center justify-center gap-2",
                    (saving || deleting) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Delete Tag
                </button>
              </div>
            </div>
          </nav>

          {/* Field cards */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Details */}
            <Card id="section-details">
              <CardHeader><CardTitle className="text-body">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tag-name" className="flex items-center gap-1.5">Name
                    <HelpTextTooltip size="sm" content="The tag's display name. Renaming updates it everywhere the tag is applied. Names are stored lower-case and must be unique." />
                  </Label>
                  <Input id="tag-name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-code" className="flex items-center gap-1.5">Code
                      <HelpTextTooltip size="sm" content="The tag's URL-safe identifier, generated from its name when first created." />
                      <span className="inline-flex items-center gap-1 text-muted-foreground font-normal"><Lock className="h-3 w-3" /> locked</span></Label>
                    <Input id="tag-code" value={tag.code || ''} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-vocab" className="flex items-center gap-1.5">Vocabulary
                      <HelpTextTooltip size="sm" content="The IATI vocabulary this tag belongs to. 99 means a free-text/custom tag." />
                      <span className="inline-flex items-center gap-1 text-muted-foreground font-normal"><Lock className="h-3 w-3" /> locked</span></Label>
                    <Input id="tag-vocab" value={tag.vocabulary || '99'} disabled />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag-desc" className="flex items-center gap-1.5">Description
                    <HelpTextTooltip size="sm" content="A short, plain-language explanation of what this tag covers. Shown on the tag's card and profile page." />
                  </Label>
                  <Textarea id="tag-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Short, plain-language description shown on cards and the profile" />
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
                    <HelpTextTooltip size="sm" content="The icon shown on this tag's card and in the preview below. Pick one, or leave it unset to use the default hash icon." />
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_ICON_OPTIONS.map(({ key, Icon }) => {
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
                    {icon ? 'Custom icon selected.' : 'Using the default hash icon.'} Click a selected icon again to reset.
                  </p>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label htmlFor="tag-color" className="flex items-center gap-1.5">Theme color
                    <HelpTextTooltip size="sm" content="The accent color used for this tag's card banner and the charts on its profile page. Leave unset to use the auto-generated color derived from the tag name." />
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="tag-color"
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
                      <span className="absolute bottom-2 left-3 right-3 text-helper font-bold text-white truncate">{name || tag.name}</span>
                    </div>
                  </div>
                  <p className="text-helper text-muted-foreground">
                    The banner image is edited from the &ldquo;Add/Change Banner&rdquo; button on the tag&apos;s profile page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer toolbar */}
        <div className="sticky bottom-0 z-20 -mx-6 border-t border-border bg-card/80 backdrop-blur-md px-6 py-3">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push(`/tags/${tag.id}`)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />{saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <ConfirmationDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          onConfirm={handleDelete}
          title="Delete Tag"
          description={`Are you sure you want to delete the tag "${tag.name}"? It will be removed from all activities it is applied to. This action cannot be undone.`}
          confirmText="Delete Tag"
          isDestructive
          isLoading={deleting}
        />
      </div>
    </MainLayout>
  )
}
