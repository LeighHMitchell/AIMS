import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    console.log('[Policy Markers Migration] Starting migration...');
    
    const migrationQueries = [
      // Step 1: Update marker_type constraint to include 'custom'
      `ALTER TABLE policy_markers DROP CONSTRAINT IF EXISTS policy_markers_marker_type_check;`,
      
      `ALTER TABLE policy_markers ADD CONSTRAINT policy_markers_marker_type_check 
        CHECK (marker_type IN ('environmental', 'social_governance', 'other', 'custom'));`,
      
      // Step 2: Add IATI-compliant columns if they don't exist
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary TEXT DEFAULT '1';`,
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS vocabulary_uri TEXT;`,
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS iati_code TEXT;`,
      `ALTER TABLE policy_markers ADD COLUMN IF NOT EXISTS is_iati_standard BOOLEAN DEFAULT false;`,
      
      // Step 3: Create indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_policy_markers_vocabulary ON policy_markers(vocabulary);`,
      `CREATE INDEX IF NOT EXISTS idx_policy_markers_iati_code ON policy_markers(iati_code);`,
      `CREATE INDEX IF NOT EXISTS idx_policy_markers_is_iati_standard ON policy_markers(is_iati_standard);`,
      `CREATE INDEX IF NOT EXISTS idx_policy_markers_marker_type ON policy_markers(marker_type);`,
    ];

    const results = [];
    
    for (const query of migrationQueries) {
      try {
        console.log(`[Policy Markers Migration] Executing: ${query.substring(0, 80)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        
        if (error) {
          console.error(`[Policy Markers Migration] Error in query: ${error.message}`);
          results.push({ 
            query: query.substring(0, 80) + '...', 
            success: false, 
            error: error.message 
          });
        } else {
          console.log(`[Policy Markers Migration] ✅ Success`);
          results.push({ 
            query: query.substring(0, 80) + '...', 
            success: true 
          });
        }
      } catch (err) {
        console.error(`[Policy Markers Migration] Exception:`, err);
        results.push({ 
          query: query.substring(0, 80) + '...', 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    // Step 4: Handle score -> significance column migration
    try {
      console.log('[Policy Markers Migration] Checking for score column migration...');
      
      // Check if score column exists
      const { data: columns } = await supabase.rpc('exec_sql', { 
        sql: `SELECT column_name FROM information_schema.columns 
              WHERE table_name = 'activity_policy_markers' 
              AND column_name IN ('score', 'significance');`
      });
      
      if (columns && columns.length > 0) {
        const columnNames = columns.map((row: any) => row.column_name);
        
        if (columnNames.includes('score') && !columnNames.includes('significance')) {
          console.log('[Policy Markers Migration] Renaming score to significance...');
          
          const renameQueries = [
            `ALTER TABLE activity_policy_markers RENAME COLUMN score TO significance;`,
            `ALTER TABLE activity_policy_markers DROP CONSTRAINT IF EXISTS activity_policy_markers_score_check;`,
            `ALTER TABLE activity_policy_markers ADD CONSTRAINT activity_policy_markers_significance_check 
              CHECK (significance IN (0, 1, 2, 3, 4));`
          ];
          
          for (const query of renameQueries) {
            const { error } = await supabase.rpc('exec_sql', { sql: query });
            if (error) {
              console.error(`[Policy Markers Migration] Error in rename: ${error.message}`);
              results.push({ 
                query: query.substring(0, 80) + '...', 
                success: false, 
                error: error.message 
              });
            } else {
              results.push({ 
                query: query.substring(0, 80) + '...', 
                success: true 
              });
            }
          }
        } else if (columnNames.includes('significance')) {
          console.log('[Policy Markers Migration] ✅ significance column already exists');
          results.push({ 
            query: 'Check significance column exists', 
            success: true, 
            note: 'Column already exists' 
          });
        }
      }
    } catch (err) {
      console.error('[Policy Markers Migration] Error checking columns:', err);
      results.push({ 
        query: 'Check/rename score column', 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }

    // Step 5: Insert IATI standard policy markers
    try {
      console.log('[Policy Markers Migration] Inserting IATI standard policy markers...');
      
      const iatiMarkers = [
        `('1', 'Gender Equality', 'Activities that have gender equality and women''s empowerment as policy objectives', 'social_governance', '1', '1', true, true, 1)`,
        `('2', 'Aid to Environment', 'Activities that support environmental protection or enhancement', 'environmental', '1', '2', true, true, 2)`,
        `('3', 'Participatory Development/Good Governance', 'Activities that support democratic governance, civil society and participatory development', 'social_governance', '1', '3', true, true, 3)`,
        `('4', 'Trade Development', 'Activities that support trade development and trade capacity building', 'other', '1', '4', true, true, 4)`,
        `('5', 'Aid Targeting the Objectives of the Convention on Biological Diversity', 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', 'environmental', '1', '5', true, true, 5)`,
        `('6', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation', 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', 'environmental', '1', '6', true, true, 6)`,
        `('7', 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation', 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', 'environmental', '1', '7', true, true, 7)`,
        `('8', 'Aid Targeting the Objectives of the Convention to Combat Desertification', 'Activities that combat desertification or mitigate effects of drought', 'environmental', '1', '8', true, true, 8)`,
        `('9', 'Reproductive, Maternal, Newborn and Child Health (RMNCH)', 'Activities that target reproductive, maternal, newborn and child health objectives', 'other', '1', '9', true, true, 9)`,
        `('10', 'Disaster Risk Reduction (DRR)', 'Activities that reduce disaster risk and build resilience to natural and human-induced hazards', 'other', '1', '10', true, true, 10)`,
        `('11', 'Disability', 'Activities that promote the rights and inclusion of persons with disabilities', 'social_governance', '1', '11', true, true, 11)`,
        `('12', 'Nutrition', 'Activities that address nutrition objectives and food security', 'social_governance', '1', '12', true, true, 12)`
      ];

      const insertQuery = `
        INSERT INTO policy_markers (code, name, description, marker_type, vocabulary, iati_code, is_iati_standard, is_active, display_order) VALUES
        ${iatiMarkers.join(',\n')}
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          marker_type = EXCLUDED.marker_type,
          vocabulary = EXCLUDED.vocabulary,
          iati_code = EXCLUDED.iati_code,
          is_iati_standard = EXCLUDED.is_iati_standard,
          is_active = EXCLUDED.is_active,
          display_order = EXCLUDED.display_order,
          updated_at = NOW();
      `;

      const { error: insertError } = await supabase.rpc('exec_sql', { sql: insertQuery });
      
      if (insertError) {
        console.error('[Policy Markers Migration] Error inserting IATI markers:', insertError.message);
        results.push({ 
          query: 'Insert IATI standard markers', 
          success: false, 
          error: insertError.message 
        });
      } else {
        console.log('[Policy Markers Migration] ✅ IATI markers inserted/updated');
        results.push({ 
          query: 'Insert IATI standard markers', 
          success: true 
        });
      }
    } catch (err) {
      console.error('[Policy Markers Migration] Error with IATI markers:', err);
      results.push({ 
        query: 'Insert IATI standard markers', 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`[Policy Markers Migration] Completed: ${successCount}/${totalCount} successful`);

    return NextResponse.json({
      success: successCount === totalCount,
      message: `Policy markers migration completed: ${successCount}/${totalCount} operations successful`,
      results: results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error) {
    console.error('[Policy Markers Migration] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed with unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}






































