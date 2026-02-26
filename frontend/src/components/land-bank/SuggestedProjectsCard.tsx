"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Link2, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { SuggestedProject } from "@/types/land-bank"

interface SuggestedProjectsCardProps {
  parcelId: string
  canLink: boolean
  onLinked?: () => void
}

export function SuggestedProjectsCard({ parcelId, canLink, onLinked }: SuggestedProjectsCardProps) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<SuggestedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [linkingId, setLinkingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiFetch(`/api/land-bank/${parcelId}/suggested-projects`)
        if (res.ok) setSuggestions(await res.json())
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [parcelId])

  const handleLink = async (projectId: string) => {
    setLinkingId(projectId)
    try {
      const res = await apiFetch(`/api/land-bank/${parcelId}/link-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      })
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== projectId))
        onLinked?.()
      }
    } catch {
      // silent
    } finally {
      setLinkingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding matches...
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
          Suggested Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {suggestions.slice(0, 5).map(project => (
            <div key={project.id} className="px-4 py-3">
              <div
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={() => router.push(`/project-bank/${project.id}`)}
              >
                <p className="text-sm font-medium">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.project_code}</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {project.match_reasons.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] py-0">
                    {r}
                  </Badge>
                ))}
              </div>
              {canLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1.5 h-7 text-xs gap-1"
                  onClick={() => handleLink(project.id)}
                  disabled={linkingId === project.id}
                >
                  {linkingId === project.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Link2 className="h-3 w-3" />
                  )}
                  Link
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
