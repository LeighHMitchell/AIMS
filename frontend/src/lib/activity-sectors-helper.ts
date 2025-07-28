import { getSupabaseAdmin } from './supabase';
import { getCategoryInfo, getCleanSectorName } from './dac-sector-utils';

export interface SectorPayload {
  id?: string;
  code: string;
  name: string;
  percentage: number;
  level?: 'group' | 'sector' | 'subsector';
  category?: string;
  categoryName?: string;
  categoryCode?: string;
  type?: string;
  categoryPercentage?: number;
  [key: string]: any; // Allow additional properties for flexibility
}

/**
 * Upserts activity sectors by replacing all existing sectors with new ones
 * @param activityId - The activity ID to update sectors for
 * @param sectors - Array of sectors to save
 * @throws Error if the operation fails
 */
export async function upsertActivitySectors(activityId: string, sectors: SectorPayload[]) {
  const supabase = getSupabaseAdmin();
  
  console.log('[AIMS] === UPSERT ACTIVITY SECTORS DEBUG ===');
  console.log('[AIMS] Activity ID:', activityId);
  console.log('[AIMS] Number of sectors to save:', sectors?.length || 0);
  console.log('[AIMS] Sectors to save:', JSON.stringify(sectors, null, 2));
  
  // Validate input
  if (!activityId) {
    throw new Error('Activity ID is required for sector upsert');
  }
  
  if (!sectors || !Array.isArray(sectors)) {
    console.error('[AIMS] Invalid sectors data - expected array, got:', typeof sectors);
    throw new Error('Sectors must be an array');
  }

  try {
    // Delete existing sectors for this activity
    const { error: deleteError } = await supabase
      .from('activity_sectors')
      .delete()
      .eq('activity_id', activityId);
    
    if (deleteError) {
      console.error('[AIMS] Error deleting existing sectors:', deleteError);
      throw deleteError;
    }
    
    console.log('[AIMS] Successfully deleted existing sectors');

    // Insert new sector allocations
    if (sectors && sectors.length > 0) {
      const formatted = sectors.map(sector => {
        // Use the provided category information or fall back to code-based detection
        const categoryCode = sector.categoryCode || sector.code.substring(0, 3);
        const categoryName = sector.categoryName || sector.category || `Category ${categoryCode}`;
        
        // Clean the sector name (remove code prefix if present)
        const cleanSectorName = getCleanSectorName(sector.name);
        
        console.log(`[AIMS] Processing sector: ${sector.code} (${sector.name}) - Level: ${sector.level || 'unknown'}`);
        console.log(`[AIMS] Category mapping: ${categoryCode} -> ${categoryName}`);
        
        // Determine hierarchy level based on code length or provided level
        // Map frontend levels to database levels
        let level: string | undefined = sector.level;
        if (level === 'category') {
          level = 'sector'; // Categories are stored as 'sector' level in database
        } else if (!level) {
          // Auto-detect based on code length
          if (sector.code.length === 3 && sector.code.endsWith('0')) {
            level = 'group';
          } else if (sector.code.length === 3) {
            level = 'sector'; // 3-digit non-group codes are categories (stored as sector)
          } else if (sector.code.length === 5) {
            level = 'subsector';
          } else {
            level = 'sector'; // Default fallback
          }
        }
        
        // Map to the simplified schema
        const mappedSector = {
          activity_id: activityId,
          
          // Core sector information (required)
          sector_code: sector.code,
          sector_name: cleanSectorName,
          percentage: sector.percentage,
          
          // Hierarchy level
          level: level,
          
          // Category information (optional but helpful)
          category_code: categoryCode,
          category_name: categoryName,
          
          // Metadata
          type: sector.type || 'secondary',
          user_id: null // Will be set by the API if user info is available
        };
        
        console.log(`[AIMS] Mapped sector object:`, mappedSector);
        return mappedSector;
      });

      console.log('[AIMS] Inserting formatted sectors:', JSON.stringify(formatted, null, 2));

      // Check for duplicate sector codes in the input
      const sectorCodes = formatted.map(s => s.sector_code);
      const duplicateCodes = sectorCodes.filter((code, index) => sectorCodes.indexOf(code) !== index);
      if (duplicateCodes.length > 0) {
        console.error('[AIMS] ERROR: Duplicate sector codes detected in input:', duplicateCodes);
        throw new Error(`Duplicate sector codes detected: ${duplicateCodes.join(', ')}`);
      }

      const { error: insertError, data: insertedData } = await supabase
        .from('activity_sectors')
        .insert(formatted)
        .select();

      if (insertError) {
        console.error('[AIMS] === INSERT ERROR DETAILS ===');
        console.error('[AIMS] Error code:', insertError.code);
        console.error('[AIMS] Error message:', insertError.message);
        console.error('[AIMS] Full error object:', JSON.stringify(insertError, null, 2));
        console.error('[AIMS] Data that failed to insert:', JSON.stringify(formatted, null, 2));
        
        // Handle specific error types
        if (insertError.code === '42703') {
          console.error('[AIMS] COLUMN NOT FOUND ERROR - Database schema may need updating');
          console.error('[AIMS] This usually means the activity_sectors table is missing required columns');
          throw new Error(`Database schema error: Column not found. Please check if activity_sectors table has all required columns. Details: ${insertError.message}`);
        }
        
        if (insertError.code === '42P01') {
          console.error('[AIMS] TABLE NOT FOUND ERROR - activity_sectors table does not exist');
          throw new Error(`Table not found: activity_sectors table does not exist in the database. Please run the database migrations.`);
        }
        
        // If batch insert failed, try inserting one by one to identify the problematic sector
        if (insertError.code === '23505') {
          console.log('[AIMS] Unique constraint violation - attempting individual inserts to identify issue');
          const successfulInserts = [];
          const failedInserts = [];
          
          for (const sector of formatted) {
            const { error: singleError, data: singleData } = await supabase
              .from('activity_sectors')
              .insert([sector])
              .select()
              .single();
              
            if (singleError) {
              console.error(`[AIMS] Failed to insert sector ${sector.sector_code}:`, singleError.message);
              failedInserts.push({ sector: sector.sector_code, error: singleError.message });
            } else {
              console.log(`[AIMS] Successfully inserted sector ${sector.sector_code}`);
              successfulInserts.push(singleData);
            }
          }
          
          console.log(`[AIMS] Individual insert results: ${successfulInserts.length} succeeded, ${failedInserts.length} failed`);
          if (failedInserts.length > 0) {
            console.error('[AIMS] Failed sectors:', failedInserts);
          }
          
          // Return the successful inserts even if some failed
          return successfulInserts;
        }
        
        throw new Error(`Failed to insert sectors: ${insertError.message} (Code: ${insertError.code})`);
      }
      
      console.log('[AIMS] Successfully inserted', insertedData?.length || 0, 'sectors');
      return insertedData;
    }
    
    return [];
  } catch (error) {
    console.error('[AIMS] Error in upsertActivitySectors:', error);
    throw error;
  }
}

