"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Lock, Copy } from "lucide-react"
import { StableTabCompletionIndicator } from "@/utils/stable-tab-completion"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavigationSection {
  id: string
  label: string
}

interface NavigationGroup {
  title: string
  sections: NavigationSection[]
}

interface WorkingGroupData {
  id?: string
  label?: string
  code?: string
}

interface WorkingGroupEditorNavigationProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
  workingGroupCreated?: boolean
  tabCompletionStatus?: Record<string, { isComplete: boolean; isInProgress: boolean }>
  disabled?: boolean
  workingGroup?: WorkingGroupData | null
  onDelete?: () => void
}

export default function WorkingGroupEditorNavigation({
  activeSection,
  onSectionChange,
  workingGroupCreated = false,
  tabCompletionStatus = {},
  disabled = false,
  workingGroup = null,
  onDelete
}: WorkingGroupEditorNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const copyToClipboard = async (text: string, _id?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy')
    }
  }

  const handleSectionChange = (sectionId: string) => {
    if (disabled) return
    onSectionChange(sectionId)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('section', sectionId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const navigationGroups: NavigationGroup[] = [
    {
      title: "Details",
      sections: [
        { id: "general", label: "General" },
      ]
    },
    {
      title: "People",
      sections: [
        { id: "members", label: "Leadership & Members" },
      ]
    },
    {
      title: "Coordination",
      sections: [
        { id: "meetings", label: "Meetings & Minutes" },
        { id: "documents", label: "Documents & Media" },
      ]
    },
    {
      title: "Structure",
      sections: [
        { id: "sub-groups", label: "Sub-Working Groups" },
      ]
    },
  ]

  return (
    <TooltipProvider>
      <nav className="w-64 bg-white border-b-0 p-4 space-y-6 h-full flex flex-col">
        {/* Working Group Header */}
        {workingGroup && workingGroup.label && (
          <div className="pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground group leading-tight">
              <button
                onClick={() => router.push(`/working-groups/${workingGroup.id}`)}
                className="text-left hover:text-muted-foreground transition-colors"
                title="View Working Group profile"
              >
                {workingGroup.label}
              </button>{' '}
              <button
                onClick={() => copyToClipboard(workingGroup.label || '', 'wgName')}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-foreground inline-flex items-center align-middle"
                title="Copy Working Group Name"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </h2>
            {workingGroup.code && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(workingGroup.code || '', 'wgCode')}
                  title="Click to copy"
                  className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors rounded font-mono cursor-pointer"
                >
                  {workingGroup.code}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Groups */}
        {navigationGroups.map((group, groupIndex) => (
          <div
            key={group.title}
            className={cn(
              "space-y-1",
              groupIndex > 0 && "mt-4"
            )}
            role="group"
            aria-labelledby={`group-${groupIndex}`}
          >
            <div
              id={`group-${groupIndex}`}
              className="text-section-label font-bold text-gunmetal uppercase mb-2 px-1 flex items-center gap-1"
              role="heading"
              aria-level={3}
            >
              {group.title}
            </div>

            {group.sections.length > 0 && (
              <div className="relative">
                <div
                  className="absolute left-[12px] top-0 bottom-0 w-px bg-muted"
                  style={{ height: '100%' }}
                />

                <div className="space-y-0.5 ml-3">
                  {group.sections.map((section) => {
                    const isLocked = !workingGroupCreated && section.id !== "general"
                    const isActive = activeSection === section.id
                    const isComplete = tabCompletionStatus[section.id]?.isComplete || false
                    const isInProgress = tabCompletionStatus[section.id]?.isInProgress || false

                    const buttonContent = (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => !isLocked && !disabled && handleSectionChange(section.id)}
                        disabled={isLocked || disabled}
                        data-tab={section.id}
                        className={cn(
                          // Active state carried by background fill + text
                          // weight/color. Removed the 3px left-stripe accent
                          // that duplicated those signals (AI-slop tell).
                          "w-full text-left py-2 px-3 rounded text-body font-normal transition-all duration-200 ease-in-out",
                          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:ring-offset-1",
                          !isLocked && !disabled && "active:scale-[0.98] transform",
                          (isLocked || disabled)
                            ? "text-muted-foreground cursor-not-allowed opacity-60"
                            : isActive
                              ? "bg-blue-100 text-blue-700 font-medium shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-gunmetal"
                        )}
                        aria-current={isActive ? "page" : undefined}
                        title={disabled ? "Please wait while saving..." : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            <span>{section.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StableTabCompletionIndicator
                              tabId={section.id}
                              currentStatus={tabCompletionStatus[section.id] ? {
                                isComplete,
                                isInProgress,
                                completedFields: [],
                                missingFields: []
                              } : null}
                              isLoading={isInProgress}
                            />
                          </div>
                        </div>
                      </button>
                    )

                    return isLocked ? (
                      <Tooltip key={section.id}>
                        <TooltipTrigger asChild>
                          {buttonContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>This section will be unlocked once you create the working group in the General tab.</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : buttonContent
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Delete Button */}
        {workingGroupCreated && workingGroup?.id && onDelete && (
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className={cn(
                "w-full py-2.5 px-4 rounded-md text-body font-medium bg-destructive/100 text-white hover:bg-destructive transition-colors flex items-center justify-center gap-2",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Delete Working Group
            </button>
          </div>
        )}
      </nav>
    </TooltipProvider>
  )
}
