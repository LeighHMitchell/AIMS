"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, FileJson, FileSpreadsheet, AlertTriangle } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { useUser } from "@/hooks/useUser"
import { STATES_REGIONS } from "@/lib/land-bank-utils"
import { BulkImportPreview, type ImportRow } from "@/components/land-bank/BulkImportPreview"

export default function ImportParcelsPage() {
  const router = useRouter()
  const { permissions } = useUser()
  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: { index: number; error: string }[] } | null>(null)
  const geoJsonInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Geometry map: parcel_code → geometry
  const [geometries, setGeometries] = useState<Map<string, any>>(new Map())

  const handleGeoJsonUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        const features = json.type === "FeatureCollection"
          ? json.features
          : json.type === "Feature"
          ? [json]
          : []

        const geoMap = new Map<string, any>()
        features.forEach((f: any) => {
          const code = f.properties?.parcel_code || f.properties?.code || f.properties?.id
          if (code && f.geometry) {
            geoMap.set(String(code), f.geometry)
          }
        })

        setGeometries(geoMap)

        // Merge geometries into existing rows
        setRows(prev => prev.map(row => ({
          ...row,
          geometry: (row.parcel_code && geoMap.get(row.parcel_code)) || row.geometry,
        })))
      } catch {
        // Invalid JSON
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split("\n").filter(l => l.trim())
        if (lines.length < 2) return

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""))

        const parsed: ImportRow[] = lines.slice(1).map(line => {
          const values = parseCsvLine(line)
          const row: Record<string, string> = {}
          headers.forEach((h, i) => {
            row[h] = values[i]?.trim() || ""
          })

          const errors: string[] = []
          const name = row.name || row.parcel_name || ""
          const state_region = row.state_region || row.region || ""
          const parcel_code = row.parcel_code || row.code || ""
          const size = row.size_hectares || row.size || row.hectares || ""

          if (!name) errors.push("Name required")
          if (!state_region) errors.push("Region required")
          if (state_region && !STATES_REGIONS.includes(state_region as any)) {
            errors.push(`Invalid region: ${state_region}`)
          }

          return {
            parcel_code,
            name,
            state_region,
            township: row.township || "",
            size_hectares: size ? parseFloat(size) : undefined,
            classification: row.classification || row.type || "",
            geometry: geometries.get(parcel_code) || undefined,
            errors,
            isValid: errors.length === 0,
          }
        })

        setRows(parsed)
        setResult(null)
      } catch {
        // Invalid CSV
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [geometries])

  const handleImport = async () => {
    const validRows = rows.filter(r => r.isValid)
    if (validRows.length === 0) return

    setImporting(true)
    setResult(null)

    try {
      const res = await apiFetch("/api/land-bank/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcels: validRows.map(r => ({
            parcel_code: r.parcel_code || undefined,
            name: r.name,
            state_region: r.state_region,
            township: r.township || null,
            size_hectares: r.size_hectares || null,
            classification: r.classification || null,
            geometry: r.geometry || null,
          })),
        }),
      })

      if (res.ok) {
        setResult(await res.json())
      }
    } catch {
      // silent
    } finally {
      setImporting(false)
    }
  }

  if (!permissions.canCreateParcels) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You do not have permission to import parcels.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-[1100px] pb-16">
        <button
          onClick={() => router.push("/land-bank/parcels")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Parcels
        </button>

        <h1 className="text-2xl font-bold mb-2">Import Parcels</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Upload a CSV file with parcel metadata and optionally a GeoJSON file with geometries.
          Match geometries to parcels using the <code className="text-xs bg-muted px-1 rounded">parcel_code</code> property.
        </p>

        {/* Upload zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* CSV upload */}
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => csvInputRef.current?.click()}
          >
            <CardContent className="p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">Upload CSV Metadata</p>
              <p className="text-xs text-muted-foreground">
                Headers: name, state_region, township, size_hectares, classification, parcel_code
              </p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* GeoJSON upload */}
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => geoJsonInputRef.current?.click()}
          >
            <CardContent className="p-8 text-center">
              <FileJson className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">Upload GeoJSON Geometry</p>
              <p className="text-xs text-muted-foreground">
                FeatureCollection with <code className="bg-muted px-1 rounded">parcel_code</code> in properties
              </p>
              {geometries.size > 0 && (
                <p className="text-xs text-green-600 mt-2">{geometries.size} geometries loaded</p>
              )}
              <input
                ref={geoJsonInputRef}
                type="file"
                accept=".geojson,.json"
                onChange={handleGeoJsonUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview table */}
        {rows.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Preview</h2>
            <BulkImportPreview rows={rows} />
          </div>
        )}

        {/* Import button */}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <Button
              onClick={handleImport}
              disabled={importing || rows.filter(r => r.isValid).length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Importing..." : `Import ${rows.filter(r => r.isValid).length} Parcels`}
            </Button>
            <Button variant="outline" onClick={() => { setRows([]); setResult(null) }}>
              Clear
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Import Complete</h3>
              <p className="text-sm text-green-600 mb-1">{result.success} parcels imported successfully</p>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-destructive flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    {result.errors.length} errors
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>Row {err.index + 1}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.push("/land-bank/parcels")}
              >
                View All Parcels
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

/** Simple CSV line parser that handles quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
