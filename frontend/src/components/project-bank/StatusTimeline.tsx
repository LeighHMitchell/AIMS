"use client"

import { FileText, Search, ClipboardCheck, ThumbsUp, Hammer, Flag, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_ORDER, STATUS_LABELS } from "@/lib/project-bank-utils"
import type { ProjectBankProject, ProjectStatus } from "@/types/project-bank"
import {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
} from "@/components/ui/stepper"

interface StatusTimelineProps {
  currentStatus: ProjectStatus
  project: ProjectBankProject
}

const STEP_META: Record<ProjectStatus, {
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = {
  nominated: { icon: FileText, description: "Submitted to pipeline" },
  screening: { icon: Search, description: "MSDP alignment" },
  appraisal: { icon: ClipboardCheck, description: "Economic analysis" },
  approved: { icon: ThumbsUp, description: "Cleared" },
  implementation: { icon: Hammer, description: "Active delivery" },
  completed: { icon: Flag, description: "Finalised" },
  rejected: { icon: XCircle, description: "Rejected" },
}

export function StatusTimeline({ currentStatus, project }: StatusTimelineProps) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  const isRejected = currentStatus === "rejected"

  const timestampMap: Partial<Record<ProjectStatus, string | null>> = {
    nominated: project.nominated_at,
    screening: project.screened_at,
    appraisal: project.appraised_at,
    approved: project.approved_at,
  }

  const steps = isRejected ? [...STATUS_ORDER, "rejected" as ProjectStatus] : STATUS_ORDER

  // activeStep is 1-indexed: currentIdx + 1 means "on that step", +1 more for completed
  // For rejected, highlight up to where it was before rejection
  const activeStep = isRejected ? currentIdx + 1 : currentIdx + 1

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-5">
      <Stepper activeStep={activeStep}>
        {steps.map((status, idx) => {
          const isLast = idx === steps.length - 1
          const isRejectedStep = status === "rejected"
          const meta = STEP_META[status]
          const Icon = meta.icon
          const ts = timestampMap[status]
          const rejectedAt = isRejectedStep ? project.rejected_at : null

          return (
            <StepperItem key={status} step={idx + 1}>
              <StepperIndicator
                className={cn(
                  isRejectedStep && "border-red-500 bg-red-500 text-white"
                )}
              >
                <Icon className="h-4 w-4" />
              </StepperIndicator>

              {!isLast && (
                <StepperSeparator
                  className={cn(
                    isRejectedStep && "bg-red-500"
                  )}
                />
              )}

              <div className="flex flex-col items-center">
                <StepperTitle
                  className={cn(
                    isRejectedStep && "text-red-600 dark:text-red-400 font-semibold"
                  )}
                >
                  {STATUS_LABELS[status]}
                </StepperTitle>
                <StepperDescription>
                  {meta.description}
                </StepperDescription>
                {ts && (
                  <span className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                    {new Date(ts).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
                {rejectedAt && (
                  <span className="text-[10px] text-red-500/60 mt-0.5 font-mono">
                    {new Date(rejectedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
            </StepperItem>
          )
        })}
      </Stepper>
    </div>
  )
}
