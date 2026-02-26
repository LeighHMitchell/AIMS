import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { isLeaseExpiringSoon, daysUntilLeaseExpiry } from "@/lib/land-bank-utils"

interface LeaseExpiryBadgeProps {
  leaseEndDate: string | null
  className?: string
}

export function LeaseExpiryBadge({ leaseEndDate, className }: LeaseExpiryBadgeProps) {
  if (!leaseEndDate || !isLeaseExpiringSoon(leaseEndDate)) return null

  const days = daysUntilLeaseExpiry(leaseEndDate)
  if (days === null) return null

  const label = days <= 0 ? 'Lease Expired' : `Lease expires in ${days}d`

  return (
    <Badge variant={days <= 0 ? 'destructive' : 'warning'} className={className}>
      <AlertTriangle className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  )
}
