"use client"

import { Badge } from "@/components/ui/badge"
import { formatCurrency, DONOR_TYPE_LABELS, INSTRUMENT_TYPE_LABELS, COMMITMENT_STATUS_LABELS } from "@/lib/project-bank-utils"
import type { ProjectBankDonor } from "@/types/project-bank"

interface DonorCommitmentsProps {
  donors: ProjectBankDonor[]
}

export function DonorCommitments({ donors }: DonorCommitmentsProps) {
  if (donors.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No donor commitments yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {donors.map(d => (
        <div key={d.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
          <div>
            <div className="text-sm font-medium">{d.donor_name}</div>
            <div className="text-xs text-muted-foreground">
              {d.donor_type ? DONOR_TYPE_LABELS[d.donor_type] : ''}
              {d.instrument_type ? ` · ${INSTRUMENT_TYPE_LABELS[d.instrument_type]}` : ''}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-medium">{formatCurrency(d.amount, d.currency)}</div>
            <Badge variant="outline" className="text-[10px]">
              {COMMITMENT_STATUS_LABELS[d.commitment_status] || d.commitment_status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
