"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-fetch"
import { DONOR_TYPE_LABELS, INSTRUMENT_TYPE_LABELS, COMMITMENT_STATUS_LABELS } from "@/lib/project-bank-utils"

interface AddDonorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSaved: () => void
}

export function AddDonorModal({ open, onOpenChange, projectId, onSaved }: AddDonorModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    donor_name: "",
    donor_type: "",
    instrument_type: "",
    amount: "",
    currency: "USD",
    commitment_status: "expression_of_interest",
    notes: "",
  })

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.donor_name.trim()) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/donors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: form.amount ? parseFloat(form.amount) : null,
          donor_type: form.donor_type || null,
          instrument_type: form.instrument_type || null,
        }),
      })
      if (res.ok) {
        onSaved()
        onOpenChange(false)
        setForm({ donor_name: "", donor_type: "", instrument_type: "", amount: "", currency: "USD", commitment_status: "expression_of_interest", notes: "" })
      }
    } catch {} finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Donor Commitment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Donor Name *</Label>
            <Input value={form.donor_name} onChange={e => set("donor_name", e.target.value)} placeholder="e.g. World Bank" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Donor Type</Label>
              <Select value={form.donor_type} onValueChange={v => set("donor_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DONOR_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Instrument</Label>
              <Select value={form.instrument_type} onValueChange={v => set("instrument_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INSTRUMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.commitment_status} onValueChange={v => set("commitment_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COMMITMENT_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.donor_name.trim()}>
            {saving ? "Saving..." : "Add Donor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
