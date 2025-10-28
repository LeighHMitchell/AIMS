"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface FieldMeta {
  id: string
  label: string
  category: string
  supported: boolean
  docs?: string
}

interface RegistryResponse {
  version: number
  fields: FieldMeta[]
}

export function IATIImportPreferences({ organizationId }: { organizationId?: string }) {
  const [registry, setRegistry] = useState<RegistryResponse | null>(null)
  const [prefs, setPrefs] = useState<{ version: number; fields: Record<string, boolean> } | null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [regRes, prefRes] = await Promise.all([
        fetch('/api/iati/field-registry'),
        organizationId ? fetch(`/api/organizations/${organizationId}/iati-import-preferences`) : Promise.resolve(null as any)
      ])
      const reg = await regRes.json()
      setRegistry(reg)
      if (prefRes) {
        const p = await prefRes.json()
        setPrefs(p)
      } else {
        setPrefs({ version: reg.version, fields: Object.fromEntries(reg.fields.map((f: FieldMeta) => [f.id, true])) })
      }
    }
    load()
  }, [organizationId])

  const grouped = useMemo(() => {
    if (!registry) return {}
    const filtered = registry.fields.filter(f => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return f.label.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
    })
    return filtered.reduce((acc: Record<string, FieldMeta[]>, f) => {
      acc[f.category] = acc[f.category] || []
      acc[f.category].push(f)
      return acc
    }, {})
  }, [registry, search])

  const setAll = (value: boolean) => {
    if (!registry || !prefs) return
    const next = { ...prefs, fields: { ...prefs.fields } }
    for (const f of registry.fields) {
      next.fields[f.id] = value
    }
    setPrefs(next)
  }

  const save = async () => {
    if (!organizationId || !prefs) return
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${organizationId}/iati-import-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      })
      if (!res.ok) throw new Error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (!registry || !prefs) {
    return <div className="px-2 mt-4 text-sm text-muted-foreground">Loading IATI field registry…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAll(true)}>Select all</Button>
          <Button variant="outline" size="sm" onClick={() => setAll(false)}>Select none</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</Button>
        </div>
      </div>

      {Object.entries(grouped).map(([category, fields]) => (
        <div key={category} className="border rounded-md">
          <div className="px-3 py-2 font-medium bg-gray-50">{category}</div>
          <Separator />
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.id} className={cn('flex items-center justify-between gap-3 rounded-md border p-2', !f.supported && 'opacity-60') }>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{f.label}</span>
                    {!f.supported && (
                      <HelpTextTooltip content="Not yet supported in AIMS; shown for future compatibility." />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{f.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  {f.docs && (
                    <a href={f.docs} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Docs</a>
                  )}
                  <Switch
                    checked={!!prefs.fields[f.id]}
                    onCheckedChange={(val) => setPrefs(prev => ({...prev!, fields: { ...prev!.fields, [f.id]: val }}))}
                    disabled={!f.supported}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default IATIImportPreferences


