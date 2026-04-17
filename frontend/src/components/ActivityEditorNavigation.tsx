"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Lock, Trash2 } from "lucide-react"
import { StableTabCompletionIndicator } from "@/utils/stable-tab-completion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavigationSection {
  id: string
  label: string
  optional?: boolean
}

interface NavigationGroup {
  title: string
  sections: NavigationSection[]
}

interface ActivityEditorNavigationProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
  showGovernmentInputs?: boolean
  activityCreated?: boolean
  tabCompletionStatus?: Record<string, { isComplete: boolean; isInProgress: boolean }>
  disabled?: boolean
  activityId?: string
  onDelete?: () => void
}

export default function ActivityEditorNavigation({
  activeSection,
  onSectionChange,
  showGovernmentInputs = false,
  activityCreated = false,
  tabCompletionStatus = {},
  disabled = false,
  activityId,
  onDelete
}: ActivityEditorNavigationProps) {

  // Section change handler - delegates all logic to parent's handleTabChange
  const handleSectionChange = (sectionId: string) => {
    if (disabled) {
      return;
    }
    onSectionChange(sectionId)
  }
  const navigationGroups: NavigationGroup[] = [
    {
      title: "TOOLS",
      sections: [
        { id: "iati", label: "IATI Link" },
        { id: "xml-import", label: "XML Import" },
        { id: "excel-import", label: "Excel Import" }
      ]
    },
    {
      title: "Activity Overview",
      sections: [
        { id: "general", label: "Overview" },
        { id: "sectors", label: "Sectors" },
        { id: "humanitarian", label: "Humanitarian Marker" },
      ]
    },
    {
      title: "Locations",
      sections: [
        { id: "country-region", label: "Countries & Regions" },
        { id: "locations", label: "Activity Sites" },
        { id: "subnational-allocation", label: "Sub-national Allocation" },
      ]
    },
    {
      title: "Stakeholders",
      sections: [
        { id: "organisations", label: "Organisations" },
        { id: "contacts", label: "Contacts" },
        { id: "focal_points", label: "Focal Points" },
      ]
    },
    {
      title: "Funding & Delivery",
      sections: [
        { id: "finances", label: "Transactions" },
        { id: "planned-disbursements", label: "Planned Disbursements" },
        { id: "budgets", label: "Budgets" },
      ]
    },
    {
      title: "Strategic Alignment",
      sections: [
        { id: "national_plans", label: "Plan Alignment" },
        { id: "sdg", label: "SDG Alignment" },
        { id: "tags", label: "Tags" },
        { id: "working_groups", label: "Working Groups" },
        { id: "policy_markers", label: "Policy Markers" }
      ]
    },
    {
      title: "Supporting Info",
      sections: [
        { id: "documents", label: "Documents & Images" },
        { id: "aid_effectiveness", label: "Aid Effectiveness" }
      ]
    },
    {
      title: "Advanced",
      sections: [
        { id: "linked_activities", label: "Linked Activities" },
        { id: "results", label: "Results" },
        { id: "forward-spending-survey", label: "Forward Spend" },
        { id: "capital-spend", label: "Capital Spend" },
        { id: "financing-terms", label: "Financing Terms" },
        { id: "conditions", label: "Conditions" },
        { id: "country-budget", label: "Budget Mapping" },
      ]
    },
    {
      title: "Administration",
      sections: [
        ...(showGovernmentInputs ? [{ id: "government", label: "Government Inputs" }] : []),
        { id: "readiness_checklist", label: "Readiness Checklist" },
        { id: "metadata", label: "Metadata" }
      ]
    }
  ]

  return (
    <TooltipProvider>
      <nav className="w-64 bg-white border-r border-gray-200 border-b-0 p-4 space-y-6 h-full flex flex-col">
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
            {/* Group Header */}
            <div 
              id={`group-${groupIndex}`}
              className="text-xs font-bold text-black uppercase mb-2 tracking-wide px-1 flex items-center gap-1"
              role="heading"
              aria-level={3}
            >
              {group.title}
            </div>
            
            {/* Group Sections with Vertical Connector */}
            <div className="relative">
              {/* Vertical Connector Line - gray for all groups */}
              <div
                className={cn(
                  "absolute left-[12px] top-0 bottom-0 w-px",
                  "bg-gray-200"
                )}
                style={{ height: '100%' }}
              />

              {/* Menu Items */}
              <div className={cn(
                "space-y-0.5 ml-3",
                // Add subtle visual indicator for linked scrollable groups
                (group.title === "Activity Overview" || group.title === "Locations" ||
                 group.title === "Stakeholders" ||
                 group.title === "Funding & Delivery" || group.title === "Strategic Alignment" ||
                 group.title === "Supporting Info" || group.title === "Advanced") && "border-l border-gray-100 pl-1"
              )}>
                {group.sections.map((section) => {
                  const isLocked = !activityCreated && section.id !== "general" && section.id !== "xml-import"
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
                        // Active state is carried by the background fill + text
                        // weight/color. Removed the 3px left-stripe accent that
                        // duplicated those signals and is a common AI-slop tell.
                        "w-full text-left py-2 px-3 ml-2 rounded text-sm font-normal transition-all duration-200 ease-in-out",
                        "focus:outline-none focus:ring-2 focus:ring-[#5f7f7a]/50 focus:ring-opacity-50 focus:ring-offset-1",
                        !isLocked && !disabled && "active:scale-[0.98] transform",
                        (isLocked || disabled)
                          ? "text-gray-400 cursor-not-allowed opacity-60"
                          : isActive
                            ? "bg-[#5f7f7a]/15 text-[#3C6255] font-medium shadow-sm"
                            : "text-gray-600 hover:bg-[#5f7f7a]/8 hover:text-black"
                      )}
                      aria-current={isActive ? "page" : undefined}
                      aria-describedby={undefined}
                      title={disabled ? "Please wait while saving..." : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isLocked && <Lock className="h-3 w-3 text-gray-400" />}
                          <span>{section.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StableTabCompletionIndicator 
                            tabId={section.id}
                            currentStatus={tabCompletionStatus[section.id] ? {
                              isComplete: isComplete,
                              isInProgress: isInProgress,
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
                        <p>This section will be unlocked once the activity is created. To proceed, add an Activity Title in the General tab.</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : buttonContent
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Delete Activity Button */}
        {activityCreated && activityId && onDelete && (
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className={cn(
                "w-full py-2.5 px-4 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Delete Activity
            </button>
          </div>
        )}

      </nav>
    </TooltipProvider>
  )
}