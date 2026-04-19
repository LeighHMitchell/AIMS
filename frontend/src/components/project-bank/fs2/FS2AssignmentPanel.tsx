"use client"

import { useState, useEffect } from "react"
import { RequiredDot } from "@/components/ui/required-dot"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  UserPlus, CheckCircle2, Clock, AlertCircle, FileText, Calendar, Pencil, X, Save,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { GateChecklistModal, type ChecklistItem } from "@/components/project-bank/gate-checklist/GateChecklistModal"
import type { FS2Assignment, ProjectDocument } from "@/types/project-bank"

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

  // Edit assignment form
  const [editing, setEditing] = useState(false)
  const [editAssignedTo, setEditAssignedTo] = useState("")
  const [editDeadline, setEditDeadline] = useState("")
  const [editNotes, setEditNotes] = useState("")

  // Complete assignment form
  const [firr, setFirr] = useState("")
  const [eirr, setEirr] = useState("")

  // Gate modal state
  const [showGateModal, setShowGateModal] = useState(false)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])

  const fetchDocuments = async () => {
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/documents`)
      if (res.ok) setDocuments(await res.json())
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchDocuments() }, [projectId])

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

  const startEditing = () => {
    if (!assignment) return
    setEditAssignedTo(assignment.assigned_to)
    setEditDeadline(assignment.deadline ? assignment.deadline.slice(0, 10) : "")
    setEditNotes(assignment.notes || "")
    setEditing(true)
  }

  const handleEditSave = async () => {
    if (!assignment || !editAssignedTo.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/fs2-assignment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignment.id,
          assigned_to: editAssignedTo,
          deadline: editDeadline || null,
          notes: editNotes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update assignment")
        return
      }

      const data = await res.json()
      setAssignment(data)
      setEditing(false)
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

  const canAssign = (feasibilityStage === "fs1_passed" || feasibilityStage === "fs2_assigned" || feasibilityStage === "fs1_approved") && !assignment

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">FS-2: Detailed Feasibility Study</h3>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-body text-destructive">{error}</p>
        </div>
      )}

      {/* Assignment form */}
      {canAssign && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="text-body text-muted-foreground">
            Assign an external consultant or firm to conduct the detailed feasibility study.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-helper">Consultant / Firm Name</Label>
              <Input
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                placeholder="e.g. Myanmar Infrastructure Advisory"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-helper">Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-helper">Notes</Label>
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
      {assignment && !editing && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="grid grid-cols-2 gap-4 text-body flex-1">
              <div>
                <span className="text-muted-foreground text-helper">Assigned To</span>
                <p className="font-medium">{assignment.assigned_to}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-helper">Status</span>
                <p className="font-medium capitalize flex items-center gap-1.5">
                  {assignment.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success-icon))]" />}
                  {assignment.status === "in_progress" && <Clock className="h-3.5 w-3.5 text-blue-600" />}
                  {assignment.status === "overdue" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                  {assignment.status.replace(/_/g, " ")}
                </p>
              </div>
              {assignment.deadline && (
                <div>
                  <span className="text-muted-foreground text-helper">Deadline</span>
                  <p className="font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(assignment.deadline).toLocaleDateString()}
                  </p>
                </div>
              )}
              {assignment.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-helper">Notes</span>
                  <p className="text-body">{assignment.notes}</p>
                </div>
              )}
            </div>
            {assignment.status !== "completed" && (
              <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1.5 shrink-0">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
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
              <h4 className="text-body font-medium">Complete Study — Enter Results</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-helper">FIRR (%) <RequiredDot /></Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={firr}
                    onChange={e => setFirr(e.target.value)}
                    placeholder="e.g. 7.2"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-helper">EIRR (%) <RequiredDot /></Label>
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
                onClick={() => setShowGateModal(true)}
                disabled={submitting || !firr || !eirr}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Study Complete
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Inline edit form */}
      {assignment && editing && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-body font-medium">Edit Assignment</h4>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-helper">Consultant / Firm Name</Label>
              <Input
                value={editAssignedTo}
                onChange={e => setEditAssignedTo(e.target.value)}
                placeholder="e.g. Myanmar Infrastructure Advisory"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-helper">Deadline</Label>
              <Input
                type="date"
                value={editDeadline}
                onChange={e => setEditDeadline(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-helper">Notes</Label>
            <Textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={2}
              placeholder="Special instructions or terms of reference..."
            />
          </div>
          <Button onClick={handleEditSave} disabled={!editAssignedTo.trim() || submitting} className="gap-2">
            <Save className="h-4 w-4" />
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {/* Gate 2 checklist modal */}
      <GateChecklistModal
        open={showGateModal}
        onOpenChange={setShowGateModal}
        title="Complete FS-2 Study"
        description="Confirm all requirements before marking the feasibility study as complete."
        projectId={projectId}
        items={[
          { key: "firr_confirm", label: `FIRR result: ${firr}%`, type: "checkbox" },
          { key: "eirr_confirm", label: `EIRR result: ${eirr}%`, type: "checkbox" },
          { key: "detailed_fs_report", label: "Detailed FS Report", type: "document", documentType: "detailed_fs_report", documentLabel: "Detailed FS Report" },
          { key: "cost_benefit_analysis", label: "Cost-Benefit Analysis", type: "document", documentType: "cost_benefit_analysis", documentLabel: "Cost-Benefit Analysis" },
          { key: "financial_model_verified", label: "Financial model has been independently verified", type: "checkbox" },
        ]}
        existingDocuments={documents}
        onDocumentUploaded={fetchDocuments}
        onConfirm={async () => {
          await handleStatusUpdate("completed")
          setShowGateModal(false)
        }}
        confirmLabel="Complete Study"
        confirming={submitting}
      />
    </div>
  )
}
