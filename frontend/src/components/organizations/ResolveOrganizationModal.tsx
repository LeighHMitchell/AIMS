"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Search, Building2, Plus, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import OrganizationCombobox from '@/components/organization-combobox'

export interface UnresolvedOrganization {
  ref: string | null
  narrative: string | null
  roles: string[] // e.g., ['Funding', 'Implementing']
  activityCount: number
  transactionCount?: number
}

export interface Resolution {
  action: 'link' | 'create' | 'skip'
  organizationId?: string
  rememberMapping?: boolean
  newOrgData?: {
    name: string
    acronym?: string
    iati_org_id?: string
    Organisation_Type_Code?: string
    country_represented?: string
  }
}

interface ResolveOrganizationModalProps {
  unresolvedOrganizations: UnresolvedOrganization[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolved: (resolutions: Map<string, Resolution>) => void
}

/**
 * Modal for resolving unrecognized organization references during IATI import
 * Allows user to link to existing org, create new org, or skip
 */
export function ResolveOrganizationModal({
  unresolvedOrganizations,
  open,
  onOpenChange,
  onResolved
}: ResolveOrganizationModalProps) {
  // Map of org key -> resolution
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(new Map())
  
  // Currently expanded org in accordion
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)

  // Get unique key for an organization
  const getOrgKey = (org: UnresolvedOrganization): string => {
    return `${org.ref || 'no-ref'}::${org.narrative || 'no-narrative'}`
  }

  // Get resolution for an org
  const getResolution = (org: UnresolvedOrganization): Resolution | undefined => {
    return resolutions.get(getOrgKey(org))
  }

  // Update resolution for an org
  const setResolution = (org: UnresolvedOrganization, resolution: Resolution) => {
    const newResolutions = new Map(resolutions)
    newResolutions.set(getOrgKey(org), resolution)
    setResolutions(newResolutions)
  }

  // Handle selecting "Link to existing"
  const handleLinkToExisting = (org: UnresolvedOrganization, organizationId: string) => {
    setResolution(org, {
      action: 'link',
      organizationId,
      rememberMapping: false
    })
  }

  // Handle toggling "Remember mapping"
  const handleToggleRemember = (org: UnresolvedOrganization) => {
    const current = getResolution(org)
    if (current && current.action === 'link') {
      setResolution(org, {
        ...current,
        rememberMapping: !current.rememberMapping
      })
    }
  }

  // Handle selecting "Create new"
  const handleCreateNew = (org: UnresolvedOrganization) => {
    setResolution(org, {
      action: 'create',
      newOrgData: {
        name: org.narrative || '',
        iati_org_id: org.ref || undefined
      }
    })
  }

  // Handle selecting "Skip"
  const handleSkip = (org: UnresolvedOrganization) => {
    setResolution(org, {
      action: 'skip'
    })
  }

  // Handle "Skip All"
  const handleSkipAll = () => {
    const newResolutions = new Map<string, Resolution>()
    unresolvedOrganizations.forEach(org => {
      newResolutions.set(getOrgKey(org), { action: 'skip' })
    })
    setResolutions(newResolutions)
  }

  // Handle "Save"
  const handleSave = () => {
    // Validate that all orgs have resolutions
    const unresolvedCount = unresolvedOrganizations.filter(
      org => !resolutions.has(getOrgKey(org))
    ).length

    if (unresolvedCount > 0) {
      toast.error(`Please resolve all ${unresolvedCount} remaining organizations or skip them`)
      return
    }

    // Validate "create new" resolutions have required data
    const invalidCreates = Array.from(resolutions.values()).filter(
      r => r.action === 'create' && (!r.newOrgData?.name || r.newOrgData.name.trim().length === 0)
    )

    if (invalidCreates.length > 0) {
      toast.error('All new organizations must have a name')
      return
    }

    onResolved(resolutions)
  }

  const resolvedCount = resolutions.size
  const totalCount = unresolvedOrganizations.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Resolve Organization References
          </DialogTitle>
          <DialogDescription>
            {totalCount} organization{totalCount !== 1 ? 's' : ''} in the import {totalCount !== 1 ? 'are' : 'is'} not recognized. 
            Please link {totalCount !== 1 ? 'them' : 'it'} to existing organizations, create new ones, or skip for now.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Unresolved organizations will prevent data from being imported correctly
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Transactions and activities referencing these organizations will not be linked until they are resolved.
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex-shrink-0 text-sm text-gray-600">
          Resolved: {resolvedCount} / {totalCount}
        </div>

