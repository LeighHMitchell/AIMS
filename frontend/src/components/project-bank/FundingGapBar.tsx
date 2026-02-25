"use client"

import { formatCurrency } from "@/lib/project-bank-utils"

interface FundingGapBarProps {
  totalCost: number
  totalCommitted: number
  fundingGap: number
}

export function FundingGapBar({ totalCost, totalCommitted, fundingGap }: FundingGapBarProps) {
  const pct = totalCost > 0 ? Math.round((totalCommitted / totalCost) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">Funding Progress</span>
        <span className="text-sm text-muted-foreground">{pct}% secured</span>
      </div>
      <div className="w-full h-4 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#cfd0d5' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: '#7b95a7' }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Secured: <span className="font-mono" style={{ color: '#7b95a7' }}>{formatCurrency(totalCommitted)}</span></span>
        <span>Gap: <span className="font-mono" style={{ color: '#dc2625' }}>{formatCurrency(fundingGap)}</span></span>
        <span>Total: <span className="font-mono" style={{ color: '#4c5568' }}>{formatCurrency(totalCost)}</span></span>
      </div>
    </div>
  )
}
