/**
 * Transaction Field Cleaning Utilities
 * 
 * Centralized functions for cleaning and validating transaction field values
 * before database operations. These utilities ensure consistent handling of
 * boolean, enum, UUID, and date fields across all transaction endpoints.
 * 
 * CRITICAL: Boolean fields must preserve false values - never use `|| null`
 */

/**
 * Clean boolean fields - preserve false values
 * 
 * @param value - Any value that should be converted to boolean
 * @returns boolean - false for null/undefined, otherwise converts to boolean
 * 
 * IMPORTANT: This preserves false values. Using `value || false` would
 * incorrectly convert false to false, but `value || null` would convert
 * false to null, losing the user's intent.
 */
export function cleanBooleanValue(value: any): boolean {
  if (value === undefined || value === null) return false;
  return Boolean(value);
}

/**
 * Clean enum fields - handle empty/null/none values
 * 
 * @param value - Enum value to clean
 * @returns string | null - Cleaned enum value or null for empty/invalid values
 */
export function cleanEnumValue(value: any): string | null {
  if (!value || value === 'none' || value === 'undefined' || value === 'null' || value === '') {
    return null;
  }
  return String(value).trim();
}

/**
 * Clean UUID fields with validation
 * 
 * @param value - UUID string to validate and clean
 * @returns string | null - Valid UUID or null
 */
export function cleanUUIDValue(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return null;
    // Basic UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(trimmed) ? trimmed : null;
  }
  return null;
}

/**
 * Clean date fields
 * 
 * @param value - Date string to clean
 * @returns string | null - Cleaned date string or null
 */
