"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2, AlertCircle, Building, Wallet, Handshake, ArrowRight,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  determineCategoryRecommendation,
  CATEGORY_LABELS, CATEGORY_SHORT_LABELS,
} from "@/lib/project-bank-utils"
import type { CategoryDecision, ProjectBankProject } from "@/types/project-bank"

interface CategoryDecisionPanelProps {
  project: ProjectBankProject
  onCategorized?: () => void
}

const CATEGORY_CARDS: { value: CategoryDecision; label: string; description: string; icon: typeof Building; color: string }[] = [
  {
    value: "category_a",
    label: "Category A — Full Private",
    description: "Commercially viable. Project proceeds to competitive tendering for private sector delivery.",
    icon: Building,
    color: "text-green-600",
  },
  {
    value: "category_b",
    label: "Category B — Government Budget",
    description: "Not commercially viable but NDP-aligned. Funded through domestic budget allocation.",
    icon: Wallet,
    color: "text-blue-600",
  },
  {
    value: "category_c",
    label: "Category C — PPP",
    description: "Economically viable but not commercially. Proceeds to FS-3 for PPP structuring (VGF, MRG, etc.).",
    icon: Handshake,
    color: "text-purple-600",
  },
]

export function CategoryDecisionPanel({ project, onCategorized }: CategoryDecisionPanelProps) {
  const [selected, setSelected] = useState<CategoryDecision | null>(project.category_decision || null)
  const [rationale, setRationale] = useState(project.category_rationale || "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(!!project.category_decision)

  const recommendation = determineCategoryRecommendation(
    project.firr ?? null,
    project.eirr ?? null,
    project.ndp_aligned,
    project.sector,
  )

  const isOverride = selected !== null && selected !== recommendation
  const canSubmit = selected && (!isOverride || rationale.trim().length > 0)

  const handleSubmit = async () => {
    if (!selected || !canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/project-bank/${project.id}/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: selected,
          rationale: rationale || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to categorize project")
        return
      }

      setDone(true)
      onCategorized?.()
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  // Already categorized — show summary
  if (done && project.category_decision) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Categorization Complete</h3>
        </div>
        <div className="border border-border rounded-lg p-4 space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Decision:</span>{" "}
            <span className="font-semibold">{CATEGORY_LABELS[project.category_decision]}</span>
          </p>
          {project.category_recommendation && (
            <p className="text-sm">
              <span className="text-muted-foreground">System Recommendation:</span>{" "}
              <span className="font-medium">{CATEGORY_SHORT_LABELS[project.category_recommendation]}</span>
              {project.category_recommendation !== project.category_decision && (
                <span className="ml-2 text-xs text-amber-600 font-medium">(Overridden)</span>
              )}
            </p>
          )}
          {project.category_rationale && (
            <p className="text-sm">
              <span className="text-muted-foreground">Rationale:</span>{" "}
              {project.category_rationale}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Project Categorization</h3>

      {/* System recommendation */}
      {recommendation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">System Recommendation: {CATEGORY_LABELS[recommendation]}</span>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Based on FIRR {project.firr ?? "—"}%, EIRR {project.eirr ?? "—"}%,
            NDP-aligned: {project.ndp_aligned ? "Yes" : "No"}, Sector: {project.sector}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Category cards */}
      <div className="space-y-2">
        {CATEGORY_CARDS.map(card => {
          const Icon = card.icon
          const isRec = card.value === recommendation
          return (
            <label
              key={card.value}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selected === card.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="category"
                value={card.value}
                checked={selected === card.value}
                onChange={() => setSelected(card.value)}
                className="sr-only"
              />
              <Icon className={`h-5 w-5 mt-0.5 ${card.color}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  {card.label}
                  {isRec && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      Recommended
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
              </div>
            </label>
          )
        })}
      </div>

      {/* Rationale field — required when overriding */}
      {isOverride && (
        <div className="space-y-2">
          <Label className="text-sm">
            Rationale for Override <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            You are selecting a different category than the system recommendation. Please explain why.
          </p>
          <Textarea
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            rows={3}
            placeholder="Explain why you are overriding the system recommendation..."
          />
        </div>
      )}

      {/* Optional rationale when not overriding */}
      {selected && !isOverride && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Rationale (optional)</Label>
          <Textarea
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            rows={2}
            placeholder="Additional notes..."
          />
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="gap-2"
      >
        <ArrowRight className="h-4 w-4" />
        {submitting ? "Saving..." : "Confirm Categorization"}
      </Button>
    </div>
  )
}
