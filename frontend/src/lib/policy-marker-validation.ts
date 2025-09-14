/**
 * IATI Policy Marker Significance Validation
 *
 * Implements IATI v2.03 Policy Significance codelist rules:
 * - Standard markers (1,2,3,4,5,6,7,10,11,12): significance 0-2
 * - Desertification (marker 8): significance 0-3 (3 = principal objective AND in support of action programme)
 * - RMNCH (marker 9): significance 0-4 (4 = explicit primary objective)
 */

export interface PolicyMarkerValidationResult {
  isValid: boolean;
  maxAllowedSignificance: number;
  error?: string;
}

export interface PolicyMarker {
  iati_code?: string | null;
  code?: string;
  name?: string;
  is_iati_standard?: boolean;
}

/**
 * Get the maximum allowed significance for a policy marker according to IATI v2.03
 */
export function getMaxAllowedSignificance(marker: PolicyMarker): number {
  // For custom markers (non-IATI), allow full range
  if (!marker.is_iati_standard) {
    return 4;
  }

  const iatiCode = marker.iati_code;

  // Desertification (IATI code 8): allows 0-3
  if (iatiCode === '8') {
    return 3;
  }

  // RMNCH (IATI code 9): allows 0-4
  if (iatiCode === '9') {
    return 4;
  }

  // All other standard IATI markers: 0-2
  return 2;
}

/**
 * Validate a significance value for a specific policy marker
 */
export function validatePolicyMarkerSignificance(
  marker: PolicyMarker,
  significance: number
): PolicyMarkerValidationResult {
  const maxAllowed = getMaxAllowedSignificance(marker);

  if (significance < 0 || significance > 4) {
    return {
      isValid: false,
      maxAllowedSignificance: maxAllowed,
      error: `Significance must be between 0 and 4 (got ${significance})`
    };
  }

  if (significance > maxAllowed) {
    const markerName = marker.name || marker.code || `IATI code ${marker.iati_code}`;
    let errorMessage: string;

    if (marker.iati_code === '8') {
      errorMessage = `Desertification marker only allows significance 0-3 (got ${significance}). Value 3 means "principal objective AND in support of an action programme"`;
    } else if (marker.iati_code === '9') {
      errorMessage = `RMNCH marker allows significance 0-4 (got ${significance})`;
    } else {
      errorMessage = `${markerName} only allows significance 0-2 (got ${significance}). Higher values are reserved for Desertification (0-3) and RMNCH (0-4) markers only`;
    }

    return {
      isValid: false,
      maxAllowedSignificance: maxAllowed,
      error: errorMessage
    };
  }

  return {
    isValid: true,
    maxAllowedSignificance: maxAllowed
  };
}

/**
 * Get significance label for a given value and marker type
 */
export function getSignificanceLabel(significance: number, marker?: PolicyMarker): string {
  const isRMNCH = marker?.iati_code === '9';

  if (isRMNCH) {
    switch (significance) {
      case 0: return "Negligible or no funding";
      case 1: return "At least a quarter of funding";
      case 2: return "Half of the funding";
      case 3: return "Most funding targeted";
      case 4: return "Explicit primary objective";
      default: return "Unknown";
    }
  }

  // Standard IATI labels
  switch (significance) {
    case 0: return "Not targeted";
    case 1: return "Significant objective";
    case 2: return "Principal objective";
    case 3: return "Principal objective AND in support of action programme"; // Desertification only
    case 4: return "Explicit primary objective"; // RMNCH only
    default: return "Unknown";
  }
}

/**
 * Get significance description for a given value and marker type
 */
export function getSignificanceDescription(significance: number, marker?: PolicyMarker): string {
  const isRMNCH = marker?.iati_code === '9';
  const isDesertification = marker?.iati_code === '8';

  if (isRMNCH) {
    switch (significance) {
      case 0: return "Negligible or no funding is targeted to RMNCH activities/results. RMNCH is not an objective of the project/programme.";
      case 1: return "At least a quarter of the funding is targeted to the objective.";
      case 2: return "Half of the funding is targeted to the objective.";
      case 3: return "Most, but not all of the funding is targeted to the objective.";
      case 4: return "Explicit primary objective - all funding is targeted to RMNCH activities/results.";
      default: return "Unknown significance level.";
    }
  }

  // Standard IATI descriptions
  switch (significance) {
    case 0: return "The activity does not target this policy objective.";
    case 1: return "Important and deliberate objective, but not the principal reason for the activity.";
    case 2: return "The policy objective is the principal reason for undertaking the activity.";
    case 3:
      if (isDesertification) {
        return "Principal objective undertaken in support of an action programme (Desertification only).";
      }
      return "Invalid for this marker type. Only available for Desertification marker.";
    case 4:
      return "Invalid for this marker type. Only available for RMNCH marker.";
    default: return "Unknown significance level.";
  }
}

/**
 * Get available significance options for a policy marker
 */
export function getAvailableSignificanceOptions(marker: PolicyMarker) {
  const maxAllowed = getMaxAllowedSignificance(marker);
  const isRMNCH = marker?.iati_code === '9';

  const options = [];
  for (let i = 0; i <= maxAllowed; i++) {
    options.push({
      value: i,
      label: getSignificanceLabel(i, marker),
      description: getSignificanceDescription(i, marker),
      color: "bg-gray-100 text-gray-700"
    });
  }

  return options;
}