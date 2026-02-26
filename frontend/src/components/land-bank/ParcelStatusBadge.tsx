import { Badge } from "@/components/ui/badge"
import { PARCEL_STATUS_LABELS, PARCEL_STATUS_BADGE_VARIANT } from "@/lib/land-bank-utils"
import type { ParcelStatus } from "@/types/land-bank"

interface ParcelStatusBadgeProps {
  status: ParcelStatus
  className?: string
}

export function ParcelStatusBadge({ status, className }: ParcelStatusBadgeProps) {
  const variant = PARCEL_STATUS_BADGE_VARIANT[status] || 'gray'
  const label = PARCEL_STATUS_LABELS[status] || status

  return (
    <Badge variant={variant as any} className={className}>
      {label}
    </Badge>
  )
}
