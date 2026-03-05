"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { SubCriterionConfig, ScoringRuleType, SubCriterionThreshold } from "@/types/project-bank"

const RULE_TYPES: { value: ScoringRuleType; label: string }[] = [
  { value: 'boolean_field', label: 'Boolean Field' },
  { value: 'not_null', label: 'Not Null' },
  { value: 'array_length', label: 'Array Length' },
  { value: 'numeric_threshold', label: 'Numeric Threshold' },
  { value: 'enum_map', label: 'Enum Map' },
  { value: 'text_length', label: 'Text Length' },
  { value: 'document_exists', label: 'Document Exists' },
  { value: 'json_field_exists', label: 'JSON Field Exists' },
  { value: 'risk_register_quality', label: 'Risk Register Quality' },
  { value: 'count_filled_fields', label: 'Count Filled Fields' },
]

interface SubCriterionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  criterion: SubCriterionConfig | null
  onSave: (criterion: SubCriterionConfig) => void
}

export function SubCriterionEditor({ open, onOpenChange, criterion, onSave }: SubCriterionEditorProps) {
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [ruleType, setRuleType] = useState<ScoringRuleType>('not_null')
  const [fieldPath, setFieldPath] = useState('')
  const [maxPoints, setMaxPoints] = useState(10)
  const [thresholds, setThresholds] = useState<SubCriterionThreshold[]>([])
  const [enumEntries, setEnumEntries] = useState<{ key: string; value: number }[]>([])

  useEffect(() => {
    if (criterion) {
      setKey(criterion.key)
      setLabel(criterion.label)
      setRuleType(criterion.rule_type)
      setFieldPath(criterion.field_path)
      setMaxPoints(criterion.max_points)
      setThresholds(criterion.thresholds || [])
      setEnumEntries(
        criterion.enum_values
          ? Object.entries(criterion.enum_values).map(([k, v]) => ({ key: k, value: v }))
          : []
      )
    } else {
      setKey('')
      setLabel('')
      setRuleType('not_null')
      setFieldPath('')
      setMaxPoints(10)
      setThresholds([])
      setEnumEntries([])
    }
  }, [criterion, open])

  const needsThresholds = ['array_length', 'numeric_threshold', 'text_length', 'count_filled_fields'].includes(ruleType)
  const needsEnumMap = ruleType === 'enum_map'

  const handleSave = () => {
    const result: SubCriterionConfig = {
      key: key.trim(),
      label: label.trim(),
      rule_type: ruleType,
      field_path: fieldPath.trim(),
      max_points: maxPoints,
    }
    if (needsThresholds && thresholds.length > 0) {
      result.thresholds = thresholds
    }
    if (needsEnumMap && enumEntries.length > 0) {
      result.enum_values = {}
      enumEntries.forEach(e => {
        result.enum_values![e.key] = e.value
      })
    }
    onSave(result)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <DialogTitle>{criterion ? 'Edit Sub-Criterion' : 'Add Sub-Criterion'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Key</Label>
              <Input value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. ndp_goal_linked" />
            </div>
            <div>
              <Label className="text-xs">Max Points</Label>
              <Input type="number" value={maxPoints} onChange={e => setMaxPoints(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Human-readable label" />
          </div>

          <div>
            <Label className="text-xs">Rule Type</Label>
            <Select value={ruleType} onValueChange={v => setRuleType(v as ScoringRuleType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map(rt => (
                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Field Path</Label>
            <Input
              value={fieldPath}
              onChange={e => setFieldPath(e.target.value)}
              placeholder={ruleType === 'document_exists' ? 'document_type e.g. concept_note' : 'e.g. ndp_goal_id or fs2_study_data.field'}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {ruleType === 'count_filled_fields' ? 'Comma-separated field paths' : 'Dot-notation for nested fields'}
            </p>
          </div>

          {/* Thresholds */}
          {needsThresholds && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Thresholds</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setThresholds([...thresholds, { min: 0, points: 0 }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {thresholds.map((t, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <Input
                    type="number"
                    className="w-20 h-8"
                    placeholder="Min"
                    value={t.min}
                    onChange={e => {
                      const next = [...thresholds]
                      next[i] = { ...next[i], min: Number(e.target.value) }
                      setThresholds(next)
                    }}
                  />
                  <span className="text-xs text-muted-foreground">=</span>
                  <Input
                    type="number"
                    className="w-20 h-8"
                    placeholder="Points"
                    value={t.points}
                    onChange={e => {
                      const next = [...thresholds]
                      next[i] = { ...next[i], points: Number(e.target.value) }
                      setThresholds(next)
                    }}
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setThresholds(thresholds.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Enum Map */}
          {needsEnumMap && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Enum Values</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setEnumEntries([...enumEntries, { key: '', value: 0 }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {enumEntries.map((e, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <Input
                    className="flex-1 h-8"
                    placeholder="Key"
                    value={e.key}
                    onChange={ev => {
                      const next = [...enumEntries]
                      next[i] = { ...next[i], key: ev.target.value }
                      setEnumEntries(next)
                    }}
                  />
                  <span className="text-xs text-muted-foreground">=</span>
                  <Input
                    type="number"
                    className="w-20 h-8"
                    placeholder="Points"
                    value={e.value}
                    onChange={ev => {
                      const next = [...enumEntries]
                      next[i] = { ...next[i], value: Number(ev.target.value) }
                      setEnumEntries(next)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setEnumEntries(enumEntries.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!key.trim() || !label.trim() || !fieldPath.trim()}>
            {criterion ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