export function cleanDateValue(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

/**
 * Main transaction field cleaner
 * 
 * Cleans all transaction fields according to their types, ensuring consistent
 * handling across all transaction update endpoints.
 * 
 * @param data - Raw transaction data object
 * @returns Cleaned transaction data object
 * 
 * Note: Only includes fields that are present in the input data.
 * Fields that are undefined in the input will be undefined in the output.
 */
export function cleanTransactionFields(data: any): any {
  const cleaned: any = {};

  // Core fields (explicit handling)
  if (data.transaction_type !== undefined) {
    cleaned.transaction_type = cleanEnumValue(data.transaction_type);
  }
  if (data.transaction_date !== undefined) {
    cleaned.transaction_date = cleanDateValue(data.transaction_date);
  }
  if (data.value !== undefined) {
    cleaned.value = data.value;
  }
  if (data.currency !== undefined) {
    cleaned.currency = cleanEnumValue(data.currency);
  }
  if (data.status !== undefined) {
    cleaned.status = cleanEnumValue(data.status);
  }

  // Optional fields
  if (data.transaction_reference !== undefined) {
    cleaned.transaction_reference = data.transaction_reference || null;
  }
  if (data.value_date !== undefined) {
    cleaned.value_date = cleanDateValue(data.value_date);
  }
  if (data.description !== undefined) {
    cleaned.description = data.description || null;
  }

  // Organization fields
  if (data.provider_org_id !== undefined) {
    cleaned.provider_org_id = cleanUUIDValue(data.provider_org_id);
  }
  if (data.provider_org_type !== undefined) {
    cleaned.provider_org_type = cleanEnumValue(data.provider_org_type);
  }
  if (data.provider_org_ref !== undefined) {
    cleaned.provider_org_ref = data.provider_org_ref || null;
  }
  if (data.provider_org_name !== undefined) {
    cleaned.provider_org_name = data.provider_org_name || null;
  }
  if (data.provider_org_activity_id !== undefined) {
    cleaned.provider_org_activity_id = data.provider_org_activity_id || null;
  }
  if (data.provider_activity_uuid !== undefined) {
    cleaned.provider_activity_uuid = cleanUUIDValue(data.provider_activity_uuid);
  }

  if (data.receiver_org_id !== undefined) {
    cleaned.receiver_org_id = cleanUUIDValue(data.receiver_org_id);
  }
  if (data.receiver_org_type !== undefined) {
    cleaned.receiver_org_type = cleanEnumValue(data.receiver_org_type);
  }
  if (data.receiver_org_ref !== undefined) {
    cleaned.receiver_org_ref = data.receiver_org_ref || null;
  }
  if (data.receiver_org_name !== undefined) {
    cleaned.receiver_org_name = data.receiver_org_name || null;
  }
  if (data.receiver_org_activity_id !== undefined) {
    cleaned.receiver_org_activity_id = data.receiver_org_activity_id || null;
  }
  if (data.receiver_activity_uuid !== undefined) {
    cleaned.receiver_activity_uuid = cleanUUIDValue(data.receiver_activity_uuid);
  }

  // IATI classification fields
  if (data.aid_type !== undefined) {
    cleaned.aid_type = cleanEnumValue(data.aid_type);
  }
  if (data.aid_type_vocabulary !== undefined) {
    cleaned.aid_type_vocabulary = data.aid_type_vocabulary || null;
  }
  if (data.flow_type !== undefined) {
    cleaned.flow_type = cleanEnumValue(data.flow_type);
  }
  if (data.finance_type !== undefined) {
    cleaned.finance_type = cleanEnumValue(data.finance_type);
  }
  if (data.tied_status !== undefined) {
    cleaned.tied_status = cleanEnumValue(data.tied_status);
  }
  if (data.disbursement_channel !== undefined) {
    cleaned.disbursement_channel = cleanEnumValue(data.disbursement_channel);
  }

  // Sector and geographic fields
  if (data.sector_code !== undefined) {
    cleaned.sector_code = data.sector_code || null;
  }
  if (data.sector_vocabulary !== undefined) {
    cleaned.sector_vocabulary = data.sector_vocabulary || null;
  }
  if (data.recipient_country_code !== undefined) {
    cleaned.recipient_country_code = data.recipient_country_code || null;
  }
  if (data.recipient_region_code !== undefined) {
    cleaned.recipient_region_code = data.recipient_region_code || null;
  }
  if (data.recipient_region_vocab !== undefined) {
    cleaned.recipient_region_vocab = data.recipient_region_vocab || null;
  }

  // Boolean fields - CRITICAL: preserve false values
  if (data.is_humanitarian !== undefined) {
    cleaned.is_humanitarian = cleanBooleanValue(data.is_humanitarian);
  }
  if (data.finance_type_inherited !== undefined) {
    cleaned.finance_type_inherited = cleanBooleanValue(data.finance_type_inherited);
  }
  if (data.fx_differs !== undefined) {
    cleaned.fx_differs = cleanBooleanValue(data.fx_differs);
  }
  if (data.use_activity_sectors !== undefined) {
    cleaned.use_activity_sectors = cleanBooleanValue(data.use_activity_sectors);
  }

  // Other fields
  if (data.financing_classification !== undefined) {
    cleaned.financing_classification = data.financing_classification || null;
  }
  if (data.created_by !== undefined) {
    cleaned.created_by = cleanUUIDValue(data.created_by);
  }
  if (data.updated_by !== undefined) {
    cleaned.updated_by = cleanUUIDValue(data.updated_by);
  }
  if (data.organization_id !== undefined) {
    cleaned.organization_id = cleanUUIDValue(data.organization_id);
  }

  // USD conversion fields - preserve these when provided
  if (data.value_usd !== undefined) {
    cleaned.value_usd = data.value_usd;
  }
  if (data.exchange_rate_used !== undefined) {
    cleaned.exchange_rate_used = data.exchange_rate_used;
  }
  if (data.usd_conversion_date !== undefined) {
    cleaned.usd_conversion_date = data.usd_conversion_date;
  }
  if (data.usd_convertible !== undefined) {
    cleaned.usd_convertible = cleanBooleanValue(data.usd_convertible);
  }
  if (data.exchange_rate_manual !== undefined) {
    cleaned.exchange_rate_manual = cleanBooleanValue(data.exchange_rate_manual);
  }

  return cleaned;
}

/**
 * Clean a single field value based on field name
 * 
 * Useful for field-level autosave operations where only one field is being updated.
 * 
 * @param fieldName - Database column name
 * @param value - Raw field value
 * @returns Cleaned field value
 */
export function cleanFieldValue(fieldName: string, value: any): any {
  // Boolean fields
  if (['is_humanitarian', 'finance_type_inherited', 'fx_differs', 'usd_convertible', 'exchange_rate_manual', 'use_activity_sectors'].includes(fieldName)) {
    return value !== undefined ? cleanBooleanValue(value) : null;
  }

  // Enum fields
  if ([
    'transaction_type', 'status', 'currency',
    'aid_type', 'flow_type', 'finance_type', 'tied_status', 
    'disbursement_channel', 'provider_org_type', 'receiver_org_type'
  ].includes(fieldName)) {
    return cleanEnumValue(value);
  }

  // UUID fields
  if ([
    'provider_org_id', 'receiver_org_id', 'provider_activity_uuid', 
    'receiver_activity_uuid', 'created_by', 'updated_by', 'organization_id'
  ].includes(fieldName)) {
    return cleanUUIDValue(value);
  }

  // Date fields
  if (['transaction_date', 'value_date', 'usd_conversion_date'].includes(fieldName)) {
    return cleanDateValue(value);
  }

  // Numeric fields (preserve as-is)
  if (['value_usd', 'exchange_rate_used'].includes(fieldName)) {
    return value !== undefined ? value : null;
  }

  // Default: return value if defined, otherwise null
  return value !== undefined ? value : null;
}

