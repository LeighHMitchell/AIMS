/**
 * Demo script to add sample locations for testing the LocationModal workflow
 * This script creates realistic sample locations that demonstrate different
 * location types, IATI fields, and percentage allocations.
 */

import { getSupabaseAdmin } from '@/lib/supabase';

export interface SampleLocation {
  location_name: string;
  location_type: 'site' | 'coverage';
  description?: string;
  location_description?: string;
  activity_location_description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  site_type?: string;
  coverage_scope?: string;
  state_region_name?: string;
  township_name?: string;
  location_reach?: string;
  exactness?: string;
  location_class?: string;
  feature_designation?: string;
  location_id_vocabulary?: string;
  location_id_code?: string;
  admin_level?: string;
  admin_code?: string;
  percentage_allocation?: number;
  is_sensitive?: boolean;
}

// Sample locations demonstrating different scenarios
export const SAMPLE_LOCATIONS: SampleLocation[] = [
  // Site locations with coordinates
  {
    location_name: 'Yangon Central Hospital',
    location_type: 'site',
    description: 'Main healthcare facility for maternal health program',
    latitude: 16.8661,
    longitude: 96.1951,
    address: 'No. 1, Pyay Road, Yangon',
    city: 'Yangon',
    site_type: 'health_facility',
    state_region_name: 'Yangon Region',
    location_reach: '1', // Activity happens here
    exactness: '1', // Exact
    location_class: '3', // Structure
    feature_designation: 'HSP',
    location_id_vocabulary: 'G1', // GeoNames
    location_id_code: '1868373176', // Example GeoNames ID
    admin_level: '3', // Township level
    admin_code: 'MMR013D001',
    percentage_allocation: 40,
    is_sensitive: false,
  },
  {
    location_name: 'Mandalay Regional Office',
    location_type: 'site',
    description: 'Regional coordination office for education programs',
    latitude: 21.9588,
    longitude: 96.0891,
    address: '27th Street, Between 74th & 75th, Mandalay',
    city: 'Mandalay',
    site_type: 'office',
    state_region_name: 'Mandalay Region',
    location_reach: '1', // Activity happens here
    exactness: '1', // Exact
    location_class: '3', // Structure
    feature_designation: 'BLDG',
    location_id_vocabulary: 'G2', // OpenStreetMap
    location_id_code: 'node/1234567890', // Example OSM node ID
    admin_level: '3',
    admin_code: 'MMR015D002',
    percentage_allocation: 35,
    is_sensitive: false,
  },
  {
    location_name: 'Naypyidaw Training Center',
    location_type: 'site',
    description: 'National training facility for capacity building',
    latitude: 19.7633,
    longitude: 96.0785,
    address: 'Ministry of Education Complex, Naypyidaw',
    city: 'Naypyidaw',
    site_type: 'training_center',
    state_region_name: 'Naypyidaw Union Territory',
    location_reach: '1', // Activity happens here
    exactness: '1', // Exact
    location_class: '3', // Structure
    feature_designation: 'SCH',
    location_id_vocabulary: 'G1', // GeoNames
    location_id_code: '1868373177',
    admin_level: '1', // State/Region level
    admin_code: 'MMR018',
    percentage_allocation: 25,
    is_sensitive: false,
  },

  // Coverage areas (no coordinates)
  {
    location_name: 'Rural Communities in Shan State',
    location_type: 'coverage',
    description: 'Remote rural areas with limited access to services',
    coverage_scope: 'subnational',
    state_region_name: 'Shan State',
    location_reach: '2', // Beneficiaries live here
    exactness: '2', // Approximate
    location_class: '2', // Settlement
    admin_level: '1',
    admin_code: 'MMR017',
    percentage_allocation: 30,
    is_sensitive: true, // Sensitive due to remote communities
  },
  {
    location_name: 'Coastal Areas in Rakhine State',
    location_type: 'coverage',
    description: 'Coastal communities affected by climate change',
    coverage_scope: 'subnational',
    state_region_name: 'Rakhine State',
    location_reach: '2', // Beneficiaries live here
    exactness: '2', // Approximate
    location_class: '2', // Settlement
    admin_level: '1',
    admin_code: 'MMR013',
    percentage_allocation: 25,
    is_sensitive: false,
  },
  {
    location_name: 'Urban Poor in Yangon',
    location_type: 'coverage',
    description: 'Low-income urban communities in Yangon metropolitan area',
    coverage_scope: 'local',
    city: 'Yangon',
    state_region_name: 'Yangon Region',
    location_reach: '2', // Beneficiaries live here
    exactness: '2', // Approximate
    location_class: '2', // Settlement
    admin_level: '4', // Ward level
    admin_code: 'MMR013D001W001',
    percentage_allocation: 20,
    is_sensitive: true, // Sensitive due to poverty data
  },
];

/**
 * Add sample locations to an activity for testing
 * @param activityId - The activity ID to add locations to
 * @param userId - The user ID creating the locations
 * @returns Promise with results
 */
export async function addSampleLocations(
  activityId: string,
  userId: string
): Promise<{
  success: boolean;
  added: number;
  errors: string[];
}> {
  const results = {
    success: true,
    added: 0,
    errors: [] as string[],
  };

  try {
    const supabase = getSupabaseAdmin();

    for (const [index, sampleLocation] of SAMPLE_LOCATIONS.entries()) {
      try {
        const locationData = {
          activity_id: activityId,
          location_name: sampleLocation.location_name,
          location_type: sampleLocation.location_type,
          description: sampleLocation.description,
          location_description: sampleLocation.location_description,
          activity_location_description: sampleLocation.activity_location_description,
          created_by: userId,
          updated_by: userId,
          source: 'manual',
          is_sensitive: sampleLocation.is_sensitive || false,

          // Site-specific fields
          ...(sampleLocation.location_type === 'site' && {
            latitude: sampleLocation.latitude,
            longitude: sampleLocation.longitude,
            address: sampleLocation.address,
            address_line1: sampleLocation.address_line1,
            city: sampleLocation.city,
            postal_code: sampleLocation.postal_code,
            site_type: sampleLocation.site_type || 'project_site',
            state_region_name: sampleLocation.state_region_name,
            township_name: sampleLocation.township_name,
          }),

          // Coverage-specific fields
          ...(sampleLocation.location_type === 'coverage' && {
            coverage_scope: sampleLocation.coverage_scope,
            state_region_name: sampleLocation.state_region_name,
          }),

          // IATI fields
          location_reach: sampleLocation.location_reach,
          exactness: sampleLocation.exactness,
          location_class: sampleLocation.location_class,
          feature_designation: sampleLocation.feature_designation,
          location_id_vocabulary: sampleLocation.location_id_vocabulary,
          location_id_code: sampleLocation.location_id_code,
          admin_level: sampleLocation.admin_level,
          admin_code: sampleLocation.admin_code,
          percentage_allocation: sampleLocation.percentage_allocation,
        };

        const { error } = await supabase
          .from('activity_locations')
          .insert(locationData);

        if (error) {
          results.errors.push(`Location ${index + 1} (${sampleLocation.location_name}): ${error.message}`);
          results.success = false;
        } else {
          results.added++;
        }
      } catch (error) {
        results.errors.push(`Location ${index + 1} (${sampleLocation.location_name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.success = false;
      }
    }

    return results;
  } catch (error) {
    results.success = false;
    results.errors.push(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return results;
  }
}

/**
 * Clear all sample locations for an activity
 * @param activityId - The activity ID to clear locations from
 * @returns Promise with results
 */
export async function clearSampleLocations(activityId: string): Promise<{
  success: boolean;
  deleted: number;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdmin();

    const { count, error } = await supabase
      .from('activity_locations')
      .delete({ count: 'exact' })
      .eq('activity_id', activityId);

    if (error) {
      return {
        success: false,
        deleted: 0,
        error: error.message,
      };
    }

    return {
      success: true,
      deleted: count || 0,
    };
  } catch (error) {
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get sample locations statistics
 * @param activityId - The activity ID to get statistics for
 * @returns Promise with statistics
 */
export async function getSampleLocationsStats(activityId: string): Promise<{
  total: number;
  site: number;
  coverage: number;
  withCoordinates: number;
  percentageAllocated: number;
  validationErrors: number;
}> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: locations, error } = await supabase
      .from('activity_locations')
      .select('*')
      .eq('activity_id', activityId);

    if (error) {
      throw error;
    }

    if (!locations || locations.length === 0) {
      return {
        total: 0,
        site: 0,
        coverage: 0,
        withCoordinates: 0,
        percentageAllocated: 0,
        validationErrors: 0,
      };
    }

    const site = locations.filter(loc => loc.location_type === 'site').length;
    const coverage = locations.filter(loc => loc.location_type === 'coverage').length;
    const withCoordinates = locations.filter(loc => loc.latitude && loc.longitude).length;
    const percentageAllocated = locations.reduce((total, loc) => total + (loc.percentage_allocation || 0), 0);
    const validationErrors = locations.filter(loc => loc.validation_status === 'error').length;

    return {
      total: locations.length,
      site,
      coverage,
      withCoordinates,
      percentageAllocated,
      validationErrors,
    };
  } catch (error) {
    console.error('Error getting sample locations stats:', error);
    return {
      total: 0,
      site: 0,
      coverage: 0,
      withCoordinates: 0,
      percentageAllocated: 0,
      validationErrors: 0,
    };
  }
}
