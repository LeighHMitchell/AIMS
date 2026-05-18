"use client"

import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ChartMethodologyProps {
  source: string
  basis: string
  currency?: string
  asOf?: string
  notes?: string
  className?: string
}

export function ChartMethodology({
  source,
  basis,
  currency,
  asOf,
  notes,
  className,
}: ChartMethodologyProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Chart methodology"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors",
            className
          )}
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Methodology</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground min-w-[70px]">Source</dt>
              <dd className="text-foreground">{source}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground min-w-[70px]">Basis</dt>
              <dd className="text-foreground">{basis}</dd>
            </div>
            {currency && (
              <div className="flex gap-2">
                <dt className="font-medium text-muted-foreground min-w-[70px]">Currency</dt>
                <dd className="text-foreground">{currency}</dd>
              </div>
            )}
            {asOf && (
              <div className="flex gap-2">
                <dt className="font-medium text-muted-foreground min-w-[70px]">As of</dt>
                <dd className="text-foreground">{asOf}</dd>
              </div>
            )}
          </dl>
          {notes && (
            <p className="text-xs text-muted-foreground border-t pt-2">{notes}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
