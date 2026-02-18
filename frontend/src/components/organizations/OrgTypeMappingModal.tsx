"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { AlertTriangle, Building2, Lightbulb, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  isLegacyOrgType,
  getLegacyMapping,
  suggestNewOrgType,
  getSuggestionReason,
  getOrgTypeLabel,
  type OrgTypeOption,
} from "@/lib/org-type-mappings"

export interface OrgTypeMappingOrganization {
  id: string
  name: string
  acronym?: string | null
  country?: string | null
  Organisation_Type_Code?: string | null
  type?: string | null
}

interface OrgTypeMappingModalProps {
  isOpen: boolean
  onClose: () => void
  organization: OrgTypeMappingOrganization | null
  onSave: (orgId: string, newTypeCode: string) => Promise<void>
  onSkip?: () => void
}

/**
 * Hook to manage the OrgTypeMappingModal state
 * Returns an object with modal state and control functions
 */
export function useOrgTypeMappingModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [targetOrg, setTargetOrg] = React.useState<OrgTypeMappingOrganization | null>(null)

  const openModal = React.useCallback((org: OrgTypeMappingOrganization) => {
    setTargetOrg(org)
    setIsOpen(true)
  }, [])

  const closeModal = React.useCallback(() => {
    setIsOpen(false)
    // Delay clearing targetOrg to allow closing animation
    setTimeout(() => setTargetOrg(null), 200)
  }, [])

  return {
    isOpen,
    targetOrg,
    openModal,
    closeModal,
  }
}

export function OrgTypeMappingModal({
  isOpen,
  onClose,
  organization,
  onSave,
  onSkip,
}: OrgTypeMappingModalProps) {
  const [selectedType, setSelectedType] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Get the current legacy type code
  const currentTypeCode = organization?.Organisation_Type_Code || organization?.type || ""
  const legacyMapping = getLegacyMapping(currentTypeCode)
  
  // Calculate suggested type based on org country
  const suggestedType = suggestNewOrgType(currentTypeCode, organization?.country)
  const suggestionReason = getSuggestionReason(suggestedType, organization?.country)

  // Reset selected type when organization changes
  useEffect(() => {
    if (organization && legacyMapping) {
      // Pre-select the suggested type
      setSelectedType(suggestedType)
    } else {
      setSelectedType("")
    }
  }, [organization, legacyMapping, suggestedType])

  const handleUpdate = async () => {
    if (!organization || !selectedType) return

    setIsUpdating(true)
    try {
      await onSave(organization.id, selectedType)
      toast.success("Organization type updated", {
        description: `${organization.name} is now "${getOrgTypeLabel(selectedType)}"`,
      })
      onClose()
    } catch (error) {
      console.error("[OrgTypeMappingModal] Error updating organization:", error)
      toast.error("Failed to update organization type", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSkip = () => {
    onSkip?.()
    onClose()
  }

  // Don't render if no organization or not a legacy type
  if (!organization || !legacyMapping) {
    return null
  }

  const orgDisplayName = organization.acronym 
    ? `${organization.name} (${organization.acronym})`
    : organization.name

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Update Organization Type
          </DialogTitle>
          <DialogDescription>
            This organization uses a legacy IATI type code that has been replaced with more specific options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Organization Info */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white rounded-md border border-gray-200">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {orgDisplayName}
              </div>
              {organization.country && (
                <div className="text-sm text-gray-500">
                  {organization.country}
                </div>
              )}
            </div>
          </div>

          {/* Current Legacy Type Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-800">
                  Current Type: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">{currentTypeCode}</code> {legacyMapping.legacyLabel}
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  This code has been deprecated. Please select a more specific type below.
                </div>
              </div>
            </div>
          </div>

          {/* New Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select new organization type</Label>
            
            <RadioGroup
              value={selectedType}
              onValueChange={setSelectedType}
              className="space-y-2"
            >
              {legacyMapping.newOptions.map((option: OrgTypeOption) => {
                const isSuggested = option.code === suggestedType
                return (
                  <label
                    key={option.code}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedType === option.code
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <RadioGroupItem value={option.code} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                          {option.code}
                        </code>
                        <span className="font-medium text-gray-900">
                          {option.label}
                        </span>
                        {isSuggested && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                            Suggested
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {option.description}
                      </div>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          {/* Suggestion Hint */}
          {suggestionReason && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <span className="font-medium">Suggestion:</span> {suggestionReason}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isUpdating}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!selectedType || isUpdating}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Type"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrgTypeMappingModal
