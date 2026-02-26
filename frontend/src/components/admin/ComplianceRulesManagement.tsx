"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Scale, Save, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { ProjectBankSetting } from "@/types/project-bank"

const ENFORCEMENT_OPTIONS = [
  { value: 'enforce', label: 'Enforce', variant: 'destructive' as const },
  { value: 'warn', label: 'Warn', variant: 'amber' as const },
  { value: 'off', label: 'Off', variant: 'gray' as const },
]

function getValueDisplay(setting: ProjectBankSetting): { label: string; field: string; type: 'number' } {
  const v = setting.value || {};
  if ('amount' in v) return { label: 'Amount', field: 'amount', type: 'number' };
  if ('percentage' in v) return { label: 'Percentage (%)', field: 'percentage', type: 'number' };
  if ('months' in v) return { label: 'Months', field: 'months', type: 'number' };
  return { label: 'Value', field: 'amount', type: 'number' };
}

export function ComplianceRulesManagement() {
  const [settings, setSettings] = useState<ProjectBankSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, { value: any; enforcement: string }>>({})

  const fetchSettings = async () => {
    try {
      const res = await apiFetch("/api/project-bank-settings")
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        const initial: Record<string, { value: any; enforcement: string }> = {}
        data.forEach((s: ProjectBankSetting) => {
          initial[s.key] = { value: s.value, enforcement: s.enforcement }
        })
        setEditValues(initial)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchSettings() }, [])

  const handleSave = async (key: string) => {
    const edit = editValues[key]
    if (!edit) return
    setSaving(key)
    try {
      await apiFetch("/api/project-bank-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: edit.value, enforcement: edit.enforcement }),
      })
      fetchSettings()
    } catch {} finally { setSaving(null) }
  }

  const updateValue = (key: string, field: string, val: string) => {
    setEditValues(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: { ...prev[key]?.value, [field]: val === '' ? null : Number(val) },
      },
    }))
  }

  const updateEnforcement = (key: string, enforcement: string) => {
    setEditValues(prev => ({
      ...prev,
      [key]: { ...prev[key], enforcement },
    }))
  }

  const hasChanges = (setting: ProjectBankSetting): boolean => {
    const edit = editValues[setting.key]
    if (!edit) return false
    return JSON.stringify(edit.value) !== JSON.stringify(setting.value) ||
           edit.enforcement !== setting.enforcement
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          <div>
            <CardTitle>Compliance Rules</CardTitle>
            <CardDescription>Configure enforcement rules per Notification No. 2/2018</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}
          </div>
        ) : settings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No compliance rules configured. Run the migration to seed defaults.</p>
        ) : (
          <div className="space-y-4">
            {settings.map(setting => {
              const display = getValueDisplay(setting)
              const edit = editValues[setting.key] || { value: setting.value, enforcement: setting.enforcement }
              const changed = hasChanges(setting)

              return (
                <div key={setting.key} className="p-4 bg-muted/30 rounded-lg border space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{setting.label}</span>
                        <Badge variant={
                          edit.enforcement === 'enforce' ? 'destructive' :
                          edit.enforcement === 'warn' ? 'amber' : 'gray'
                        } className="text-[10px]">
                          {edit.enforcement.toUpperCase()}
                        </Badge>
                      </div>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                      )}
                    </div>
                    {changed && (
                      <Button
                        size="sm"
                        onClick={() => handleSave(setting.key)}
                        disabled={saving === setting.key}
                        className="gap-1.5"
                      >
                        {saving === setting.key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{display.label}</Label>
                      <Input
                        type="number"
                        value={edit.value?.[display.field] ?? ''}
                        onChange={e => updateValue(setting.key, display.field, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Enforcement Mode</Label>
                      <Select
                        value={edit.enforcement}
                        onValueChange={v => updateEnforcement(setting.key, v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENFORCEMENT_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
