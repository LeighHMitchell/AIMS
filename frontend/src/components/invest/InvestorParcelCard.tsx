import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Layers } from "lucide-react"
import { formatHectares } from "@/lib/land-bank-utils"
import { TitleStatusBadge } from "@/components/land-bank/TitleStatusBadge"
import type { PublicParcel } from "@/types/land-bank"

interface InvestorParcelCardProps {
  parcel: PublicParcel
  onClick?: () => void
}

export function InvestorParcelCard({ parcel, onClick }: InvestorParcelCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-sm">{parcel.name}</h3>
          <TitleStatusBadge status={parcel.title_status} />
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-3">{parcel.parcel_code}</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {parcel.state_region}{parcel.township ? `, ${parcel.township}` : ""}
          </div>
          {parcel.size_hectares && (
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {formatHectares(parcel.size_hectares)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {parcel.classification && (
            <Badge variant="outline" className="text-[10px]">{parcel.classification}</Badge>
          )}
          {parcel.asset_type && (
            <Badge variant="outline" className="text-[10px]">{parcel.asset_type}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
