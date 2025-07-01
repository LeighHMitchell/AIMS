"use client"

import React from "react"
import {
  EnhancedSelect,
  EnhancedSelectContent,
  EnhancedSelectItem,
  EnhancedSelectTrigger,
  EnhancedSelectValue,
  EnhancedSelectGroup,
  EnhancedSelectLabel,
  EnhancedSelectSeparator,
} from "@/components/ui/enhanced-select"

interface CollaborationTypeOption {
  value: string
  label: string
  description: string
}

interface CollaborationTypeGroup {
  label: string
  options: CollaborationTypeOption[]
}

// IATI Standard Collaboration Types (v2.03)
const collaborationTypeGroups: CollaborationTypeGroup[] = [
  {
    label: "Bilateral Types",
    options: [
      {
        value: "1",
        label: "Bilateral",
        description: "Direct cooperation between one donor and one recipient",
      },
      {
        value: "3",
        label: "Bilateral, core contributions to NGOs",
        description: "Core contributions to NGOs and other private bodies / PPPs",
      },
      {
        value: "7",
        label: "Bilateral, ex-post reporting on NGOs",
        description: "Ex-post reporting on NGOs' activities funded through core contributions",
      },
      {
        value: "8",
        label: "Bilateral, triangular co-operation",
        description: "South-South cooperation supported by bilateral/international orgs",
      },
    ],
  },
  {
    label: "Multilateral Types",
    options: [
      {
        value: "2",
        label: "Multilateral (inflows)",
        description: "Core contributions to multilateral organisations",
      },
      {
        value: "4",
        label: "Multilateral outflows",
        description: "Disbursements made by multilateral organisations from core funds",
      },
    ],
  },
  {
    label: "Other Types",
    options: [
      {
        value: "6",
        label: "Private Sector Outflows",
        description: "Outflows from private sector entities",
      },
    ],
  },
]

// Flatten all options for easy lookup
const allCollaborationTypeOptions = collaborationTypeGroups.flatMap(group => group.options)

interface CollaborationTypeSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function CollaborationTypeSelect({
  value,
  onValueChange,
  placeholder = "Select Collaboration Type",
  disabled = false,
  id,
}: CollaborationTypeSelectProps) {
  // Find the selected option to display its label in the trigger
  const selectedOption = allCollaborationTypeOptions.find(option => option.value === value)
  
  return (
    <div className="w-full">
      <EnhancedSelect value={value} onValueChange={onValueChange} disabled={disabled}>
      <EnhancedSelectTrigger id={id}>
        <EnhancedSelectValue placeholder={placeholder}>
          {selectedOption?.label || placeholder}
        </EnhancedSelectValue>
      </EnhancedSelectTrigger>
      <EnhancedSelectContent>
        {collaborationTypeGroups.map((group, groupIndex) => (
          <React.Fragment key={group.label}>
            {groupIndex > 0 && <EnhancedSelectSeparator />}
            <EnhancedSelectGroup>
              <EnhancedSelectLabel className="px-2 py-1.5 text-sm font-semibold text-gray-700">
                {group.label}
              </EnhancedSelectLabel>
              {group.options.map((option) => (
                <EnhancedSelectItem
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  description={option.description}
                />
              ))}
            </EnhancedSelectGroup>
          </React.Fragment>
        ))}
      </EnhancedSelectContent>
    </EnhancedSelect>
    </div>
  )
}

// Helper function to migrate old string values to IATI codes
export function migrateCollaborationType(oldValue: string | undefined | null): string {
  // Map old string values to IATI codes
  const migrationMap: Record<string, string> = {
    'bilateral': '1',
    'multilateral': '2',
    'public-private': '3', // Mapping to bilateral NGO contributions as closest match
    'triangular': '8',
  }
  
  if (!oldValue) return ''
  
  // If it's already a valid IATI code, return it
  if (['1', '2', '3', '4', '6', '7', '8'].includes(oldValue)) {
    return oldValue
  }
  
  // Otherwise, try to migrate from old format
  return migrationMap[oldValue] || ''
}

// Export the options and groups for use elsewhere if needed
export { collaborationTypeGroups, allCollaborationTypeOptions }
export type { CollaborationTypeOption, CollaborationTypeGroup }