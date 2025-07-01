/**
 * IATI Field Mapper
 * Maps between IATI XML field names and AIMS database field names
 */

// Type definitions
export interface FieldMapping {
  iatiField: string;
  aimsField: string;
  transform?: (value: any) => any;
  reverseTransform?: (value: any) => any;
  description?: string;
}

export interface MappingResult {
  field: string;
  value: any;
  originalValue?: any;
  transformed?: boolean;
}

// Status code mappings
const ACTIVITY_STATUS_MAP: Record<string, string> = {
  '1': 'pipeline',
  '2': 'implementation', 
  '3': 'finalisation',
  '4': 'closed',
  '5': 'cancelled',
  '6': 'suspended'
};

const REVERSE_ACTIVITY_STATUS_MAP: Record<string, string> = Object.entries(ACTIVITY_STATUS_MAP)
  .reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {});

// Main field mappings
export const FIELD_MAPPINGS: FieldMapping[] = [
  // Basic fields
  {
    iatiField: 'title_narrative',
    aimsField: 'title',
    description: 'Activity title'
  },
  {
    iatiField: 'description_narrative',
    aimsField: 'description',
    description: 'Activity description'
  },
  {
    iatiField: 'activity_status',
    aimsField: 'activityStatus',
    transform: (value: string) => ACTIVITY_STATUS_MAP[value] || 'pipeline',
    reverseTransform: (value: string) => REVERSE_ACTIVITY_STATUS_MAP[value] || '1',
    description: 'Activity status with code conversion'
  },
  
  // Date fields
  {
    iatiField: 'activity_date_start_planned',
    aimsField: 'plannedStartDate',
    transform: (value: string) => value ? new Date(value).toISOString() : null,
    description: 'Planned start date'
  },
  {
    iatiField: 'activity_date_start_actual',
    aimsField: 'actualStartDate',
    transform: (value: string) => value ? new Date(value).toISOString() : null,
    description: 'Actual start date'
  },
  {
    iatiField: 'activity_date_end_planned',
    aimsField: 'plannedEndDate',
    transform: (value: string) => value ? new Date(value).toISOString() : null,
    description: 'Planned end date'
  },
  {
    iatiField: 'activity_date_end_actual',
    aimsField: 'actualEndDate',
    transform: (value: string) => value ? new Date(value).toISOString() : null,
    description: 'Actual end date'
  },
  
  // Classification fields
  {
    iatiField: 'default_aid_type',
    aimsField: 'defaultAidType',
    description: 'Default aid type code'
  },
  {
    iatiField: 'flow_type',
    aimsField: 'flowType',
    description: 'Flow type code'
  },
  {
    iatiField: 'collaboration_type',
    aimsField: 'collaborationType',
    description: 'Collaboration type code'
  },
  {
    iatiField: 'default_finance_type',
    aimsField: 'defaultFinanceType',
    description: 'Default finance type code'
  },
  
  // Complex fields
  {
    iatiField: 'sectors',
    aimsField: 'sectors',
    transform: (sectors: any[]) => {
      if (!Array.isArray(sectors)) return [];
      return sectors.map(s => ({
        code: s.code || s.sector_code,
        name: s.name || s.sector_name,
        percentage: parseFloat(s.percentage) || 0,
        vocabulary: s.vocabulary || '1'
      }));
    },
    description: 'Sector allocations'
  },
  {
    iatiField: 'participating_orgs',
    aimsField: 'participatingOrganizations',
    transform: (orgs: any[]) => {
      if (!Array.isArray(orgs)) return [];
      return orgs.map(org => ({
        ref: org.ref,
        name: org.name,
        role: org.role,
        type: org.type
      }));
    },
    description: 'Participating organizations'
  },
  {
    iatiField: 'transactions',
    aimsField: 'transactions',
    transform: (transactions: any[]) => {
      if (!Array.isArray(transactions)) return [];
      return transactions.map(t => ({
        type: t.transaction_type?.code || t.type,
        date: t.transaction_date || t.date,
        value: parseFloat(t.value?.amount || t.value || 0),
        currency: t.value?.currency || t.currency || 'USD',
        description: t.description?.narrative || t.description,
        providerOrg: t.provider_org?.ref || t.provider_org,
        receiverOrg: t.receiver_org?.ref || t.receiver_org
      }));
    },
    description: 'Financial transactions'
  },
  
  // IATI-specific fields
  {
    iatiField: 'iati_identifier',
    aimsField: 'iatiIdentifier',
    description: 'IATI activity identifier'
  },
  {
    iatiField: 'reporting_org',
    aimsField: 'reportingOrg',
    transform: (org: any) => ({
      ref: org?.ref,
      name: org?.name,
      type: org?.type
    }),
    description: 'Reporting organization'
  }
];

