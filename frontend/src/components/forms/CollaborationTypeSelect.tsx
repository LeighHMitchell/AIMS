"use client"

import React from "react"
import { CollaborationTypeSearchableSelect } from "./CollaborationTypeSearchableSelect"
import { IATI_COLLABORATION_TYPES } from "@/data/iati-collaboration-types"

// Legacy interface for backward compatibility
interface CollaborationTypeOption {
  value: string
  label: string
  description: string
}

interface CollaborationTypeGroup {
  label: string
  options: CollaborationTypeOption[]
}

// Legacy groups for backward compatibility - converted from new data structure
const collaborationTypeGroups: CollaborationTypeGroup[] = IATI_COLLABORATION_TYPES.map(group => ({
  label: group.label,
  options: group.types.map(type => ({
    value: type.code,
    label: type.name,
    description: type.description
  }))
}))

// Flatten all options for easy lookup
const allCollaborationTypeOptions = collaborationTypeGroups.flatMap(group => group.options)

interface CollaborationTypeSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  dropdownId?: string // Unique identifier for this dropdown instance
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
}

export function CollaborationTypeSelect({
  value,
  onValueChange,
  placeholder = "Select Collaboration Type",
  disabled = false,
  className,
  dropdownId = "collaboration-type-select",
  side,
  align,
}: CollaborationTypeSelectProps) {
  return (
    <CollaborationTypeSearchableSelect
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      dropdownId={dropdownId}
      side={side}
      align={align}
    />
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