/**
 * Validates that sector allocations total 100%
 * @param sectors - Array of sectors to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSectorAllocation(sectors: SectorPayload[]): { isValid: boolean; error?: string } {
  if (!sectors || sectors.length === 0) {
    return { isValid: true }; // Empty sectors is valid (no allocation)
  }
  
  const total = sectors.reduce((sum, sector) => sum + (sector.percentage || 0), 0);
  
  if (Math.abs(total - 100) > 0.01) { // Allow for small floating point errors
    return { 
      isValid: false, 
      error: `Total sector allocation must equal 100%. Current total: ${total}%` 
    };
  }
  
  return { isValid: true };
}

/**
 * Validates category-level allocations
 * @param sectors - Array of sectors to validate
 * @returns Object with category validation results
 */
export function validateCategoryAllocations(sectors: SectorPayload[]): { 
  isValid: boolean; 
  categoryTotals: { [categoryCode: string]: number };
  errors: string[] 
} {
  const categoryTotals: { [categoryCode: string]: number } = {};
  const errors: string[] = [];
  
  // Group sectors by category and sum percentages
  sectors.forEach(sector => {
    const categoryCode = sector.categoryCode || sector.code.substring(0, 3);
    categoryTotals[categoryCode] = (categoryTotals[categoryCode] || 0) + (sector.categoryPercentage || sector.percentage || 0);
  });
  
  // Check if each category totals 100%
  Object.entries(categoryTotals).forEach(([categoryCode, total]) => {
    if (Math.abs(total - 100) > 0.01) {
      errors.push(`Category ${categoryCode} allocation is ${total.toFixed(1)}% (must equal 100%)`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    categoryTotals,
    errors
  };
}