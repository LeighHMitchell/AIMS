import React from "react"
import { CheckCircle, Loader2 } from "lucide-react"

export interface TabCompletionStatus {
  isComplete: boolean
  isInProgress: boolean
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
  uuid?: string
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
  
  // Identifier fields - required for completion
  if (general.otherIdentifier?.trim()) {
    completedFields.push('otherIdentifier')
  } else {
    missingFields.push('otherIdentifier')
  }
  
  if (general.iatiIdentifier?.trim()) {
    completedFields.push('iatiIdentifier')
  } else {
    missingFields.push('iatiIdentifier')
  }
  
  if (general.uuid?.trim()) {
    completedFields.push('uuid')
  } else {
    missingFields.push('uuid')
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
  const isInProgress = completedFields.includes('title') && completedFields.length === 1
  
  return {
    isComplete,
    isInProgress,
    completedFields,
    missingFields
  }
}

export interface FinancesTabData {
  default_aid_type?: string | null;
  default_finance_type?: string | null;
  default_flow_type?: string | null;
  default_currency?: string | null;
  default_tied_status?: string | null;
  hasUnsavedChanges?: boolean; // must be false for completion
}

/**
 * Check if the Finances/Defaults tab is complete: all fields filled AND saved (no unsaved changes)
 */
export function checkFinancesTabCompletion(
  finances: FinancesTabData
): TabCompletionStatus {
  const completedFields: string[] = [];
  const missingFields: string[] = [];

  if (finances.default_aid_type) {
    completedFields.push('default_aid_type');
  } else {
    missingFields.push('default_aid_type');
  }
  if (finances.default_finance_type) {
    completedFields.push('default_finance_type');
  } else {
    missingFields.push('default_finance_type');
  }
  if (finances.default_flow_type) {
    completedFields.push('default_flow_type');
  } else {
    missingFields.push('default_flow_type');
  }
  if (finances.default_currency) {
    completedFields.push('default_currency');
  } else {
    missingFields.push('default_currency');
  }
  if (finances.default_tied_status) {
    completedFields.push('default_tied_status');
  } else {
    missingFields.push('default_tied_status');
  }

  // All fields must be filled AND no unsaved changes
  const isComplete = missingFields.length === 0 && finances.hasUnsavedChanges === false;
  const isInProgress = false; // Finances tab doesn't have an in-progress state

  return {
    isComplete,
    isInProgress,
    completedFields,
    missingFields
  };
}

/**
 * Get completion status for all tabs
 * Currently only implements General tab - can be extended for other tabs
 */
/**
 * Check if the Sectors tab is complete based on sector allocations
 */
export function checkSectorsTabCompletion(sectors: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (sectors && sectors.length > 0) {
    // Check if we have at least one sector with a percentage > 0
    const hasValidSectors = sectors.some(sector => 
      sector.percentage && sector.percentage > 0
    );
    
    if (hasValidSectors) {
      completedFields.push('sectors')
    } else {
      missingFields.push('sectors')
    }
    
    // Check if percentages add up close to 100%
    const totalPercentage = sectors.reduce((sum, sector) => sum + (sector.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) < 0.1) {
      completedFields.push('allocation_complete')
    } else {
      missingFields.push('allocation_complete')
    }
  } else {
    missingFields.push('sectors')
    missingFields.push('allocation_complete')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: completedFields.length > 0 && missingFields.length > 0,
    completedFields,
    missingFields
  }
}

export function getTabCompletionStatus(
  sectionId: string,
  data: any,
  getDateFieldStatus?: () => {
    plannedStartDate: boolean
    plannedEndDate: boolean
    actualStartDate: boolean
    actualEndDate: boolean
  }
): TabCompletionStatus | null {
  switch (sectionId) {
    case 'general':
      return checkGeneralTabCompletion(data, getDateFieldStatus!);
    case 'finances':
      return checkFinancesTabCompletion(data);
    case 'sectors':
      return checkSectorsTabCompletion(data);
    // Add other tabs here as needed
    default:
      return null;
  }
}

/**
 * React component for the completion checkmark
 */
export function TabCompletionIndicator({ isComplete, isInProgress }: { isComplete: boolean; isInProgress: boolean }) {
  if (isComplete) {
    return <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
  }
  
  if (isInProgress) {
    return <Loader2 className="h-4 w-4 text-orange-500 ml-2 animate-spin" />
  }
  
  return null
} 