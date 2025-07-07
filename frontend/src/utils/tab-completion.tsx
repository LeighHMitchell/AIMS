import React from "react"
import { CheckCircle } from "lucide-react"

export interface TabCompletionStatus {
  isComplete: boolean
  completedFields: string[]
  missingFields: string[]
}

export interface GeneralTabData {
  title?: string
  description?: string
  collaborationType?: string
  activityStatus?: string
  plannedStartDate?: string
  plannedEndDate?: string
  actualStartDate?: string
  actualEndDate?: string
  otherIdentifier?: string
  iatiIdentifier?: string
  banner?: string
  icon?: string
}

/**
 * Check if the General tab is complete based on available fields
 * For date fields, only check those that are available based on activity status
 */
export function checkGeneralTabCompletion(
  general: GeneralTabData,
  getDateFieldStatus: () => {
    plannedStartDate: boolean
    plannedEndDate: boolean
    actualStartDate: boolean
    actualEndDate: boolean
  }
): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Always required fields
  if (general.title?.trim()) {
    completedFields.push('title')
  } else {
    missingFields.push('title')
  }
  
  if (general.description?.trim()) {
    completedFields.push('description')
  } else {
    missingFields.push('description')
  }
  
  if (general.collaborationType) {
    completedFields.push('collaborationType')
  } else {
    missingFields.push('collaborationType')
  }
  
  if (general.activityStatus) {
    completedFields.push('activityStatus')
  } else {
    missingFields.push('activityStatus')
  }
  
  // Date fields - check based on availability
  const dateStatus = getDateFieldStatus()
  
  if (dateStatus.plannedStartDate) {
    if (general.plannedStartDate) {
      completedFields.push('plannedStartDate')
    } else {
      missingFields.push('plannedStartDate')
    }
  }
  
  if (dateStatus.plannedEndDate) {
    if (general.plannedEndDate) {
      completedFields.push('plannedEndDate')
    } else {
      missingFields.push('plannedEndDate')
    }
  }
  
  if (dateStatus.actualStartDate) {
    if (general.actualStartDate) {
      completedFields.push('actualStartDate')
    } else {
      missingFields.push('actualStartDate')
    }
  }
  
  if (dateStatus.actualEndDate) {
    if (general.actualEndDate) {
      completedFields.push('actualEndDate')
    } else {
      missingFields.push('actualEndDate')
    }
  }
  
  const isComplete = missingFields.length === 0
  
  return {
    isComplete,
    completedFields,
    missingFields
  }
}

/**
 * Get completion status for all tabs
 * Currently only implements General tab - can be extended for other tabs
 */
export function getTabCompletionStatus(
  sectionId: string,
  general: GeneralTabData,
  getDateFieldStatus: () => {
    plannedStartDate: boolean
    plannedEndDate: boolean
    actualStartDate: boolean
    actualEndDate: boolean
  }
): TabCompletionStatus | null {
  switch (sectionId) {
    case 'general':
      return checkGeneralTabCompletion(general, getDateFieldStatus)
    // Add other tabs here as needed
    default:
      return null
  }
}

/**
 * React component for the completion checkmark
 */
export function TabCompletionIndicator({ isComplete }: { isComplete: boolean }) {
  if (!isComplete) return null
  
  return (
    <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
  )
} 