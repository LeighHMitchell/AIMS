"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Lock, Copy, Check, Trash2 } from "lucide-react"
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
  optional?: boolean
}

interface NavigationGroup {
  title: string
  sections: NavigationSection[]
}

interface OrganizationData {
  id?: string
  name?: string
  acronym?: string
  iati_org_id?: string
}

interface OrganizationEditorNavigationProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
  organizationCreated?: boolean
  tabCompletionStatus?: Record<string, { isComplete: boolean; isInProgress: boolean }>
  disabled?: boolean
  organization?: OrganizationData | null
  onDelete?: () => void
}

export default function OrganizationEditorNavigation({
  activeSection,
  onSectionChange,
  organizationCreated = false,
  tabCompletionStatus = {},
  disabled = false,
  organization = null,
  onDelete
}: OrganizationEditorNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy')
    }
  }

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
      title: "Basic Information",
      sections: [
        { id: "general", label: "General" },
        { id: "branding", label: "Branding" }
      ]
    },
    {
      title: "Contact",
      sections: [
        { id: "contact", label: "Social & Web" },
        { id: "contacts", label: "People" },
        { id: "aliases", label: "Aliases" },
        { id: "merge", label: "Merge" }
      ]
    },
    {
      title: "Funding",
      sections: [
        { id: "funding-envelope", label: "Funding Envelope" }
      ]
    },
    {
      title: "IATI Data",
      sections: [
        { id: "iati-import", label: "IATI Org Import" },
        { id: "budgets", label: "IATI Budgets" },
        { id: "documents", label: "IATI Documents" },
        { id: "iati-prefs", label: "IATI Import" }
      ]
    }
  ]

  return (
    <TooltipProvider>
      <nav className="w-64 bg-white border-r border-gray-200 border-b-0 p-4 space-y-6 h-full flex flex-col">
        {/* Organization Header */}
        {organization && organization.name && (
          <div className="pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-slate-900 group leading-tight">
              {organization.name}
              {organization.acronym && <span className="text-slate-600"> ({organization.acronym})</span>}{' '}
              <button
                onClick={() => copyToClipboard(organization.name || '', 'orgName')}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-slate-700 inline-flex items-center align-middle"
                title="Copy Organization Name"
              >
                {copiedId === 'orgName' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {organization.iati_org_id && (
                <div className="flex items-center gap-1 group">
                  <code className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                    {organization.iati_org_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(organization.iati_org_id || '', 'iatiOrgId')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-slate-700 flex-shrink-0"
                    title="Copy IATI Org ID"
                  >
                    {copiedId === 'iatiOrgId' ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
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
            {group.sections.length > 0 && (
              <div className="relative">
                {/* Vertical Connector Line */}
                <div
                  className="absolute left-[12px] top-0 bottom-0 w-px bg-gray-200"
                  style={{ height: '100%' }}
                />
                
                {/* Menu Items */}
                <div className="space-y-0.5 ml-3">
                  {group.sections.map((section) => {
                    const isLocked = !organizationCreated && section.id !== "general"
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
                          <p>This section will be unlocked once you enter an organization name in the General tab.</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : buttonContent
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Delete Organization Button */}
        {organizationCreated && organization?.id && onDelete && (
          <div className="mt-auto pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              className={cn(
                "w-full py-2.5 px-4 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Delete Organization
            </button>
          </div>
        )}

      </nav>
    </TooltipProvider>
  )
}


