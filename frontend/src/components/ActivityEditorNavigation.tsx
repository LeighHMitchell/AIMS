"use client"

import React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"
import { TabCompletionIndicator } from "@/utils/tab-completion"
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
}

export default function ActivityEditorNavigation({
  activeSection,
  onSectionChange,
  showGovernmentInputs = false,
  activityCreated = false,
  tabCompletionStatus = {},
  disabled = false
}: ActivityEditorNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Enhanced section change handler that updates URL
  const handleSectionChange = (sectionId: string) => {
    // Don't allow section change when disabled (saving in progress)
    if (disabled) {
      return;
    }
    
    // Call the original onSectionChange handler
    onSectionChange(sectionId)
    
    // Update URL with the new section parameter
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('section', sectionId)
    
    // Use replace to avoid adding to browser history for each tab switch
    router.replace(`?${params.toString()}`, { scroll: false })
  }
  const navigationGroups: NavigationGroup[] = [
    {
      title: "TOOLS",
      sections: [
        { id: "iati", label: "IATI Link" },
        { id: "xml-import", label: "XML Import" }
      ]
    },
    {
      title: "Activity Overview",
      sections: [
        { id: "general", label: "General" },
        { id: "sectors", label: "Sectors" },
        { id: "locations", label: "Locations" },
      ]
    },
    {
      title: "Stakeholders",
      sections: [
        { id: "organisations", label: "Organisations" },
        { id: "contacts", label: "Contacts" },
        { id: "linked_activities", label: "Linked Activities" }
      ]
    },
    {
      title: "Funding & Delivery",
      sections: [
        { id: "finances", label: "Transactions" },
        { id: "budgets", label: "Budgets" },
        { id: "planned-disbursements", label: "Planned Disbursements" },
        { id: "forward-spending-survey", label: "Forward Spending Survey" },
        { id: "results", label: "Results" },
        { id: "capital-spend", label: "Capital Spend" },
        { id: "financing-terms", label: "Financing Terms" },
        { id: "conditions", label: "Conditions" }
      ]
    },
    {
      title: "Strategic Alignment",
      sections: [
        { id: "sdg", label: "SDG Alignment" },
        { id: "country-budget", label: "Budget Mapping" },
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
      title: "Administration",
      sections: [
        { id: "metadata", label: "Metadata" },
        ...(showGovernmentInputs ? [{ id: "government", label: "Government Inputs" }] : []),
        ...(showGovernmentInputs ? [{ id: "government_endorsement", label: "Government Endorsement" }] : [])
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
                    onClick={() => !isLocked && !disabled && handleSectionChange(section.id)}
                    disabled={isLocked || disabled}
                    className={cn(
                      "w-full text-left py-2 px-3 rounded text-sm font-normal transition-all duration-200 ease-in-out",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:ring-offset-1",
                      "border-l-3 border-transparent",
                      !isLocked && !disabled && "active:scale-[0.98] transform",
                      (isLocked || disabled)
                        ? "text-gray-400 cursor-not-allowed opacity-60" 
                        : isActive
                          ? "bg-blue-100 text-blue-700 font-medium border-l-3 border-blue-600 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-black hover:border-l-3 hover:border-gray-300"
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
                        {(section.id === 'contributors' || section.id === 'organisations' || section.id === 'contacts' || section.id === 'finances' || section.id === 'capital-spend' || section.id === 'country-budget') ? (
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
                        ) : (
                          <TabCompletionIndicator isComplete={isComplete} isInProgress={isInProgress} />
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

      </nav>
    </TooltipProvider>
  )
}