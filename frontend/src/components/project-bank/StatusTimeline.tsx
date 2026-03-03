"use client"

import { CheckCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { PHASE_LABELS, getPhase } from "@/lib/project-bank-utils"
import type { ProjectBankProject, ProjectPhase, ProjectStage, CategoryDecision } from "@/types/project-bank"
import {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
} from "@/components/ui/stepper"

interface StatusTimelineProps {
  currentStatus: string
  project: ProjectBankProject
}

const PHASE_ORDER: ProjectPhase[] = ['intake', 'fs1', 'fs2', 'fs3']

const FS3_LABELS: Record<CategoryDecision, string> = {
  category_a: 'Private Sector Pathway',
  category_b: 'Government Budget Pathway',
  category_c: 'PPP Transaction Structuring',
}

function getPhaseLabel(phase: ProjectPhase, idx: number, categoryDecision?: CategoryDecision | null): string {
  const num = idx + 1
  if (phase === 'fs3') {
    const label = categoryDecision ? FS3_LABELS[categoryDecision] : 'Next Phase'
    return `Phase ${num}: ${label}`
  }
  return `Phase ${num}: ${PHASE_LABELS[phase]}`
}

function formatFullDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function StatusTimeline({ currentStatus, project }: StatusTimelineProps) {
  const currentPhase = project.project_stage ? getPhase(project.project_stage) : 'intake'
  const currentPhaseIdx = PHASE_ORDER.indexOf(currentPhase)

  const timestampMap: Record<ProjectPhase, string | null | undefined> = {
    intake: project.nominated_at,
    fs1: project.screened_at,
    fs2: project.appraised_at,
    fs3: project.approved_at,
  }

  // activeStep is 1-indexed: phases before current are complete, current is active
  const activeStep = currentPhaseIdx + 1

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-5">
      <Stepper activeStep={activeStep}>
        {PHASE_ORDER.map((phase, idx) => {
          const isLast = idx === PHASE_ORDER.length - 1
          const ts = timestampMap[phase]
          const formattedDate = formatFullDate(ts as string | null)

          return (
            <StepperItem key={phase} step={idx + 1}>
              <StepperIndicator>
                {idx < currentPhaseIdx ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </StepperIndicator>

              {!isLast && <StepperSeparator />}

              <div className="flex flex-col items-center">
                <StepperTitle>{getPhaseLabel(phase, idx, project.category_decision)}</StepperTitle>
                {formattedDate && (
                  <StepperDescription>
                    {formattedDate}
                  </StepperDescription>
                )}
              </div>
            </StepperItem>
          )
        })}
      </Stepper>
    </div>
  )
}
