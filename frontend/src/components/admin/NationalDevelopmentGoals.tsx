"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Target } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { NationalDevelopmentGoal } from "@/types/project-bank"

export function NationalDevelopmentGoals() {
  const [goals, setGoals] = useState<NationalDevelopmentGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<NationalDevelopmentGoal | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    plan_name: "MSDP",
    display_order: 0,
    is_active: true,
  })

  const fetchGoals = async () => {
    try {
      const res = await apiFetch("/api/national-development-goals")
      if (res.ok) setGoals(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchGoals() }, [])

  const openAdd = () => {
    setEditingGoal(null)
    setForm({ code: "", name: "", description: "", plan_name: "MSDP", display_order: goals.length + 1, is_active: true })
    setShowDialog(true)
  }

  const openEdit = (goal: NationalDevelopmentGoal) => {
    setEditingGoal(goal)
    setForm({
      code: goal.code,
      name: goal.name,
      description: goal.description || "",
      plan_name: goal.plan_name,
      display_order: goal.display_order,
      is_active: goal.is_active,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingGoal) {
        await apiFetch(`/api/national-development-goals/${editingGoal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch("/api/national-development-goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      }
      setShowDialog(false)
      fetchGoals()
    } catch {} finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal? This cannot be undone.")) return
    try {
      await apiFetch(`/api/national-development-goals/${id}`, { method: "DELETE" })
      fetchGoals()
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            <div>
              <CardTitle>National Development Goals</CardTitle>
              <CardDescription>Configure NDP goals used for Project Bank alignment</CardDescription>
            </div>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        ) : goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No goals configured</p>
        ) : (
          <div className="space-y-2">
            {goals.map(goal => (
              <div key={goal.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-8">{goal.display_order}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{goal.code}</span>
                      <span className="text-sm">{goal.name}</span>
                      {!goal.is_active && <Badge variant="gray" className="text-[10px]">Inactive</Badge>}
                    </div>
                    {goal.description && (
                      <div className="text-xs text-muted-foreground">{goal.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">{goal.plan_name}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(goal)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Goal" : "Add Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. MSDP-1" />
              </div>
              <div>
                <Label>Plan Name</Label>
                <Input value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))} placeholder="e.g. MSDP" />
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Peace & Stability" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.code || !form.name}>
              {saving ? "Saving..." : editingGoal ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
