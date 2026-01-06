/**
 * IATI Transaction Validation Utility
 * 
 * Provides validation functions to ensure transactions comply with IATI Standard 2.03
 */

import { 
  Transaction, 
  TransactionSector, 
  TransactionRecipientCountry, 
  TransactionRecipientRegion 
} from '@/types/transaction';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a transaction against IATI Standard requirements
 */
export function validateIATITransaction(transaction: Partial<Transaction>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // === REQUIRED FIELDS ===
  
  if (!transaction.transaction_type) {
    errors.push('Transaction type is required (IATI: transaction-type/@code)');
  }
  
  if (!transaction.transaction_date) {
    errors.push('Transaction date is required (IATI: transaction-date/@iso-date)');
  }
  
  if (!transaction.value || transaction.value <= 0) {
    errors.push('Transaction value must be greater than 0 (IATI: value)');
  }
  
  if (!transaction.currency) {
    errors.push('Currency is required (IATI: value/@currency)');
  }

  // === RECOMMENDED FIELDS (IATI Best Practices) ===
  
  if (!transaction.provider_org_id && !transaction.provider_org_name) {
    warnings.push('Provider organization is recommended for transparency (IATI: provider-org)');
  }
  
  if (!transaction.receiver_org_id && !transaction.receiver_org_name) {
    warnings.push('Receiver organization is recommended for transparency (IATI: receiver-org)');
  }
  
  if (!transaction.description) {
    warnings.push('Transaction description is recommended (IATI: description/narrative)');
  }
  
  if (!transaction.flow_type) {
    warnings.push('Flow type classification is recommended (IATI: flow-type/@code)');
  }
  
  if (!transaction.finance_type) {
    warnings.push('Finance type classification is recommended (IATI: finance-type/@code)');
  }
  
  if (!transaction.aid_type && (!transaction.aid_types || transaction.aid_types.length === 0)) {
    warnings.push('Aid type classification is recommended (IATI: aid-type/@code)');
  }

  // === SECTOR VALIDATION ===
  
  const validationSectors = validateTransactionSectors(transaction);
  errors.push(...validationSectors.errors);
  warnings.push(...validationSectors.warnings);

  // === GEOGRAPHIC VALIDATION ===
  
  const validationGeography = validateTransactionGeography(transaction);
  errors.push(...validationGeography.errors);
  warnings.push(...validationGeography.warnings);

  // === HUMANITARIAN VALIDATION ===
  
  if (transaction.is_humanitarian) {
    const hasCountry = !!transaction.recipient_country_code;
    const hasRegion = !!transaction.recipient_region_code;
    
    if (!hasCountry && !hasRegion) {
      warnings.push('Humanitarian transactions should specify a recipient country or region for tracking purposes');
    }
  }

  // === VALUE DATE VALIDATION ===
  
  if (transaction.value_date && transaction.transaction_date) {
    const valueDate = new Date(transaction.value_date);
    const transDate = new Date(transaction.transaction_date);
    
    if (valueDate < transDate) {
      warnings.push('Value date is before transaction date - this is unusual but valid for FX settlement');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates transaction sectors including percentage allocation
 */
export function validateTransactionSectors(transaction: Partial<Transaction>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check new multi-sector array
  if (transaction.sectors && transaction.sectors.length > 0) {
    const sectorsWithPercentage = transaction.sectors.filter(s => s.percentage !== undefined);
    
    if (sectorsWithPercentage.length > 0) {
      // Calculate total percentage
      const totalPercentage = sectorsWithPercentage.reduce((sum, s) => sum + (s.percentage || 0), 0);
      
      // Validate sum equals 100% (with small tolerance for rounding)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(
          `Transaction sector percentages must sum to 100% (IATI requirement). ` +
          `Current total: ${totalPercentage.toFixed(2)}%`
        );
      }
      
      // Ensure all or none have percentages
      if (sectorsWithPercentage.length !== transaction.sectors.length) {
        warnings.push(
          'Some sectors have percentages while others do not. ' +
          'IATI recommends either all sectors have percentages or none do.'
        );
      }
      
      // Validate individual percentages
      transaction.sectors.forEach((sector, index) => {
        if (sector.percentage !== undefined) {
          if (sector.percentage < 0 || sector.percentage > 100) {
            errors.push(
              `Sector ${index + 1} (${sector.code}) has invalid percentage: ${sector.percentage}%. ` +
              `Must be between 0 and 100.`
            );
          }
        }
      });
    }
    
    // Validate sector codes are not empty
    transaction.sectors.forEach((sector, index) => {
      if (!sector.code || sector.code.trim() === '') {
        errors.push(`Sector ${index + 1} is missing a sector code`);
      }
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates transaction geography (countries and regions)
 * IATI Standard: At transaction level, only ONE country OR ONE region is allowed (not both, and no multiple values)
 */
export function validateTransactionGeography(transaction: Partial<Transaction>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasCountry = !!transaction.recipient_country_code;
  const hasRegion = !!transaction.recipient_region_code;

  // IATI Standard: Either ONE recipient-country OR ONE recipient-region, not both
  if (hasCountry && hasRegion) {
    errors.push(
      'Transaction can have ONE recipient-country OR ONE recipient-region, not both ' +
      '(IATI Standard requirement)'
    );
  }

  // Validate country code format (ISO 3166-1 alpha-2)
  if (transaction.recipient_country_code) {
    if (transaction.recipient_country_code.length !== 2) {
      warnings.push(
        `Recipient country code "${transaction.recipient_country_code}" should be ISO 3166-1 alpha-2 (2 characters)`
      );
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates aid types
 */
export function validateTransactionAidTypes(transaction: Partial<Transaction>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (transaction.aid_types && transaction.aid_types.length > 0) {
    // Validate aid type codes are not empty
    transaction.aid_types.forEach((aidType, index) => {
      if (!aidType.code || aidType.code.trim() === '') {
        errors.push(`Aid type ${index + 1} is missing an aid type code`);
      }
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Helper function to get user-friendly validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return 'Transaction is fully IATI compliant ✓';
  }
  
  if (result.isValid && result.warnings.length > 0) {
    return `Transaction is valid but has ${result.warnings.length} IATI recommendation(s)`;
  }
  
  return `Transaction has ${result.errors.length} validation error(s)`;
}

/**
 * Validates multiple transactions at once
 */
export function validateTransactionBatch(transactions: Partial<Transaction>[]): {
  results: ValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    withWarnings: number;
  };
} {
  const results = transactions.map(t => validateIATITransaction(t));
  
  return {
    results,
    summary: {
      total: transactions.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
      withWarnings: results.filter(r => r.warnings.length > 0).length,
    }
  };
}
