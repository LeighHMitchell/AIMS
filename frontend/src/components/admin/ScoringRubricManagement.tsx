"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Plus, Trash2, Loader2, CheckCircle, Copy, Zap, Pencil, RefreshCw,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { SubCriterionEditor } from "./SubCriterionEditor"
import type {
  ScoringRubricVersion, ScoringCriterion, ScoringDimension, ScoringStage, SubCriterionConfig,
} from "@/types/project-bank"

const STAGE_LABELS: Record<ScoringStage, string> = {
  intake: 'Intake',
  fs1: 'FS-1 (Preliminary)',
  fs2: 'FS-2 (Detailed)',
}

const DIMENSION_LABELS: Record<ScoringDimension, string> = {
  msdp_alignment: 'MSDP Alignment',
  financial_viability: 'Financial Viability',
  technical_maturity: 'Technical Maturity',
  environmental_social_risk: 'Env & Social Risk Management',
  institutional_capacity: 'Institutional Capacity',
}

const STAGES: ScoringStage[] = ['intake', 'fs1', 'fs2']
const DIMENSIONS: ScoringDimension[] = [
  'msdp_alignment', 'financial_viability', 'technical_maturity',
  'environmental_social_risk', 'institutional_capacity',
]

export function ScoringRubricManagement() {
  const [versions, setVersions] = useState<ScoringRubricVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<ScoringRubricVersion | null>(null)
  const [criteria, setCriteria] = useState<ScoringCriterion[]>([])
  const [loading, setLoading] = useState(true)
  const [criteriaLoading, setCriteriaLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeStageTab, setActiveStageTab] = useState<ScoringStage>('intake')
  const [createOpen, setCreateOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [cloneFrom, setCloneFrom] = useState('')
  const [subCriterionEditorOpen, setSubCriterionEditorOpen] = useState(false)
  const [editingSubCriterion, setEditingSubCriterion] = useState<{ stageIdx: number; dimIdx: number; subIdx: number | null } | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  // Fetch versions
  const fetchVersions = async () => {
    try {
      const res = await apiFetch('/api/scoring-rubric')
      if (res.ok) setVersions(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchVersions() }, [])

  // Fetch criteria when version selected
  const fetchCriteria = async (versionId: string) => {
    setCriteriaLoading(true)
    try {
      const res = await apiFetch(`/api/scoring-rubric/${versionId}/criteria`)
      if (res.ok) setCriteria(await res.json())
    } catch {} finally { setCriteriaLoading(false) }
  }

  useEffect(() => {
    if (selectedVersion) fetchCriteria(selectedVersion.id)
    else setCriteria([])
  }, [selectedVersion?.id])

  // Create version
  const handleCreate = async () => {
    const res = await apiFetch('/api/scoring-rubric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: newLabel,
        description: newDescription || null,
        clone_from_version_id: cloneFrom || undefined,
      }),
    })
    if (res.ok) {
      setCreateOpen(false)
      setNewLabel('')
      setNewDescription('')
      setCloneFrom('')
      await fetchVersions()
    }
  }

  // Activate version
  const handleActivate = async (versionId: string) => {
    const res = await apiFetch(`/api/scoring-rubric/${versionId}/activate`, { method: 'POST' })
    if (res.ok) await fetchVersions()
  }

  // Delete version
  const handleDelete = async (versionId: string) => {
    const res = await apiFetch(`/api/scoring-rubric/${versionId}`, { method: 'DELETE' })
    if (res.ok) {
      if (selectedVersion?.id === versionId) setSelectedVersion(null)
      await fetchVersions()
    }
  }

  // Save criteria
  const handleSaveCriteria = async () => {
    if (!selectedVersion) return
    setSaving(true)
    const res = await apiFetch(`/api/scoring-rubric/${selectedVersion.id}/criteria`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteria }),
    })
    if (res.ok) {
      setCriteria(await res.json())
    }
    setSaving(false)
  }

  // Recalculate all
  const handleRecalculateAll = async () => {
    setRecalculating(true)
    try {
      await apiFetch('/api/scoring-rubric/recalculate', { method: 'POST' })
    } catch {} finally { setRecalculating(false) }
  }

  // Update weight for a criterion
  const updateWeight = (criterionId: string, weight: number) => {
    setCriteria(prev => prev.map(c =>
      c.id === criterionId ? { ...c, dimension_weight: weight } : c
    ))
  }

  // Get criteria for stage + dimension
  const getCriterion = (stage: ScoringStage, dimension: ScoringDimension): ScoringCriterion | undefined => {
    return criteria.find(c => c.stage === stage && c.dimension === dimension)
  }

  // Get total weight for a stage
  const getStageWeightTotal = (stage: ScoringStage): number => {
    return criteria
      .filter(c => c.stage === stage)
      .reduce((sum, c) => sum + Number(c.dimension_weight), 0)
  }

  // Handle sub-criterion save
  const handleSubCriterionSave = (sc: SubCriterionConfig) => {
    if (!editingSubCriterion) return
    const { stageIdx, dimIdx, subIdx } = editingSubCriterion
    const stage = STAGES[stageIdx]
    const dimension = DIMENSIONS[dimIdx]
    setCriteria(prev => prev.map(c => {
      if (c.stage !== stage || c.dimension !== dimension) return c
      const subs = [...(c.sub_criteria || [])]
      if (subIdx === null) {
        subs.push(sc)
      } else {
        subs[subIdx] = sc
      }
      return { ...c, sub_criteria: subs }
    }))
    setEditingSubCriterion(null)
  }

  // Delete sub-criterion
  const deleteSubCriterion = (stage: ScoringStage, dimension: ScoringDimension, subIdx: number) => {
    setCriteria(prev => prev.map(c => {
      if (c.stage !== stage || c.dimension !== dimension) return c
      const subs = [...(c.sub_criteria || [])]
      subs.splice(subIdx, 1)
      return { ...c, sub_criteria: subs }
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Version List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scoring Rubric Versions</CardTitle>
              <CardDescription>Manage scoring rubrics. Only one version can be active at a time.</CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Version
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left py-2 font-medium">Version</th>
                <th className="text-left py-2 font-medium">Label</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Created</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-2 text-sm font-mono">v{v.version_number}</td>
                  <td className="py-2 text-sm">
                    <button
                      className="text-left hover:underline font-medium"
                      onClick={() => setSelectedVersion(v)}
                    >
                      {v.label}
                    </button>
                  </td>
                  <td className="py-2">
                    {v.is_active ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </td>
                  <td className="py-2 text-sm text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedVersion(v)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {!v.is_active && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleActivate(v.id)}
                          >
                            <Zap className="h-3 w-3 mr-1" /> Activate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(v.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {v.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={handleRecalculateAll}
                          disabled={recalculating}
                        >
                          {recalculating ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Recalculate All
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No rubric versions yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Version Detail */}
      {selectedVersion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  v{selectedVersion.version_number}: {selectedVersion.label}
                  {selectedVersion.is_active && (
                    <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                  )}
                </CardTitle>
                {selectedVersion.description && (
                  <CardDescription>{selectedVersion.description}</CardDescription>
                )}
              </div>
              <Button onClick={handleSaveCriteria} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {criteriaLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs value={activeStageTab} onValueChange={v => setActiveStageTab(v as ScoringStage)}>
                <TabsList className="mb-4">
                  {STAGES.map(s => (
                    <TabsTrigger key={s} value={s}>
                      {STAGE_LABELS[s]}
                      {(() => {
                        const total = getStageWeightTotal(s)
                        const isValid = Math.abs(total - 100) < 0.01
                        return (
                          <span className={`ml-1.5 text-[10px] ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                            ({total.toFixed(0)}%)
                          </span>
                        )
                      })()}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {STAGES.map((stage, stageIdx) => (
                  <TabsContent key={stage} value={stage} className="space-y-4">
                    {DIMENSIONS.map((dim, dimIdx) => {
                      const criterion = getCriterion(stage, dim)
                      if (!criterion) return null
                      return (
                        <Card key={dim}>
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{DIMENSION_LABELS[dim]}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">Weight:</Label>
                                <Input
                                  type="number"
                                  className="w-20 h-7 text-sm"
                                  value={criterion.dimension_weight}
                                  onChange={e => updateWeight(criterion.id, Number(e.target.value))}
                                  min={0}
                                  max={100}
                                  step={1}
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground border-b">
                                  <th className="text-left py-1 font-medium">Key</th>
                                  <th className="text-left py-1 font-medium">Label</th>
                                  <th className="text-left py-1 font-medium">Rule Type</th>
                                  <th className="text-left py-1 font-medium">Field Path</th>
                                  <th className="text-right py-1 font-medium">Max Pts</th>
                                  <th className="text-right py-1 font-medium w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(criterion.sub_criteria || []).map((sc, subIdx) => (
                                  <tr key={sc.key} className="border-b last:border-0">
                                    <td className="py-1.5 font-mono text-xs">{sc.key}</td>
                                    <td className="py-1.5 text-xs">{sc.label}</td>
                                    <td className="py-1.5">
                                      <Badge variant="outline" className="text-[10px]">{sc.rule_type}</Badge>
                                    </td>
                                    <td className="py-1.5 font-mono text-[10px] text-muted-foreground max-w-[200px] truncate">{sc.field_path}</td>
                                    <td className="py-1.5 text-right font-medium">{sc.max_points}</td>
                                    <td className="py-1.5 text-right">
                                      <div className="flex items-center gap-0.5 justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => {
                                            setEditingSubCriterion({ stageIdx, dimIdx, subIdx })
                                            setSubCriterionEditorOpen(true)
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-500"
                                          onClick={() => deleteSubCriterion(stage, dim, subIdx)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-xs"
                              onClick={() => {
                                setEditingSubCriterion({ stageIdx, dimIdx, subIdx: null })
                                setSubCriterionEditorOpen(true)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Sub-Criterion
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Version Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
            <DialogTitle>Create New Rubric Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Label</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Updated weights for 2026" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Brief description of changes" />
            </div>
            <div>
              <Label>Clone From (optional)</Label>
              <select
                className="w-full h-9 rounded-md border border-input px-3 text-sm"
                value={cloneFrom}
                onChange={e => setCloneFrom(e.target.value)}
              >
                <option value="">Start empty</option>
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number}: {v.label} {v.is_active ? '(active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newLabel.trim()}>
              <Copy className="h-4 w-4 mr-1.5" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Criterion Editor */}
      <SubCriterionEditor
        open={subCriterionEditorOpen}
        onOpenChange={setSubCriterionEditorOpen}
        criterion={
          editingSubCriterion && editingSubCriterion.subIdx !== null
            ? getCriterion(
                STAGES[editingSubCriterion.stageIdx],
                DIMENSIONS[editingSubCriterion.dimIdx]
              )?.sub_criteria?.[editingSubCriterion.subIdx] || null
            : null
        }
        onSave={handleSubCriterionSave}
      />
    </div>
  )
}
