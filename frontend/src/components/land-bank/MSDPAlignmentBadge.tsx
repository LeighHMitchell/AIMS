import { Badge } from "@/components/ui/badge"
import { Target } from "lucide-react"

interface MSDPAlignmentBadgeProps {
  goalName: string | null | undefined
  goalCode?: string | null
  secondaryCount?: number
}

export function MSDPAlignmentBadge({ goalName, goalCode, secondaryCount = 0 }: MSDPAlignmentBadgeProps) {
  if (!goalName) return null

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className="gap-1">
        <Target className="h-3 w-3" />
        {goalCode ? `${goalCode} — ` : ""}{goalName}
      </Badge>
      {secondaryCount > 0 && (
        <span className="text-xs text-muted-foreground">+{secondaryCount} more</span>
      )}
    </div>
  )
}
