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

interface NdpGoal {
  id: string
  code: string
  name: string
}

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
  const [goals, setGoals] = useState<NdpGoal[]>([])

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await apiFetch("/api/national-development-goals")
        if (res.ok) {
          setGoals(await res.json())
        }
      } catch {
        // silent
      }
    }
    fetchGoals()
  }, [])

  const availableSecondary = goals.filter(
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
        <Label>Primary NDP/MSDP Goal</Label>
        <Select value={primaryGoalId} onValueChange={onPrimaryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select primary goal..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {goals.map(g => (
              <SelectItem key={g.id} value={g.id}>
                {g.code} — {g.name}
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
              const goal = goals.find(g => g.id === id)
              return (
                <Badge key={id} variant="outline" className="gap-1 pr-1">
                  {goal ? `${goal.code} — ${goal.name}` : id}
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
