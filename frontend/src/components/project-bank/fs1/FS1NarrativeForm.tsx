"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, FileText, Send } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { FS1Narrative } from "@/types/project-bank"

const MIN_CHARS = 200

const SECTIONS = [
  {
    key: "problem_statement" as const,
    label: "Problem Statement",
    prompt: "What problem does this project address? Describe the current situation and why intervention is needed.",
  },
  {
    key: "target_beneficiaries" as const,
    label: "Target Beneficiaries",
    prompt: "Who benefits from this project and how many people are expected to be impacted?",
  },
  {
    key: "ndp_alignment_justification" as const,
    label: "NDP/MSDP Alignment",
    prompt: "Which specific National Development Plan goals and MSDP strategy areas does this project support?",
  },
  {
    key: "expected_outcomes" as const,
    label: "Expected Outcomes & Impact",
    prompt: "What are the measurable outcomes expected from this project?",
  },
  {
    key: "preliminary_cost_justification" as const,
    label: "Preliminary Cost Justification",
    prompt: "Why does the project cost what it costs? Provide a breakdown or comparison with similar projects.",
  },
]

interface FS1NarrativeFormProps {
  projectId: string
  existingNarrative?: FS1Narrative | null
  isResubmission?: boolean
  onSubmitted?: () => void
}

export function FS1NarrativeForm({ projectId, existingNarrative, isResubmission, onSubmitted }: FS1NarrativeFormProps) {
  const [values, setValues] = useState<Record<string, string>>({
    problem_statement: existingNarrative?.problem_statement || "",
    target_beneficiaries: existingNarrative?.target_beneficiaries || "",
    ndp_alignment_justification: existingNarrative?.ndp_alignment_justification || "",
    expected_outcomes: existingNarrative?.expected_outcomes || "",
    preliminary_cost_justification: existingNarrative?.preliminary_cost_justification || "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const allValid = SECTIONS.every(s => (values[s.key]?.trim().length || 0) >= MIN_CHARS)

  const handleSubmit = async () => {
    if (!allValid) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/project-bank/${projectId}/fs1-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to submit narrative")
        return
      }

      setSubmitted(true)
      onSubmitted?.()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-800">FS-1 Narrative Submitted</h3>
        <p className="text-sm text-green-700 mt-1">
          Your narrative has been submitted for desk review. You will be notified of the outcome.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">
            {isResubmission ? "Resubmit FS-1 Narrative" : "FS-1 Preliminary Screening Narrative"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Complete all five sections below. Each section requires at least {MIN_CHARS} characters.
          </p>
        </div>
      </div>

      {isResubmission && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Your previous submission was returned for revision. Please address the reviewer&apos;s feedback and resubmit.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {SECTIONS.map(section => {
        const charCount = values[section.key]?.trim().length || 0
        const isValid = charCount >= MIN_CHARS
        return (
          <div key={section.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{section.label}</Label>
              <span className={`text-xs ${isValid ? "text-green-600" : "text-muted-foreground"}`}>
                {charCount} / {MIN_CHARS} min
                {isValid && <CheckCircle2 className="inline h-3 w-3 ml-1" />}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{section.prompt}</p>
            <Textarea
              value={values[section.key]}
              onChange={e => setValues(prev => ({ ...prev, [section.key]: e.target.value }))}
              rows={5}
              placeholder={`Enter ${section.label.toLowerCase()}...`}
              className={!isValid && charCount > 0 ? "border-amber-300" : ""}
            />
          </div>
        )
      })}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={!allValid || submitting} className="gap-2">
          <Send className="h-4 w-4" />
          {submitting ? "Submitting..." : isResubmission ? "Resubmit Narrative" : "Submit for Review"}
        </Button>
      </div>
    </div>
  )
}
