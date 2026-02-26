"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ParcelWizardStep } from "@/hooks/use-parcel-wizard"

const STEP_LABELS: Record<ParcelWizardStep, string> = {
  basic_info: "Basic Information",
  geometry: "Geometry",
  review: "Review & Register",
}

const STEPS: ParcelWizardStep[] = ["basic_info", "geometry", "review"]

interface ParcelProgressRailProps {
  currentStep: ParcelWizardStep
  onStepClick: (step: ParcelWizardStep) => void
  canGoToStep: (step: ParcelWizardStep) => boolean
  isStepComplete: (step: ParcelWizardStep) => boolean
}

export function ParcelProgressRail({
  currentStep,
  onStepClick,
  canGoToStep,
  isStepComplete,
}: ParcelProgressRailProps) {
  return (
    <>
      {/* Desktop: vertical rail */}
      <nav className="hidden lg:block w-[240px] shrink-0">
        <div className="sticky top-24 space-y-0">
          {STEPS.map((step, idx) => {
            const completed = isStepComplete(step)
            const isCurrent = step === currentStep
            const clickable = canGoToStep(step)

            return (
              <div key={step}>
                <div className="flex items-start gap-3">
                  {/* Vertical line + circle */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => clickable && onStepClick(step)}
                      disabled={!clickable}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all shrink-0",
                        completed && "bg-gray-800 border-gray-800 text-white",
                        isCurrent && !completed && "border-gray-600 bg-gray-100 text-gray-800",
                        !completed && !isCurrent && "border-gray-300 bg-background text-gray-400",
                        clickable && "cursor-pointer hover:scale-110",
                        !clickable && "cursor-default",
                      )}
                    >
                      {completed ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            isCurrent ? "bg-gray-600" : "bg-gray-300",
                          )}
                        />
                      )}
                    </button>
                    {/* Connector line */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "w-0.5 h-8 transition-colors",
                          completed ? "bg-gray-600" : "bg-gray-300",
                        )}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <button
                    onClick={() => clickable && onStepClick(step)}
                    disabled={!clickable}
                    className={cn(
                      "text-sm pt-1 text-left transition-colors",
                      isCurrent && "font-semibold text-foreground",
                      completed && !isCurrent && "text-gray-600",
                      !completed && !isCurrent && "text-gray-400",
                      clickable && "cursor-pointer hover:text-foreground",
                      !clickable && "cursor-default",
                    )}
                  >
                    {STEP_LABELS[step]}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Mobile: horizontal bar */}
      <div className="lg:hidden flex gap-1 mb-4 overflow-x-auto pb-1">
        {STEPS.map((step) => {
          const completed = isStepComplete(step)
          const isCurrent = step === currentStep
          const clickable = canGoToStep(step)

          return (
            <button
              key={step}
              onClick={() => clickable && onStepClick(step)}
              disabled={!clickable}
              className="flex-1 min-w-0 text-center"
            >
              <div
                className={cn(
                  "h-1.5 rounded-full mb-1 transition-colors",
                  completed && "bg-gray-700",
                  isCurrent && !completed && "bg-gray-500",
                  !completed && !isCurrent && "bg-gray-200",
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight block truncate",
                  isCurrent && "font-semibold text-foreground",
                  completed && !isCurrent && "text-gray-600",
                  !completed && !isCurrent && "text-gray-400",
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
