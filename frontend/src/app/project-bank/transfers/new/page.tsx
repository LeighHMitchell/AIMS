"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, TrendingDown } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { SECTORS } from "@/lib/project-bank-utils"

const MINISTRIES = [
  'Ministry of Planning and Finance',
  'Ministry of Industry',
  'Ministry of Transport and Communications',
  'Ministry of Electricity and Energy',
  'Ministry of Construction',
  'Ministry of Agriculture, Livestock and Irrigation',
  'Ministry of Natural Resources and Environmental Conservation',
  'Ministry of Hotels and Tourism',
  'Ministry of Commerce',
  'Ministry of Education',
  'Ministry of Health',
  'Ministry of Defence',
  'Other',
] as const

export default function NewTransferPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    see_name: '',
    see_sector: '',
    see_ministry: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.see_name.trim()) {
      setError('SEE name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await apiFetch('/api/see-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create transfer')
      }

      const transfer = await res.json()
      router.push(`/project-bank/transfers/${transfer.id}/assessment`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout>
      <div className="max-w-[640px] pb-16">
        <div className="flex items-center gap-3 mb-6">
          <TrendingDown className="h-7 w-7 text-muted-foreground" />
          <h1 className="text-2xl font-bold">New SEE Transfer</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enterprise Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="see_name">Enterprise Name *</Label>
                <Input
                  id="see_name"
                  value={form.see_name}
                  onChange={e => setForm(prev => ({ ...prev, see_name: e.target.value }))}
                  placeholder="e.g. Myanmar Timber Enterprise"
                />
              </div>

              <div>
                <Label htmlFor="see_sector">Sector</Label>
                <Select
                  value={form.see_sector}
                  onValueChange={v => setForm(prev => ({ ...prev, see_sector: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="see_ministry">Parent Ministry</Label>
                <Select
                  value={form.see_ministry}
                  onValueChange={v => setForm(prev => ({ ...prev, see_ministry: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ministry" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINISTRIES.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the enterprise and transfer rationale"
                  rows={3}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Create & Begin Assessment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
