"use client"

import React, { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
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

    // Update URL for bookmarkability without triggering Next.js router navigation
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('section', sectionId)
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  const navigationGroups: NavigationGroup[] = [
    {
      title: "Basic Information",
      sections: [
        { id: "general", label: "General" }
      ]
    },
    {
      title: "Contact",
      sections: [
        { id: "contact", label: "Contact Information" },
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
      <nav className="w-64 bg-white border-r border-border border-b-0 p-4 space-y-6 h-full flex flex-col">
        {/* Organization Header */}
        {organization && organization.name && (
          <div className="pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground group leading-tight">
              {organization.id ? (
                <Link
                  href={`/organizations/${organization.id}`}
                  className="hover:text-blue-700 hover:underline transition-colors"
                >
                  {organization.name}
                  {organization.acronym && <span className="text-muted-foreground"> ({organization.acronym})</span>}
                </Link>
              ) : (
                <>
                  {organization.name}
                  {organization.acronym && <span className="text-muted-foreground"> ({organization.acronym})</span>}
                </>
              )}{' '}
              <button
                onClick={() => copyToClipboard(organization.name || '', 'orgName')}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-foreground inline-flex items-center align-middle"
                title="Copy Organization Name"
              >
                {copiedId === 'orgName' ? (
                  <Check className="w-4 h-4 text-[hsl(var(--success-icon))]" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {organization.iati_org_id && (
                <div className="flex items-center gap-1 group">
                  <code className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-mono">
                    {organization.iati_org_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(organization.iati_org_id || '', 'iatiOrgId')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-foreground flex-shrink-0"
                    title="Copy IATI Org ID"
                  >
                    {copiedId === 'iatiOrgId' ? (
                      <Check className="w-3 h-3 text-[hsl(var(--success-icon))]" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
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
              className="text-section-label font-bold text-black uppercase mb-2 px-1 flex items-center gap-1"
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
                  className="absolute left-[12px] top-0 bottom-0 w-px bg-muted"
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
                          // Active state is carried by the background fill + text
                          // weight/color. Removed the 3px left-stripe accent that
                          // duplicated those signals and is a common AI-slop tell.
                          "w-full text-left py-2 px-3 ml-2 rounded text-body font-normal transition-all duration-200 ease-in-out",
                          "focus:outline-none focus:ring-2 focus:ring-[#5f7f7a]/50 focus:ring-opacity-50 focus:ring-offset-1",
                          !isLocked && !disabled && "active:scale-[0.98] transform",
                          (isLocked || disabled)
                            ? "text-muted-foreground cursor-not-allowed opacity-60"
                            : isActive
                              ? "bg-[#5f7f7a]/15 text-[#3C6255] font-medium shadow-sm"
                              : "text-muted-foreground hover:bg-[#5f7f7a]/8 hover:text-black"
                        )}
                        aria-current={isActive ? "page" : undefined}
                        aria-describedby={undefined}
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
              Delete Organization
            </button>
          </div>
        )}

      </nav>
    </TooltipProvider>
  )
}


