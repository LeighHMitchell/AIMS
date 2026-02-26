import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, DollarSign } from "lucide-react"
import type { PublicProject } from "@/types/land-bank"

interface InvestorProjectCardProps {
  project: PublicProject
  onClick?: () => void
}

export function InvestorProjectCard({ project, onClick }: InvestorProjectCardProps) {
  const formatCost = (cost: number | null, currency: string) => {
    if (!cost) return null
    if (cost >= 1_000_000) {
      return `${currency} ${(cost / 1_000_000).toFixed(1)}M`
    }
    if (cost >= 1_000) {
      return `${currency} ${(cost / 1_000).toFixed(0)}K`
    }
    return `${currency} ${cost.toLocaleString()}`
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-sm">{project.name}</h3>
          <Badge variant="success" className="shrink-0">Approved</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-3">{project.project_code}</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {project.region && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {project.region}
            </div>
          )}
          {project.estimated_cost && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {formatCost(project.estimated_cost, project.currency)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          <Badge variant="outline" className="text-[10px]">{project.sector}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