/**
 * Map IATI fields to AIMS fields
 * @param iatiData - Data from IATI with IATI field names
 * @returns Object with AIMS field names
 */
export function mapIatiToAims(iatiData: Record<string, any>): Record<string, any> {
  const mappedData: Record<string, any> = {};
  
  FIELD_MAPPINGS.forEach(mapping => {
    if (iatiData.hasOwnProperty(mapping.iatiField)) {
      const value = iatiData[mapping.iatiField];
      mappedData[mapping.aimsField] = mapping.transform 
        ? mapping.transform(value)
        : value;
    }
  });
  
  return mappedData;
}

/**
 * Map AIMS fields to IATI fields
 * @param aimsData - Data from AIMS with AIMS field names
 * @returns Object with IATI field names
 */
export function mapAimsToIati(aimsData: Record<string, any>): Record<string, any> {
  const mappedData: Record<string, any> = {};
  
  FIELD_MAPPINGS.forEach(mapping => {
    if (aimsData.hasOwnProperty(mapping.aimsField)) {
      const value = aimsData[mapping.aimsField];
      mappedData[mapping.iatiField] = mapping.reverseTransform 
        ? mapping.reverseTransform(value)
        : value;
    }
  });
  
  return mappedData;
}

/**
 * Get field mapping by IATI field name
 */
export function getMappingByIatiField(iatiField: string): FieldMapping | undefined {
  return FIELD_MAPPINGS.find(m => m.iatiField === iatiField);
}

/**
 * Get field mapping by AIMS field name
 */
export function getMappingByAimsField(aimsField: string): FieldMapping | undefined {
  return FIELD_MAPPINGS.find(m => m.aimsField === aimsField);
}

/**
 * Map a single field value
 */
export function mapFieldValue(
  fieldName: string, 
  value: any, 
  direction: 'iatiToAims' | 'aimsToIati'
): MappingResult {
  const mapping = direction === 'iatiToAims' 
    ? getMappingByIatiField(fieldName)
    : getMappingByAimsField(fieldName);
    
  if (!mapping) {
    return {
      field: fieldName,
      value: value,
      originalValue: value,
      transformed: false
    };
  }
  
  const transformFn = direction === 'iatiToAims' 
    ? mapping.transform 
    : mapping.reverseTransform;
    
  const targetField = direction === 'iatiToAims'
    ? mapping.aimsField
    : mapping.iatiField;
  
  return {
    field: targetField,
    value: transformFn ? transformFn(value) : value,
    originalValue: value,
    transformed: !!transformFn
  };
}

/**
 * Get all available field mappings for display
 */
export function getAllFieldMappings(): Array<{
  iatiField: string;
  aimsField: string;
  description: string;
  hasTransform: boolean;
}> {
  return FIELD_MAPPINGS.map(mapping => ({
    iatiField: mapping.iatiField,
    aimsField: mapping.aimsField,
    description: mapping.description || 'No description',
    hasTransform: !!(mapping.transform || mapping.reverseTransform)
  }));
}

/**
 * Validate if all required IATI fields are present
 */
export function validateIatiData(iatiData: Record<string, any>): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const requiredFields = ['title_narrative', 'description_narrative', 'activity_status'];
  const missingFields = requiredFields.filter(field => !iatiData[field]);
  
  const warnings: string[] = [];
  
  // Check for recommended fields
  const recommendedFields = ['activity_date_start_planned', 'sectors', 'participating_orgs'];
  recommendedFields.forEach(field => {
    if (!iatiData[field]) {
      warnings.push(`Recommended field '${field}' is missing`);
    }
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  };
}

/**
 * Compare two datasets and identify differences
 */
export function compareData(
  aimsData: Record<string, any>,
  iatiData: Record<string, any>
): {
  differences: Array<{
    field: string;
    aimsValue: any;
    iatiValue: any;
    isDifferent: boolean;
  }>;
  hasDifferences: boolean;
} {
  const differences: Array<{
    field: string;
    aimsValue: any;
    iatiValue: any;
    isDifferent: boolean;
  }> = [];
  
  // Convert IATI data to AIMS format for comparison
  const mappedIatiData = mapIatiToAims(iatiData);
  
  // Compare each mapped field
  Object.keys(mappedIatiData).forEach(aimsField => {
    const aimsValue = aimsData[aimsField];
    const iatiValue = mappedIatiData[aimsField];
    const isDifferent = JSON.stringify(aimsValue) !== JSON.stringify(iatiValue);
    
    differences.push({
      field: aimsField,
      aimsValue,
      iatiValue,
      isDifferent
    });
  });
  
  return {
    differences,
    hasDifferences: differences.some(d => d.isDifferent)
  };
} 