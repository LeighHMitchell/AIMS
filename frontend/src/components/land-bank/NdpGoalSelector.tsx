"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { NationalPlan, NationalPriority } from "@/types/national-priorities"

interface NdpGoalSelectorProps {
  primaryGoalId: string
  secondaryGoalIds: string[]
  onPrimaryChange: (goalId: string) => void
  onSecondaryChange: (goalIds: string[]) => void
}

export function NdpGoalSelector({
  primaryGoalId,
  secondaryGoalIds,
  onPrimaryChange,
  onSecondaryChange,
}: NdpGoalSelectorProps) {
  // Pillars from the primary plan (shown in dropdowns)
  const [primaryPlanPillars, setPrimaryPlanPillars] = useState<NationalPriority[]>([])
  // Legacy pillars from a previous plan (shown read-only if currently selected)
  const [legacyPillars, setLegacyPillars] = useState<NationalPriority[]>([])

  // Combined: primary plan pillars + any legacy ones still referenced
  const pillars = [...primaryPlanPillars, ...legacyPillars]

  useEffect(() => {
    async function fetchNationalPlanPillars() {
      try {
        // Fetch active plans
        const plansRes = await apiFetch("/api/national-plans?activeOnly=true")
        const plansResult = await plansRes.json()
        if (!plansResult.success) return

        const primaryPlan = (plansResult.data as NationalPlan[]).find(p => p.isPrimary)

        if (!primaryPlan) return

        // Fetch pillars from the primary plan
        const priRes = await apiFetch(
          `/api/national-priorities?planId=${primaryPlan.id}&asTree=false`
        )
        const priResult = await priRes.json()
        if (priResult.success) {
          const level1 = (priResult.data as NationalPriority[]).filter(
            p => p.level === 1 && p.isActive
          )
          setPrimaryPlanPillars(level1)

          // Check if current selections reference pillars NOT in the primary plan
          const primaryPlanIds = new Set(level1.map(p => p.id))
          const currentIds = [primaryGoalId, ...secondaryGoalIds].filter(Boolean)
          const missingIds = currentIds.filter(id => !primaryPlanIds.has(id))

          if (missingIds.length > 0) {
            // Fetch all priorities to find the legacy ones
            const allRes = await apiFetch("/api/national-priorities?asTree=false")
            const allResult = await allRes.json()
            if (allResult.success) {
              const legacy = (allResult.data as NationalPriority[]).filter(
                p => missingIds.includes(p.id)
              )
              setLegacyPillars(legacy)
            }
          }
        }
      } catch {
        // silent
      }
    }
    fetchNationalPlanPillars()
  }, [primaryGoalId, secondaryGoalIds])

  const legacyIds = new Set(legacyPillars.map(p => p.id))

  const availableSecondary = pillars.filter(
    g => g.id !== primaryGoalId && !secondaryGoalIds.includes(g.id)
  )

  const addSecondary = (goalId: string) => {
    if (goalId && !secondaryGoalIds.includes(goalId)) {
      onSecondaryChange([...secondaryGoalIds, goalId])
    }
  }

  const removeSecondary = (goalId: string) => {
    onSecondaryChange(secondaryGoalIds.filter(id => id !== goalId))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Primary NDP Goal</Label>
        <Select value={primaryGoalId} onValueChange={onPrimaryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select primary goal..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {pillars.map(g => (
              <SelectItem key={g.id} value={g.id}>
                {g.code} — {g.name}{legacyIds.has(g.id) ? " (previous plan)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Secondary Goals</Label>
        {secondaryGoalIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {secondaryGoalIds.map(id => {
              const goal = pillars.find(g => g.id === id)
              return (
                <Badge key={id} variant="outline" className="gap-1 pr-1">
                  {goal ? `${goal.code} — ${goal.name}${legacyIds.has(id) ? " (previous plan)" : ""}` : id}
                  <button
                    type="button"
                    onClick={() => removeSecondary(id)}
                    className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
        {availableSecondary.length > 0 && (
          <Select value="" onValueChange={addSecondary}>
            <SelectTrigger>
              <SelectValue placeholder="Add secondary goal..." />
            </SelectTrigger>
            <SelectContent>
              {availableSecondary.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.code} — {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
