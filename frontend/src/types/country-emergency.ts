/**
 * Type definitions for Country Emergencies
 * Country-identified emergencies for humanitarian scope vocabulary 98
 */

/**
 * Country Emergency (domain model)
 */
export interface CountryEmergency {
  id: string;
  name: string;
  code: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Database row format (snake_case)
 */
export interface CountryEmergencyRow {
  id: string;
  name: string;
  code: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Form data for creating/editing country emergencies
 */
export interface CountryEmergencyFormData {
  name: string;
  code: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  isActive: boolean;
}

/**
 * Convert database row to CountryEmergency
 */
export function toCountryEmergency(row: CountryEmergencyRow): CountryEmergency {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

/**
 * Convert CountryEmergencyFormData to database row format
 */
export function toCountryEmergencyRow(
  data: CountryEmergencyFormData
): Partial<CountryEmergencyRow> {
  return {
    name: data.name,
    code: data.code,
    start_date: data.startDate,
    end_date: data.endDate,
    location: data.location,
    description: data.description,
    is_active: data.isActive,
  };
}
