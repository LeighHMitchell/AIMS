"use client"

import { HISTORY_ACTION_LABELS } from "@/lib/land-bank-utils"
import type { LandParcelHistory } from "@/types/land-bank"

interface ParcelHistoryTimelineProps {
  history: LandParcelHistory[]
}

export function ParcelHistoryTimeline({ history }: ParcelHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No history recorded yet.</p>
    )
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

      <div className="space-y-4">
        {history.map((entry) => {
          const userName = entry.user
            ? `${entry.user.first_name || ''} ${entry.user.last_name || ''}`.trim()
            : 'System';

          return (
            <div key={entry.id} className="relative">
              {/* Dot */}
              <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-border border-2 border-background" />

              <div>
                <p className="text-sm font-medium">
                  {HISTORY_ACTION_LABELS[entry.action] || entry.action}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  by {userName} &middot; {new Date(entry.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {entry.details && Object.keys(entry.details).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDetails(entry.details)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatDetails(details: Record<string, any>): string {
  if (details.reason) return details.reason;
  if (details.organization_name) return `Organization: ${details.organization_name}`;
  if (details.fields_changed) return `Fields: ${details.fields_changed.join(', ')}`;
  return '';
}