        {/* Organization list */}
        <div className="flex-1 overflow-y-auto border rounded-md">
          <Accordion 
            type="single" 
            collapsible 
            value={expandedOrg || undefined}
            onValueChange={(value) => setExpandedOrg(value || null)}
          >
            {unresolvedOrganizations.map((org, index) => {
              const key = getOrgKey(org)
              const resolution = getResolution(org)
              const isResolved = !!resolution

              return (
                <AccordionItem key={key} value={key} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:bg-gray-50 px-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        {isResolved ? (
                          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                            <ChevronRight className="h-3 w-3 text-green-600" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-gray-200" />
                        )}
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">
                          {org.ref && (
                            <span className="text-blue-600">{org.ref}</span>
                          )}
                          {org.ref && org.narrative && <span className="mx-2">·</span>}
                          {org.narrative && (
                            <span className="text-gray-900">{org.narrative}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Used as: {org.roles.join(', ')} · 
                          {org.activityCount} {org.activityCount === 1 ? 'activity' : 'activities'}
                          {org.transactionCount && ` · ${org.transactionCount} transactions`}
                        </div>
                      </div>

                      {isResolved && (
                        <Badge variant="secondary" className="ml-2">
                          {resolution.action === 'link' ? 'Linked' : 
                           resolution.action === 'create' ? 'New' : 'Skipped'}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4">
                    <RadioGroup
                      value={resolution?.action || ''}
                      onValueChange={(value: 'link' | 'create' | 'skip') => {
                        if (value === 'link') {
                          // Don't auto-set, wait for user to select org
                        } else if (value === 'create') {
                          handleCreateNew(org)
                        } else if (value === 'skip') {
                          handleSkip(org)
                        }
                      }}
                      className="space-y-4"
                    >
                      {/* Link to existing */}
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="link" id={`${key}-link`} />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`${key}-link`} className="font-medium">
                            Link to existing organization
                          </Label>
                          
                          {resolution?.action === 'link' || resolution?.action === undefined ? (
                            <div className="space-y-2">
                              <OrganizationCombobox
                                value={resolution?.organizationId || ''}
                                onValueChange={(value) => handleLinkToExisting(org, value)}
                                placeholder="Search organizations..."
                              />
                              
                              {resolution?.organizationId && (
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${key}-remember`}
                                    checked={resolution.rememberMapping || false}
                                    onCheckedChange={() => handleToggleRemember(org)}
                                  />
                                  <label
                                    htmlFor={`${key}-remember`}
                                    className="text-sm text-gray-700 cursor-pointer"
                                  >
                                    Remember this mapping (add {org.ref || org.narrative} as alias)
                                  </label>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Create new */}
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="create" id={`${key}-create`} />
                        <div className="flex-1">
                          <Label htmlFor={`${key}-create`} className="font-medium">
                            Create new organization
                          </Label>
                          {resolution?.action === 'create' && (
                            <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded border">
                              <div>
                                <Label htmlFor={`${key}-name`} className="text-xs">Name *</Label>
                                <Input
                                  id={`${key}-name`}
                                  value={resolution.newOrgData?.name || ''}
                                  onChange={(e) => {
                                    setResolution(org, {
                                      ...resolution,
                                      newOrgData: {
                                        ...resolution.newOrgData,
                                        name: e.target.value
                                      }
                                    })
                                  }}
                                  placeholder="Organization name"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`${key}-iati`} className="text-xs">IATI ID</Label>
                                <Input
                                  id={`${key}-iati`}
                                  value={resolution.newOrgData?.iati_org_id || ''}
                                  onChange={(e) => {
                                    setResolution(org, {
                                      ...resolution,
                                      newOrgData: {
                                        ...resolution.newOrgData,
                                        iati_org_id: e.target.value
                                      }
                                    })
                                  }}
                                  placeholder="e.g., KR-GOV-010"
                                  className="mt-1"
                                />
                              </div>
                              <p className="text-xs text-gray-500">
                                You can add more details after import
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Skip */}
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="skip" id={`${key}-skip`} />
                        <div className="flex-1">
                          <Label htmlFor={`${key}-skip`} className="font-medium">
                            Skip (resolve later)
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Activities and transactions referencing this organization will not be imported
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSkipAll}
          >
            Skip All
          </Button>
          <Button
            onClick={handleSave}
            className="bg-slate-600 hover:bg-slate-700"
            disabled={resolvedCount === 0}
          >
            Save ({resolvedCount}/{totalCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

