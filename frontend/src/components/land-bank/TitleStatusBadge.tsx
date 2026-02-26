import { Badge } from "@/components/ui/badge"
import { TITLE_STATUS_LABELS, TITLE_STATUS_BADGE_VARIANT } from "@/lib/land-bank-utils"
import type { TitleStatus } from "@/types/land-bank"

interface TitleStatusBadgeProps {
  status: TitleStatus | string
}

export function TitleStatusBadge({ status }: TitleStatusBadgeProps) {
  const label = TITLE_STATUS_LABELS[status as TitleStatus] || status
  const variant = TITLE_STATUS_BADGE_VARIANT[status as TitleStatus] || "gray"

  return (
    <Badge variant={variant as any}>{label}</Badge>
  )
}
