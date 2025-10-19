import * as React from "react"
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
  
  // Identifier fields - optional for completion (these are not marked as required in the UI)
  if (general.otherIdentifier?.trim()) {
    completedFields.push('otherIdentifier')
  }
  
  if (general.iatiIdentifier?.trim()) {
    completedFields.push('iatiIdentifier')
  }
  
  if (general.uuid?.trim()) {
    completedFields.push('uuid')
  }
  
  // Date fields - only require planned dates for completion
  // Actual dates are optional and don't affect green tick status
  if (general.plannedStartDate) {
    completedFields.push('plannedStartDate')
  } else {
    missingFields.push('plannedStartDate')
  }
  
  if (general.plannedEndDate) {
    completedFields.push('plannedEndDate')
  } else {
    missingFields.push('plannedEndDate')
  }
  
  // Actual dates are tracked but not required for completion
  if (general.actualStartDate) {
    completedFields.push('actualStartDate')
  }
  
  if (general.actualEndDate) {
    completedFields.push('actualEndDate')
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
 * Check if the Combined Locations tab is complete based on specific locations, countries/regions, and subnational breakdown
 */
export function checkLocationsTabCompletion(data: { 
  specificLocations?: any[], 
  subnationalBreakdowns?: Record<string, number>,
  countries?: any[],
  regions?: any[]
}): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  let hasValidLocations = false
  let hasCompleteSubnational = false
  let hasValidCountriesRegions = false
  
  // Check specific locations
  if (data.specificLocations && data.specificLocations.length > 0) {
    // Check if we have at least one valid location with name and coordinates
    hasValidLocations = data.specificLocations.some(location => 
      (location.location_name?.trim() || location.name?.trim()) && // Support both field names
      typeof location.latitude === 'number' && 
      typeof location.longitude === 'number'
    );
    
    if (hasValidLocations) {
      completedFields.push('activity_locations')
    }
  }
  
  // Check countries and regions
  if (data.countries || data.regions) {
    const countries = data.countries || []
    const regions = data.regions || []

    const countryTotal = countries.reduce((sum, c) => sum + (c.percentage || 0), 0)
    const regionTotal = regions.reduce((sum, r) => sum + (r.percentage || 0), 0)
    const totalPercentage = countryTotal + regionTotal
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01
    const hasAnyValues = countries.length > 0 || regions.length > 0

    // Show as complete if we have any valid allocations (even if total isn't 100% yet)
    if (hasAnyValues) {
      hasValidCountriesRegions = true
      completedFields.push('countries_regions')
    }

    // Also mark as complete if total is valid (existing logic)
    if (isValidTotal && hasAnyValues) {
      completedFields.push('countries_regions_complete')
    }
  }
  
  // Check subnational breakdown
  if (data.subnationalBreakdowns) {
    const totalPercentage = Object.values(data.subnationalBreakdowns).reduce((sum, value) => sum + (value || 0), 0)
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01 // Allow for floating point precision
    const hasAnyValues = Object.values(data.subnationalBreakdowns).some(value => value > 0)
    
    // Show as complete if we have any values (even if total isn't 100% yet)
    if (hasAnyValues) {
      hasCompleteSubnational = true
      completedFields.push('subnational_breakdown')
    }
    
    // Also mark as complete if total is valid (existing logic)
    if (isValidTotal && hasAnyValues) {
      completedFields.push('subnational_breakdown_complete')
    }
  }
  
  // The Locations tab is complete if ANY condition is met:
  // 1. At least one valid location is saved OR
  // 2. Countries & regions have any data OR
  // 3. Subnational breakdown has any data
  const isComplete = hasValidLocations || hasValidCountriesRegions || hasCompleteSubnational
  
  // If none are complete, we consider it missing
  if (!hasValidLocations && !hasValidCountriesRegions && !hasCompleteSubnational) {
    missingFields.push('locations_data')
  }
  
  return {
    isComplete,
    isInProgress: completedFields.length > 0 && !isComplete,
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
 * Extended version that can accept save state information for more accurate completion status
 */
export function checkSectorsTabCompletion(sectors: any[], options?: { 
  autosaveState?: { isSaving?: boolean; isPersistentlySaved?: boolean; error?: any }
}): TabCompletionStatus {
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
    
    // If autosave state is provided and currently saving, show as in progress
    if (options?.autosaveState?.isSaving) {
      return {
        isComplete: false,
        isInProgress: true,
        completedFields,
        missingFields
      }
    }
    
    // If autosave failed, don't show as complete even if data looks valid
    if (options?.autosaveState?.error) {
      return {
        isComplete: false,
        isInProgress: false,
        completedFields,
        missingFields: [...missingFields, 'save_error']
      }
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
    // Check if we have at least one policy marker with a significance > 0
    // Support both old 'score' field and new 'significance' field
    const hasValidPolicyMarkers = policyMarkers.some(marker => 
      marker && (
        (marker.significance && marker.significance > 0) || 
        (marker.score && marker.score > 0)
      )
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
 * Check if the Humanitarian tab is complete based on humanitarian flag and scopes
 */
export function checkHumanitarianTabCompletion(data: { 
  humanitarian?: boolean, 
  humanitarianScopes?: any[] 
}): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  // Check if humanitarian flag is set
  if (data.humanitarian) {
    completedFields.push('humanitarian_flag')
  }
  
  // Check if we have at least one humanitarian scope
  if (data.humanitarianScopes && data.humanitarianScopes.length > 0) {
    completedFields.push('humanitarian_scopes')
  }
  
  // Tab is complete if humanitarian flag is set OR if there are scopes
  // (scopes automatically set the flag to true)
  const isComplete = data.humanitarian === true || (data.humanitarianScopes && data.humanitarianScopes.length > 0)
  
  if (!isComplete) {
    missingFields.push('humanitarian_data')
  }

  return {
    isComplete,
    isInProgress: false,
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
 * Check if the Aid Effectiveness tab is complete based on required fields
 */
export function checkAidEffectivenessTabCompletion(data: any): TabCompletionStatus {
  const completedFields: string[] = []
  const missingFields: string[] = []
  
  const aidEffectiveness = data?.aidEffectiveness || {}
  
  // Output 1 fields
  if (aidEffectiveness.implementingPartner) {
    completedFields.push('implementingPartner')
  } else {
    missingFields.push('implementingPartner')
  }
  
  if (aidEffectiveness.linkedToGovFramework) {
    completedFields.push('linkedToGovFramework')
  } else {
    missingFields.push('linkedToGovFramework')
  }
  
  if (aidEffectiveness.supportsPublicSector) {
    completedFields.push('supportsPublicSector')
  } else {
    missingFields.push('supportsPublicSector')
  }
  
  if (aidEffectiveness.numOutcomeIndicators !== undefined && aidEffectiveness.numOutcomeIndicators !== null) {
    completedFields.push('numOutcomeIndicators')
  } else {
    missingFields.push('numOutcomeIndicators')
  }
  
  if (aidEffectiveness.indicatorsFromGov) {
    completedFields.push('indicatorsFromGov')
  } else {
    missingFields.push('indicatorsFromGov')
  }
  
  if (aidEffectiveness.indicatorsViaGovData) {
    completedFields.push('indicatorsViaGovData')
  } else {
    missingFields.push('indicatorsViaGovData')
  }
  
  if (aidEffectiveness.finalEvalPlanned) {
    completedFields.push('finalEvalPlanned')
    if (aidEffectiveness.finalEvalPlanned === 'yes' && !aidEffectiveness.finalEvalDate) {
      missingFields.push('finalEvalDate')
    } else if (aidEffectiveness.finalEvalPlanned === 'yes' && aidEffectiveness.finalEvalDate) {
      completedFields.push('finalEvalDate')
    }
  } else {
    missingFields.push('finalEvalPlanned')
  }
  
  // Output 2 fields
  if (aidEffectiveness.govBudgetSystem) {
    completedFields.push('govBudgetSystem')
  } else {
    missingFields.push('govBudgetSystem')
  }
  
  if (aidEffectiveness.govFinReporting) {
    completedFields.push('govFinReporting')
  } else {
    missingFields.push('govFinReporting')
  }
  
  if (aidEffectiveness.govAudit) {
    completedFields.push('govAudit')
  } else {
    missingFields.push('govAudit')
  }
  
  if (aidEffectiveness.govProcurement) {
    completedFields.push('govProcurement')
  } else {
    missingFields.push('govProcurement')
  }
  
  // Output 3 fields
  if (aidEffectiveness.annualBudgetShared) {
    completedFields.push('annualBudgetShared')
  } else {
    missingFields.push('annualBudgetShared')
  }
  
  if (aidEffectiveness.forwardPlanShared) {
    completedFields.push('forwardPlanShared')
  } else {
    missingFields.push('forwardPlanShared')
  }
  
  if (aidEffectiveness.tiedStatus) {
    completedFields.push('tiedStatus')
  } else {
    missingFields.push('tiedStatus')
  }
  
  // Contact fields - check for new contacts array or legacy fields
  if (aidEffectiveness.contacts && aidEffectiveness.contacts.length > 0) {
    completedFields.push('contactName')
    completedFields.push('contactOrg')
    completedFields.push('contactEmail')
  } else if (aidEffectiveness.contactName && aidEffectiveness.contactOrg && aidEffectiveness.contactEmail) {
    completedFields.push('contactName')
    completedFields.push('contactOrg')
    completedFields.push('contactEmail')
  } else {
    missingFields.push('contactName')
    missingFields.push('contactOrg')
    missingFields.push('contactEmail')
  }
  
  const isComplete = missingFields.length === 0
  const isInProgress = completedFields.length > 0 && !isComplete
  
  return {
    isComplete,
    isInProgress,
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
    case 'humanitarian':
      return checkHumanitarianTabCompletion(data);
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
    case 'aid_effectiveness':
      return checkAidEffectivenessTabCompletion(data);
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