"use client"

import { useRouter } from "next/navigation"
import {
  MoreVertical,
  Pencil,
  FileSpreadsheet,
  FileCode,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import type { LandParcel } from "@/types/land-bank"

interface ParcelActionMenuProps {
  parcel: LandParcel
  canEdit: boolean
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ParcelActionMenu({ parcel, canEdit }: ParcelActionMenuProps) {
  const router = useRouter()

  const handleExportCSV = () => {
    const headers = [
      "Parcel Code", "Name", "State/Region", "Township",
      "Size (Hectares)", "Classification", "Status",
      "Lease Start", "Lease End", "Created At",
    ]
    const row = [
      csvEscape(parcel.parcel_code),
      csvEscape(parcel.name),
      csvEscape(parcel.state_region),
      csvEscape(parcel.township),
      parcel.size_hectares ?? "",
      csvEscape(parcel.classification),
      parcel.status,
      parcel.lease_start_date || "",
      parcel.lease_end_date || "",
      parcel.created_at,
    ]
    const csv = [headers.join(","), row.join(",")].join("\n")
    downloadBlob(
      new Blob([csv], { type: "text/csv" }),
      `${parcel.parcel_code || parcel.name}-export.csv`,
    )
  }

  const handleExportGeoJSON = () => {
    const feature = {
      type: "Feature",
      properties: {
        name: parcel.name,
        parcel_code: parcel.parcel_code,
        state_region: parcel.state_region,
        township: parcel.township,
        size_hectares: parcel.size_hectares,
        classification: parcel.classification,
        status: parcel.status,
      },
      geometry: parcel.geometry,
    }
    downloadBlob(
      new Blob([JSON.stringify(feature, null, 2)], { type: "application/geo+json" }),
      `${parcel.parcel_code || parcel.name}.geojson`,
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canEdit && (
          <>
            <DropdownMenuItem onClick={() => router.push(`/land-bank/${parcel.id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2 text-slate-500" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="h-4 w-4 mr-2" />
            Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportGeoJSON}>
              <FileCode className="h-4 w-4 mr-2" />
              Export as GeoJSON
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
