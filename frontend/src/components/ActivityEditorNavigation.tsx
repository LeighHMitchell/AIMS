"use client"

import React from "react"
import { cn } from "@/lib/utils"

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
}

export default function ActivityEditorNavigation({
  activeSection,
  onSectionChange,
  showGovernmentInputs = false
}: ActivityEditorNavigationProps) {
  
  // Define grouped navigation structure
  const navigationGroups: NavigationGroup[] = [
    {
      title: "Activity Overview",
      sections: [
        { id: "general", label: "General" },
        { id: "iati", label: "IATI Sync" },
        { id: "sectors", label: "Sector Allocation" },
        { id: "locations", label: "Locations" }
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
        { id: "planned_disbursements", label: "Planned Disbursements" },
        { id: "results", label: "Results" }
      ]
    },
    {
      title: "Strategic Alignment",
      sections: [
        { id: "msdp", label: "MSDP Alignment" },
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
    <nav 
      aria-label="Activity Editor Navigation" 
      className="flex flex-col p-4 h-full overflow-y-auto"
      role="navigation"
    >
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
            {group.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full text-left py-2 px-3 rounded text-sm font-normal transition-all duration-200 ease-in-out",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:ring-offset-1",
                  "active:scale-[0.98] transform",
                  activeSection === section.id
                    ? "bg-blue-100 text-blue-700 font-medium border-l-3 border-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-black hover:border-l-3 hover:border-gray-300",
                  section.optional && "italic text-gray-500",
                  "border-l-3 border-transparent"
                )}
                aria-current={activeSection === section.id ? "page" : undefined}
                aria-describedby={section.optional ? `${section.id}-optional` : undefined}
              >
                <div className="flex items-center justify-between">
                  <span>{section.label}</span>
                  {section.optional && (
                    <span 
                      id={`${section.id}-optional`}
                      className="ml-2 text-xs text-gray-400 font-normal not-italic"
                      aria-label="Optional section"
                    >
                      (Optional)
                    </span>
                  )}
                </div>
              </button>
            ))}
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
  )
}