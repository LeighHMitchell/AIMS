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
 * Check if the Locations tab is complete based on specific locations
 */
export function checkLocationsTabCompletion(data: any): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Handle both single locations array and combined data object
  const specificLocations = Array.isArray(data) ? data : data?.specificLocations || [];
  const subnationalBreakdowns = data?.subnationalBreakdowns || {};
  
  // Check Activity Locations
  if (specificLocations && specificLocations.length > 0) {
    // Check if we have at least one valid location with name and coordinates
    const hasValidLocations = specificLocations.some((location: any) => 
      location.name?.trim() && 
      typeof location.latitude === 'number' && 
      typeof location.longitude === 'number'
    );
    
    if (hasValidLocations) {
      completedFields.push('activity_locations')
    } else {
      missingFields.push('activity_locations')
    }
  } else {
    missingFields.push('activity_locations')
  }
  
  // Check Subnational Breakdown (optional - only if user has entered data)
  const hasSubnationalData = Object.keys(subnationalBreakdowns).length > 0;
  if (hasSubnationalData) {
    const totalPercentage = Object.values(subnationalBreakdowns).reduce((sum: number, value: any) => sum + (value || 0), 0);
    if (Math.abs(totalPercentage - 100) < 0.1) {
      completedFields.push('subnational_breakdown')
    } else {
      missingFields.push('subnational_breakdown')
    }
  }
  
  // Tab is complete if we have either valid activity locations OR valid subnational breakdown
  const hasValidActivityLocations = completedFields.includes('activity_locations');
  const hasValidSubnationalBreakdown = completedFields.includes('subnational_breakdown');
  
  return {
    isComplete: hasValidActivityLocations || hasValidSubnationalBreakdown,
    isInProgress: completedFields.length > 0 && missingFields.length > 0,
    completedFields,
    missingFields
  }
}

/**
 * Check if the Tags tab is complete based on tags
 */
export function checkTagsTabCompletion(tags: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (tags && tags.length > 0) {
    // Check if we have at least one valid tag
    const hasValidTags = tags.some(tag => 
      tag && (tag.name?.trim() || tag.id)
    );
    
    if (hasValidTags) {
      completedFields.push('tags')
    } else {
      missingFields.push('tags')
    }
  } else {
    missingFields.push('tags')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Tags don't have an in-progress state
    completedFields,
    missingFields
  }
}

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

/**
 * Check if the Organizations tab is complete based on partner data
 */
export function checkOrganizationsTabCompletion(data: {
  extendingPartners?: any[]
  implementingPartners?: any[]
  governmentPartners?: any[]
}): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  const extendingPartners = data.extendingPartners || []
  const implementingPartners = data.implementingPartners || []
  const governmentPartners = data.governmentPartners || []
  
  // Check if we have at least one partner of any type
  const totalPartners = extendingPartners.length + implementingPartners.length + governmentPartners.length
  
  if (totalPartners > 0) {
    completedFields.push('partners')
    
    // Add specific partner type fields if they exist
    if (extendingPartners.length > 0) {
      completedFields.push('extending_partners')
    }
    if (implementingPartners.length > 0) {
      completedFields.push('implementing_partners')
    }
    if (governmentPartners.length > 0) {
      completedFields.push('government_partners')
    }
  } else {
    missingFields.push('partners')
  }
  
  return {
    isComplete: totalPartners > 0,
    isInProgress: false, // Organizations don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Contributors tab is complete based on nominated contributors
 */
export function checkContactsTabCompletion(contacts: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (contacts && contacts.length > 0) {
    // Check if we have at least one contact with required fields (firstName, lastName, position)
    const hasValidContacts = contacts.some(contact => 
      contact && 
      contact.firstName?.trim() && 
      contact.lastName?.trim() && 
      contact.position?.trim()
    );
    
    if (hasValidContacts) {
      completedFields.push('contacts')
    } else {
      missingFields.push('contacts')
    }
  } else {
    missingFields.push('contacts')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false,
    completedFields,
    missingFields
  }
}

export function checkContributorsTabCompletion(contributors: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (contributors && contributors.length > 0) {
    // Check if we have at least one contributor with any status (nominated, accepted, or requested)
    const hasValidContributors = contributors.some(contributor => 
      contributor && contributor.status && 
      ['nominated', 'accepted', 'requested'].includes(contributor.status)
    );
    
    if (hasValidContributors) {
      completedFields.push('contributors')
      
      // Add more granular status tracking
      const acceptedCount = contributors.filter(c => c.status === 'accepted').length
      const nominatedCount = contributors.filter(c => c.status === 'nominated').length
      const requestedCount = contributors.filter(c => c.status === 'requested').length
      
      if (acceptedCount > 0) {
        completedFields.push('accepted_contributors')
      }
      if (nominatedCount > 0) {
        completedFields.push('nominated_contributors')
      }
      if (requestedCount > 0) {
        completedFields.push('requested_contributors')
      }
    } else {
      missingFields.push('contributors')
    }
  } else {
    missingFields.push('contributors')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Contributors don't have an in-progress state currently
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
    case 'locations':
      return checkLocationsTabCompletion(data);
    case 'tags':
      return checkTagsTabCompletion(data);
    case 'organisations':
      return checkOrganizationsTabCompletion(data);
    case 'contacts':
      return checkContactsTabCompletion(data);
    case 'contributors':
      return checkContributorsTabCompletion(data);
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
    return <CheckCircle className="h-4 w-4 text-gray-900" />
  }
  
  if (isInProgress) {
    return <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
  }
  
  return null
} 