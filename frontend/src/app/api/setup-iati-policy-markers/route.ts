import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    
    console.log('[SETUP] Starting IATI policy markers setup...');
    
    // First, add the new columns if they don't exist
    console.log('[SETUP] Adding IATI-compliant columns...');
    
    // Add new columns (will be ignored if they already exist)
    const alterQueries = [
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary TEXT DEFAULT '1';`,
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary_uri TEXT;`,
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS iati_code TEXT;`,
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS is_iati_standard BOOLEAN DEFAULT false;`,
      
      // Update activity_policy_markers table
      `ALTER TABLE activity_policy_markers ALTER COLUMN score TYPE INTEGER;`,
      `ALTER TABLE activity_policy_markers DROP CONSTRAINT IF EXISTS activity_policy_markers_score_check;`,
      `ALTER TABLE activity_policy_markers ADD CONSTRAINT activity_policy_markers_score_check CHECK (score IN (0, 1, 2, 3, 4));`
    ];
    
    for (const query of alterQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`[SETUP] Note: ${error.message} (this may be expected if columns already exist)`);
        }
      } catch (err) {
        console.log(`[SETUP] Note: Could not execute query - ${err} (this may be expected)`);
      }
    }
    
    // First, clean up existing non-IATI policy markers
    console.log('[SETUP] Cleaning up existing non-IATI policy markers...');
    const { error: deleteError } = await supabase
      .from('policy_markers')
      .delete()
      .neq('vocabulary', '1'); // Keep only IATI vocabulary markers
      
    if (deleteError) {
      console.log('[SETUP] Note: Could not clean up existing markers:', deleteError.message);
    }
    
    // Insert ONLY official IATI Policy Markers based on https://iatistandard.org/en/iati-standard/203/codelists/policymarker/
    const iatiPolicyMarkersData = [
      // IATI Code 1: Gender Equality
      { 
        code: '1', 
        name: 'Gender Equality', 
        description: '', 
        marker_type: 'social_governance', 
        vocabulary: '1', 
        iati_code: '1', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 1 
      },

      // IATI Code 2: Aid to Environment  
      { 
        code: '2', 
        name: 'Aid to Environment', 
        description: '', 
        marker_type: 'environmental', 
        vocabulary: '1', 
        iati_code: '2', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 2 
      },

      // IATI Code 3: Participatory Development/Good Governance
      { 
        code: '3', 
        name: 'Participatory Development/Good Governance', 
        description: '', 
        marker_type: 'social_governance', 
        vocabulary: '1', 
        iati_code: '3', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 3 
      },

      // IATI Code 4: Trade Development
      { 
        code: '4', 
        name: 'Trade Development', 
        description: '', 
        marker_type: 'other', 
        vocabulary: '1', 
        iati_code: '4', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 4 
      },

      // IATI Code 5: Convention on Biological Diversity
      { 
        code: '5', 
        name: 'Aid Targeting the Objectives of the Convention on Biological Diversity', 
        description: '', 
        marker_type: 'environmental', 
        vocabulary: '1', 
        iati_code: '5', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 5 
      },

      // IATI Code 6: Climate Change Mitigation
      { 
        code: '6', 
        name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation', 
        description: '', 
        marker_type: 'environmental', 
        vocabulary: '1', 
        iati_code: '6', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 6 
      },

      // IATI Code 7: Climate Change Adaptation
      { 
        code: '7', 
        name: 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation', 
        description: '', 
        marker_type: 'environmental', 
        vocabulary: '1', 
        iati_code: '7', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 7 
      },

      // IATI Code 8: Convention to Combat Desertification
      { 
        code: '8', 
        name: 'Aid Targeting the Objectives of the Convention to Combat Desertification', 
        description: '', 
        marker_type: 'environmental', 
        vocabulary: '1', 
        iati_code: '8', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 8 
      },

      // IATI Code 9: RMNCH
      { 
        code: '9', 
        name: 'Reproductive, Maternal, Newborn and Child Health (RMNCH)', 
        description: '', 
        marker_type: 'social_governance', 
        vocabulary: '1', 
        iati_code: '9', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 9 
      },

      // IATI Code 10: Disaster Risk Reduction
      { 
        code: '10', 
        name: 'Disaster Risk Reduction(DRR)', 
        description: '', 
        marker_type: 'other', 
        vocabulary: '1', 
        iati_code: '10', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 10 
      },

      // IATI Code 11: Disability
      { 
        code: '11', 
        name: 'Disability', 
        description: '', 
        marker_type: 'social_governance', 
        vocabulary: '1', 
        iati_code: '11', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 11 
      },

      // IATI Code 12: Nutrition
      { 
        code: '12', 
        name: 'Nutrition', 
        description: '', 
        marker_type: 'social_governance', 
        vocabulary: '1', 
        iati_code: '12', 
        is_iati_standard: true, 
        is_active: true, 
        display_order: 12 
      }
    ];
    
    // Insert IATI policy markers (using upsert to avoid duplicates)
    console.log('[SETUP] Inserting IATI standard policy markers...');
    for (const marker of iatiPolicyMarkersData) {
      const { error: insertError } = await supabase
        .from('policy_markers')
        .upsert(marker, { onConflict: 'code' });
      
      if (insertError) {
        console.error(`[SETUP] Error inserting IATI policy marker ${marker.code}:`, insertError);
      }
    }
    
    // No need to map existing markers - we're starting fresh with only IATI standard markers
    
    // Try to rename score column to significance (may fail if already done)
    try {
      const { error: renameError } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE activity_policy_markers RENAME COLUMN score TO significance;' 
      });
      if (renameError) {
        console.log('[SETUP] Note: Could not rename score to significance (may already be done):', renameError.message);
      }
    } catch (err) {
      console.log('[SETUP] Note: Column rename may have already been completed');
    }
    
    console.log('[SETUP] IATI policy markers setup completed successfully');
    
    return NextResponse.json({ 
      message: 'IATI policy markers setup completed successfully',
      success: true,
      markersCreated: iatiPolicyMarkersData.length
    });
    
  } catch (error) {
    console.error('[SETUP] Error in IATI policy markers setup:', error);
    return NextResponse.json(
      { error: 'Failed to setup IATI policy markers', details: error },
      { status: 500 }
    );
  }
}
