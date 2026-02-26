"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { formatHectares } from "@/lib/land-bank-utils"
import type { SuggestedParcel } from "@/types/land-bank"

interface SuggestedParcelsCardProps {
  projectId: string
}

export function SuggestedParcelsCard({ projectId }: SuggestedParcelsCardProps) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<SuggestedParcel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiFetch(`/api/project-bank/${projectId}/suggested-parcels`)
        if (res.ok) setSuggestions(await res.json())
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [projectId])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding parcels...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4" />
          Suggested Parcels
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {suggestions.slice(0, 5).map(parcel => (
            <div
              key={parcel.id}
              className="px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/land-bank/${parcel.id}`)}
            >
              <p className="text-sm font-medium">{parcel.name}</p>
              <p className="text-xs text-muted-foreground">
                {parcel.parcel_code} · {parcel.state_region}
                {parcel.size_hectares ? ` · ${formatHectares(parcel.size_hectares)}` : ""}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {parcel.match_reasons.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] py-0">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
