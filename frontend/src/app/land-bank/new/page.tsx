"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { useUser } from "@/hooks/useUser"
import { STATES_REGIONS, generateParcelCodeSuggestion } from "@/lib/land-bank-utils"
import { ParcelDrawMap } from "@/components/land-bank/ParcelDrawMap"

export default function NewParcelPage() {
  const router = useRouter()
  const { permissions } = useUser()
  const [classifications, setClassifications] = useState<{ name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [parcelCode, setParcelCode] = useState("")
  const [stateRegion, setStateRegion] = useState("")
  const [township, setTownship] = useState("")
  const [sizeHectares, setSizeHectares] = useState("")
  const [classification, setClassification] = useState("")
  const [notes, setNotes] = useState("")
  const [geometry, setGeometry] = useState<any>(null)

  useEffect(() => {
    async function fetchClassifications() {
      try {
        const res = await apiFetch("/api/land-bank/classifications")
        if (res.ok) setClassifications(await res.json())
      } catch {}
    }
    fetchClassifications()
  }, [])

  // Auto-suggest parcel code when region changes
  useEffect(() => {
    if (stateRegion && !parcelCode) {
      setParcelCode(generateParcelCodeSuggestion(stateRegion))
    }
  }, [stateRegion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch("/api/land-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          parcel_code: parcelCode.trim() || undefined,
          state_region: stateRegion,
          township: township.trim() || null,
          size_hectares: sizeHectares ? parseFloat(sizeHectares) : null,
          classification: classification || null,
          notes: notes.trim() || null,
          geometry,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create parcel")
      }

      const parcel = await res.json()
      router.push(`/land-bank/${parcel.id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!permissions.canCreateParcels) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You do not have permission to register parcels.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-[960px] pb-16">
        {/* Back link */}
        <button
          onClick={() => router.push("/land-bank/parcels")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Parcels
        </button>

        <h1 className="text-2xl font-bold mb-6">Register New Parcel</h1>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Parcel Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Thilawa Industrial Plot A"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parcel-code">
                      Parcel Code
                      <span className="text-xs text-muted-foreground ml-1">(auto-generated if blank)</span>
                    </Label>
                    <Input
                      id="parcel-code"
                      value={parcelCode}
                      onChange={e => setParcelCode(e.target.value)}
                      placeholder="e.g. YGN-0001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State/Region *</Label>
                    <Select value={stateRegion} onValueChange={setStateRegion} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES_REGIONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="township">Township</Label>
                    <Input
                      id="township"
                      value={township}
                      onChange={e => setTownship(e.target.value)}
                      placeholder="e.g. Thilawa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size">Size (Hectares)</Label>
                    <Input
                      id="size"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={sizeHectares}
                      onChange={e => setSizeHectares(e.target.value)}
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Classification</Label>
                    <Select value={classification} onValueChange={setClassification}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classifications.map(c => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Additional details about this parcel..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Geometry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Geometry</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Draw a polygon on the map or upload a GeoJSON file to define the parcel boundary.
                </p>
                <ParcelDrawMap geometry={geometry} onChange={setGeometry} />
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting || !name.trim() || !stateRegion}>
                {submitting ? "Registering..." : "Register Parcel"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
