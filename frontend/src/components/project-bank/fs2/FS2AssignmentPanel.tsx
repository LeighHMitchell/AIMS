"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  UserPlus, CheckCircle2, Clock, AlertCircle, FileText, Calendar,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { FS2Assignment } from "@/types/project-bank"

interface FS2AssignmentPanelProps {
  projectId: string
  feasibilityStage: string
  onUpdated?: () => void
}

export function FS2AssignmentPanel({ projectId, feasibilityStage, onUpdated }: FS2AssignmentPanelProps) {
  const [assignment, setAssignment] = useState<FS2Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create assignment form
  const [assignedTo, setAssignedTo] = useState("")
  const [deadline, setDeadline] = useState("")
  const [notes, setNotes] = useState("")

  // Complete assignment form
  const [firr, setFirr] = useState("")
  const [eirr, setEirr] = useState("")

  useEffect(() => {
    async function fetchAssignment() {
      try {
        const res = await apiFetch(`/api/project-bank/${projectId}/fs2-assignment`)
        if (res.ok) {
          const data = await res.json()
          setAssignment(data)
        }
      } catch {
        // no assignment yet
      } finally {
        setLoading(false)
      }
    }
    fetchAssignment()
  }, [projectId])

  const handleAssign = async () => {
    if (!assignedTo.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/fs2-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_to: assignedTo,
          deadline: deadline || null,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create assignment")
        return
      }

      const data = await res.json()
      setAssignment(data)
      onUpdated?.()
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!assignment) return
    setSubmitting(true)
    setError(null)

    try {
      const body: Record<string, any> = {
        assignment_id: assignment.id,
        status: newStatus,
      }

      if (newStatus === "completed") {
        if (firr) body.firr = parseFloat(firr)
        if (eirr) body.eirr = parseFloat(eirr)
      }

      const res = await apiFetch(`/api/project-bank/${projectId}/fs2-assignment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update assignment")
        return
      }

      const data = await res.json()
      setAssignment(data)
      onUpdated?.()
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="h-32 bg-muted animate-pulse rounded-lg" />
  }

  // Only show for projects that have passed FS-1
  const canAssign = feasibilityStage === "fs1_passed" && !assignment

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">FS-2: Detailed Feasibility Study</h3>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Assignment form */}
      {canAssign && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Assign an external consultant or firm to conduct the detailed feasibility study.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Consultant / Firm Name</Label>
              <Input
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                placeholder="e.g. Myanmar Infrastructure Advisory"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Special instructions or terms of reference..."
            />
          </div>
          <Button onClick={handleAssign} disabled={!assignedTo.trim() || submitting} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {submitting ? "Assigning..." : "Assign Consultant"}
          </Button>
        </div>
      )}

      {/* Assignment details */}
      {assignment && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Assigned To</span>
              <p className="font-medium">{assignment.assigned_to}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <p className="font-medium capitalize flex items-center gap-1.5">
                {assignment.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                {assignment.status === "in_progress" && <Clock className="h-3.5 w-3.5 text-blue-600" />}
                {assignment.status === "overdue" && <AlertCircle className="h-3.5 w-3.5 text-red-600" />}
                {assignment.status.replace(/_/g, " ")}
              </p>
            </div>
            {assignment.deadline && (
              <div>
                <span className="text-muted-foreground text-xs">Deadline</span>
                <p className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(assignment.deadline).toLocaleDateString()}
                </p>
              </div>
            )}
            {assignment.notes && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">Notes</span>
                <p className="text-sm">{assignment.notes}</p>
              </div>
            )}
          </div>

          {/* Status advancement buttons */}
          {assignment.status === "assigned" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusUpdate("in_progress")}
              disabled={submitting}
            >
              Mark as In Progress
            </Button>
          )}

          {assignment.status === "in_progress" && (
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-medium">Complete Study — Enter Results</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">FIRR (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={firr}
                    onChange={e => setFirr(e.target.value)}
                    placeholder="e.g. 7.2"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">EIRR (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={eirr}
                    onChange={e => setEirr(e.target.value)}
                    placeholder="e.g. 18.3"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleStatusUpdate("completed")}
                disabled={submitting}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Saving..." : "Mark Study Complete"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
