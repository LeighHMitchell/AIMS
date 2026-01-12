// Type definitions for Data Clinic validation rules

// Base activity fields used across validation rules
export interface ValidationActivityBase {
  id: string;
  title_narrative: string;
  iati_identifier: string | null;
  activity_status: string;
  updated_at: string;
}

// Rule 1: Implementation past planned end date
export interface ImplementationPastEndDateActivity extends ValidationActivityBase {
  planned_end_date: string;
  days_past_end: number;
}

// Rule 2: Implementation with actual end date
export interface ImplementationWithActualEndActivity extends ValidationActivityBase {
  actual_end_date: string;
}

// Rule 3: Missing planned start date
export interface MissingPlannedStartActivity extends ValidationActivityBase {
  created_at: string;
}

// Rule 4: Missing planned end date
export interface MissingPlannedEndActivity extends ValidationActivityBase {
  planned_start_date: string | null;
}

// Rule 5: Closed without actual end date
export interface ClosedWithoutActualEndActivity extends ValidationActivityBase {
  planned_end_date: string | null;
}

// Rule 6: No commitment transaction
export interface NoCommitmentActivity extends ValidationActivityBase {
  transaction_count: number;
}

// Rule 7: Location percentages don't sum to 100%
export interface PercentageNotHundredActivity extends ValidationActivityBase {
  total_percentage: number;
  location_count: number;
}

// Rule 8: No locations
export interface NoLocationsActivity extends ValidationActivityBase {
  // activity_scope could be added if needed
}

// Rule 9: Mixed admin levels
export interface MixedAdminLevelsActivity extends ValidationActivityBase {
  distinct_admin_levels: number;
  location_count: number;
  admin_levels: string[];
}

// Rule 10: Zero percent location
export interface ZeroPercentLocationActivity extends ValidationActivityBase {
  location_name: string;
  percentage_allocation: number;
}

// Rule 11: No implementing organisation
export interface NoImplementingOrgActivity extends ValidationActivityBase {
  participating_org_count: number;
}

// Rule 12: Sector percentages don't sum to 100%
export interface SectorPercentageNotHundredActivity extends ValidationActivityBase {
  total_sector_percentage: number;
  sector_count: number;
}

// Rule 13: Zero percent sector
export interface ZeroPercentSectorActivity extends ValidationActivityBase {
  sector_code: string;
  sector_name: string;
  percentage: number;
}

// API Response structure
export interface ValidationRulesResponse {
  activityRules: {
    implementationPastEndDate: ImplementationPastEndDateActivity[];
    implementationWithActualEnd: ImplementationWithActualEndActivity[];
    missingPlannedStart: MissingPlannedStartActivity[];
    missingPlannedEnd: MissingPlannedEndActivity[];
    closedWithoutActualEnd: ClosedWithoutActualEndActivity[];
  };
  transactionRules: {
    noCommitmentTransaction: NoCommitmentActivity[];
  };
  locationRules: {
    percentageNotHundred: PercentageNotHundredActivity[];
    noLocations: NoLocationsActivity[];
    mixedAdminLevels: MixedAdminLevelsActivity[];
    zeroPercentLocation: ZeroPercentLocationActivity[];
  };
  participatingOrgRules: {
    noImplementingOrg: NoImplementingOrgActivity[];
  };
  sectorRules: {
    sectorPercentageNotHundred: SectorPercentageNotHundredActivity[];
    zeroPercentSector: ZeroPercentSectorActivity[];
  };
  counts: {
    activityRules: number;
    transactionRules: number;
    locationRules: number;
    participatingOrgRules: number;
    sectorRules: number;
    total: number;
  };
}

// Activity status labels for display
export const ACTIVITY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  '1': { label: 'Pipeline', color: 'bg-gray-100 text-gray-700' },
  '2': { label: 'Implementation', color: 'bg-blue-100 text-blue-700' },
  '3': { label: 'Finalisation', color: 'bg-purple-100 text-purple-700' },
  '4': { label: 'Closed', color: 'bg-slate-100 text-slate-700' },
  '5': { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  '6': { label: 'Suspended', color: 'bg-orange-100 text-orange-700' },
};
