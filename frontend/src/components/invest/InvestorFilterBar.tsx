"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import { STATES_REGIONS } from "@/lib/land-bank-utils"

interface InvestorFilterBarProps {
  searchQuery: string
  onSearchChange: (v: string) => void
  regionFilter: string
  onRegionChange: (v: string) => void
  classificationFilter: string
  onClassificationChange: (v: string) => void
  classifications: string[]
  assetTypeFilter: string
  onAssetTypeChange: (v: string) => void
  assetTypes: string[]
}

export function InvestorFilterBar({
  searchQuery,
  onSearchChange,
  regionFilter,
  onRegionChange,
  classificationFilter,
  onClassificationChange,
  classifications,
  assetTypeFilter,
  onAssetTypeChange,
  assetTypes,
}: InvestorFilterBarProps) {
  return (
    <div className="flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-gray-200 flex-wrap">
      <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-sm">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parcels..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Region</Label>
        <Select value={regionFilter} onValueChange={onRegionChange}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {STATES_REGIONS.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Classification</Label>
        <Select value={classificationFilter} onValueChange={onClassificationChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {classifications.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Asset Type</Label>
        <Select value={assetTypeFilter} onValueChange={onAssetTypeChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            {assetTypes.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
