"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { ALLOCATION_STATUS_LABELS, ALLOCATION_STATUS_BADGE_VARIANT } from "@/lib/land-bank-utils"
import type { AllocationRequest, AllocationRequestStatus } from "@/types/land-bank"

interface AllocationScoringPanelProps {
  parcelId: string
  requests: AllocationRequest[]
  canManage: boolean
  onUpdate: () => void
}

export function AllocationScoringPanel({
  parcelId,
  requests,
  canManage,
  onUpdate,
}: AllocationScoringPanelProps) {
  const [activeRequest, setActiveRequest] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { purpose: number; track_record: number; feasibility: number; notes: string }>>({})
  const [submitting, setSubmitting] = useState(false)

  const getScores = (reqId: string) =>
    scores[reqId] || { purpose: 3, track_record: 3, feasibility: 3, notes: "" }

  const updateScore = (reqId: string, field: string, value: any) => {
    setScores(prev => ({
      ...prev,
      [reqId]: { ...getScores(reqId), [field]: value },
    }))
  }

  const handleAction = async (reqId: string, action: "approved" | "rejected") => {
    setSubmitting(true)
    try {
      const s = getScores(reqId)
      const res = await apiFetch(`/api/land-bank/${parcelId}/allocations/${reqId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          priority_score_purpose: s.purpose,
          priority_score_track_record: s.track_record,
          priority_score_feasibility: s.feasibility,
          reviewer_notes: s.notes || null,
        }),
      })

      if (res.ok) {
        onUpdate()
        setActiveRequest(null)
      }
    } catch {
      // Error handling silently
    } finally {
      setSubmitting(false)
    }
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No allocation requests yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const isExpanded = activeRequest === req.id
        const s = getScores(req.id)
        const totalScore = s.purpose + s.track_record + s.feasibility

        return (
          <div
            key={req.id}
            className="border rounded-lg p-4"
          >
            {/* Request header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {req.organization?.name || req.organization_id}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {req.purpose || "No purpose specified"} &middot; {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {req.total_score !== null && req.total_score > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">{req.total_score}/15</span>
                )}
                <Badge variant={ALLOCATION_STATUS_BADGE_VARIANT[req.status as AllocationRequestStatus] as any}>
                  {ALLOCATION_STATUS_LABELS[req.status as AllocationRequestStatus] || req.status}
                </Badge>
              </div>
            </div>

            {/* Dates */}
            {(req.proposed_start_date || req.proposed_end_date) && (
              <p className="text-xs text-muted-foreground mt-2">
                Proposed: {req.proposed_start_date || '—'} to {req.proposed_end_date || '—'}
              </p>
            )}

            {/* Scoring panel for pending requests */}
            {canManage && req.status === "pending" && (
              <div className="mt-3">
                {!isExpanded ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveRequest(req.id)}
                  >
                    Review & Score
                  </Button>
                ) : (
                  <div className="space-y-4 mt-2 pt-3 border-t">
                    {/* Score inputs */}
                    {[
                      { key: "purpose", label: "Purpose Alignment" },
                      { key: "track_record", label: "Track Record" },
                      { key: "feasibility", label: "Feasibility" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{label}</Label>
                          <span className="text-xs font-medium">{(s as any)[key]}/5</span>
                        </div>
                        <Input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={(s as any)[key]}
                          onChange={e => updateScore(req.id, key, parseInt(e.target.value))}
                          className="h-6 p-0 border-0"
                        />
                      </div>
                    ))}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Score</span>
                      <span className="font-bold">{totalScore}/15</span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Reviewer Notes</Label>
                      <Textarea
                        placeholder="Notes about this request..."
                        value={s.notes}
                        onChange={e => updateScore(req.id, "notes", e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.id, "approved")}
                        disabled={submitting}
                        className="gap-1"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(req.id, "rejected")}
                        disabled={submitting}
                        className="gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveRequest(null)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
