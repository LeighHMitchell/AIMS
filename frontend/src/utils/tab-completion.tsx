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
 * Check if the Combined Locations tab is complete based on specific locations and subnational breakdown
 */
export function checkLocationsTabCompletion(data: { specificLocations?: any[], subnationalBreakdowns?: Record<string, number> }): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Check specific locations
  if (data.specificLocations && data.specificLocations.length > 0) {
    // Check if we have at least one valid location with name and coordinates
    const hasValidLocations = data.specificLocations.some(location => 
      location.name?.trim() && 
      typeof location.latitude === 'number' && 
      typeof location.longitude === 'number'
    );
    
    if (hasValidLocations) {
      completedFields.push('locations')
    } else {
      missingFields.push('locations')
    }
  } else {
    missingFields.push('locations')
  }
  
  // Check subnational breakdown
  if (data.subnationalBreakdowns) {
    const totalPercentage = Object.values(data.subnationalBreakdowns).reduce((sum, value) => sum + (value || 0), 0)
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01 // Allow for floating point precision
    const hasAnyValues = Object.values(data.subnationalBreakdowns).some(value => value > 0)
    
    if (isValidTotal && hasAnyValues) {
      completedFields.push('subnational_breakdown')
    } else if (hasAnyValues) {
      missingFields.push('subnational_breakdown')
    }
    // If no values, we don't mark it as missing since it's optional
  }
  
  return {
    isComplete: missingFields.length === 0,
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
 * Check if the Working Groups tab is complete based on assigned working groups
 */
export function checkWorkingGroupsTabCompletion(workingGroups: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (workingGroups && workingGroups.length > 0) {
    // Check if we have at least one valid working group
    const hasValidWorkingGroups = workingGroups.some(wg => 
      wg && (wg.code?.trim() || wg.id)
    );
    
    if (hasValidWorkingGroups) {
      completedFields.push('working_groups')
    } else {
      missingFields.push('working_groups')
    }
  } else {
    missingFields.push('working_groups')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Working groups don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Policy Markers tab is complete based on assigned policy markers
 */
export function checkPolicyMarkersTabCompletion(policyMarkers: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (policyMarkers && policyMarkers.length > 0) {
    // Check if we have at least one policy marker with a score > 0
    const hasValidPolicyMarkers = policyMarkers.some(marker => 
      marker && marker.score && marker.score > 0
    );
    
    if (hasValidPolicyMarkers) {
      completedFields.push('policy_markers')
    } else {
      missingFields.push('policy_markers')
    }
  } else {
    missingFields.push('policy_markers')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Policy markers don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Organizations tab is complete based on participating organizations
 */
export function checkOrganizationsTabCompletion(participatingOrganizations: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Check if we have at least one participating organization
  if (participatingOrganizations && participatingOrganizations.length > 0) {
    completedFields.push('participating_organizations')
  } else {
    missingFields.push('participating_organizations')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Organizations don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Contributors tab is complete based on nominated contributors
 */
export function checkContributorsTabCompletion(contributors: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Check if we have at least one contributor
  if (contributors && contributors.length > 0) {
    completedFields.push('contributors')
  } else {
    missingFields.push('contributors')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Contributors don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Contacts tab is complete based on contacts
 */
export function checkContactsTabCompletion(contacts: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (contacts && contacts.length > 0) {
    // Check if we have at least one valid contact with required fields
    const hasValidContacts = contacts.some(contact => 
      contact && 
      contact.firstName?.trim() && 
      contact.lastName?.trim() &&
      contact.type &&
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

/**
 * Check if the Linked Activities tab is complete based on linked activities
 */
export function checkLinkedActivitiesTabCompletion(linkedActivities: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (linkedActivities && linkedActivities.length > 0) {
    // If we have at least one linked activity, the tab is complete
    completedFields.push('linkedActivities')
  } else {
    missingFields.push('linkedActivities')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Linked activities don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Results tab is complete based on results
 */
export function checkResultsTabCompletion(results: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  if (results && results.length > 0) {
    // If we have at least one result, the tab is complete
    completedFields.push('results')
  } else {
    missingFields.push('results')
  }
  
  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Results don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Documents & Images tab is complete based on documents
 */
export function checkDocumentsTabCompletion(documents: any[]): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Check if we have at least one document or image
  if (documents && documents.length > 0) {
    completedFields.push('documents')
  } else {
    missingFields.push('documents')
  }

  return {
    isComplete: missingFields.length === 0,
    isInProgress: false, // Documents don't have an in-progress state
    completedFields,
    missingFields
  }
}

/**
 * Check if the Government Inputs tab is complete based on any field being filled
 */
export function checkGovernmentInputsTabCompletion(governmentInputs: any): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Check if any field has been completed
  let hasAnyField = false
  
  // Check budget classification fields
  if (governmentInputs?.onBudgetClassification) {
    hasAnyField = true
    completedFields.push('budget_classification')
  }
  
  // Check financial contribution
  if (governmentInputs?.rgcContribution?.isProvided) {
    hasAnyField = true
    completedFields.push('financial_contribution')
  }
  
  // Check national plan alignment
  if (governmentInputs?.nationalPlanAlignment?.isAligned) {
    hasAnyField = true
    completedFields.push('national_plan_alignment')
  }
  
  // Check technical coordination
  if (governmentInputs?.technicalCoordination?.mechanismType) {
    hasAnyField = true
    completedFields.push('technical_coordination')
  }
  
  // Check oversight agreements
  if (governmentInputs?.oversightAgreement?.hasAgreement) {
    hasAnyField = true
    completedFields.push('oversight_agreement')
  }
  
  // Check geographic context
  if (governmentInputs?.geographicContext?.riskLevel) {
    hasAnyField = true
    completedFields.push('geographic_context')
  }
  
  // Check evaluation framework
  if (governmentInputs?.evaluationFramework?.isLinked) {
    hasAnyField = true
    completedFields.push('evaluation_framework')
  }
  
  if (!hasAnyField) {
    missingFields.push('government_inputs')
  }

  return {
    isComplete: hasAnyField,
    isInProgress: false,
    completedFields,
    missingFields
  }
}

/**
 * Check if the Focal Points tab is complete based on assigned focal points
 */
export function checkFocalPointsTabCompletion(focalPointsData: any): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Check if there's any focal points data
  if (!focalPointsData) {
    missingFields.push('focal_points')
    return {
      isComplete: false,
      isInProgress: false,
      completedFields,
      missingFields
    }
  }
  
  let hasAnyFocalPoints = false
  
  // Check government focal points
  if (focalPointsData.government_focal_points && focalPointsData.government_focal_points.length > 0) {
    const validGovernmentFocalPoints = focalPointsData.government_focal_points.filter((fp: any) => 
      fp && fp.name?.trim() && fp.email?.trim()
    )
    if (validGovernmentFocalPoints.length > 0) {
      completedFields.push('government_focal_points')
      hasAnyFocalPoints = true
    }
  }
  
  // Check development partner focal points
  if (focalPointsData.development_partner_focal_points && focalPointsData.development_partner_focal_points.length > 0) {
    const validDevelopmentFocalPoints = focalPointsData.development_partner_focal_points.filter((fp: any) => 
      fp && fp.name?.trim() && fp.email?.trim()
    )
    if (validDevelopmentFocalPoints.length > 0) {
      completedFields.push('development_partner_focal_points')
      hasAnyFocalPoints = true
    }
  }
  
  // If no focal points are assigned, mark as missing
  if (!hasAnyFocalPoints) {
    missingFields.push('focal_points')
  }

  return {
    isComplete: hasAnyFocalPoints && missingFields.length === 0,
    isInProgress: false,
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
    case 'working_groups':
      return checkWorkingGroupsTabCompletion(data);
    case 'policy_markers':
      return checkPolicyMarkersTabCompletion(data);
    case 'organisations':
      return checkOrganizationsTabCompletion(data);
    case 'contributors':
      return checkContributorsTabCompletion(data);
    case 'contacts':
      return checkContactsTabCompletion(data);
    case 'linked-activities':
      return checkLinkedActivitiesTabCompletion(data);
    case 'results':
      return checkResultsTabCompletion(data);
    case 'documents':
      return checkDocumentsTabCompletion(data);
    case 'government':
      return checkGovernmentInputsTabCompletion(data);
    case 'focal_points':
      return checkFocalPointsTabCompletion(data);
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
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }
  
  if (isInProgress) {
    return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
  }
  
  return null
} 