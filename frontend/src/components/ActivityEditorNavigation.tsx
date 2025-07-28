"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"
import { TabCompletionIndicator } from "@/utils/tab-completion"
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
}

export default function ActivityEditorNavigation({
  activeSection,
  onSectionChange,
  showGovernmentInputs = false,
  activityCreated = false,
  tabCompletionStatus = {}
}: ActivityEditorNavigationProps) {
  const navigationGroups: NavigationGroup[] = [
    {
      title: "Activity Overview",
      sections: [
        { id: "general", label: "General" },
        { id: "iati", label: "IATI Sync" },
        { id: "sectors", label: "Sectors" },
        { id: "locations", label: "Locations" },
      ]
    },
    {
      title: "Stakeholders",
      sections: [
        { id: "organisations", label: "Organisations" },
        { id: "contributors", label: "Contributors" },
        { id: "contacts", label: "Contacts" },
        { id: "linked_activities", label: "Linked Activities" }
      ]
    },
    {
      title: "Funding & Delivery",
      sections: [
        { id: "finances", label: "Finances" },
        { id: "budgets", label: "Budgets" },
        { id: "planned-disbursements", label: "Planned Disbursements" },
        { id: "results", label: "Results" }
      ]
    },
    {
      title: "Strategic Alignment",
      sections: [
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
        ...(showGovernmentInputs ? [{ id: "government", label: "Government Inputs" }] : []),
        { id: "aid_effectiveness", label: "Aid Effectiveness", optional: true }
      ]
    }
  ]

  return (
    <TooltipProvider>
      <nav className="w-64 bg-white border-r border-gray-200 p-4 space-y-6 h-full flex flex-col">
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
            
            {/* Group Sections */}
            <div className="space-y-0.5 ml-3">
              {group.sections.map((section) => {
                const isLocked = !activityCreated && section.id !== "general"
                const isActive = activeSection === section.id
                const isComplete = tabCompletionStatus[section.id]?.isComplete || false
                const isInProgress = tabCompletionStatus[section.id]?.isInProgress || false
                
                const buttonContent = (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => !isLocked && onSectionChange(section.id)}
                    disabled={isLocked}
                    className={cn(
                      "w-full text-left py-2 px-3 rounded text-sm font-normal transition-all duration-200 ease-in-out",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:ring-offset-1",
                      "border-l-3 border-transparent",
                      !isLocked && "active:scale-[0.98] transform",
                      isLocked 
                        ? "text-gray-400 cursor-not-allowed opacity-60" 
                        : isActive
                          ? "bg-blue-100 text-blue-700 font-medium border-l-3 border-blue-600 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-black hover:border-l-3 hover:border-gray-300",
                      section.optional && "italic text-gray-500"
                    )}
                    aria-current={isActive ? "page" : undefined}
                    aria-describedby={section.optional ? `${section.id}-optional` : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isLocked && <Lock className="h-3 w-3 text-gray-400" />}
                        <span>{section.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TabCompletionIndicator isComplete={isComplete} isInProgress={isInProgress} />
                        {section.optional && (
                          <span 
                            id={`${section.id}-optional`}
                            className="text-xs text-gray-400 font-normal not-italic"
                            aria-label="Optional section"
                          >
                            (Optional)
                          </span>
                        )}
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
        ))}
        
        {/* Progress indicator */}
        <div className="mt-auto pt-4">
          <div className="text-xs text-gray-500 px-1">
            <div className="mb-1 font-medium">Progress</div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out" 
                style={{ 
                  width: `${((navigationGroups.flatMap(g => g.sections).findIndex(s => s.id === activeSection) + 1) / navigationGroups.flatMap(g => g.sections).length) * 100}%` 
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  )
}