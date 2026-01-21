import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {

    
    console.log('[SETUP] Starting policy markers setup...');
    
    // Insert predefined policy markers
    const policyMarkersData = [
      // Environmental (Rio Markers)
      { code: 'climate_mitigation', name: 'Climate Change Mitigation', description: 'Activities that contribute to the objective of stabilization of greenhouse gas concentrations', marker_type: 'environmental', display_order: 1 },
      { code: 'climate_adaptation', name: 'Climate Change Adaptation', description: 'Activities that intend to reduce the vulnerability of human or natural systems to climate change', marker_type: 'environmental', display_order: 2 },
      { code: 'biodiversity', name: 'Biodiversity', description: 'Activities that promote conservation, sustainable use, or access and benefit sharing of biodiversity', marker_type: 'environmental', display_order: 3 },
      { code: 'desertification', name: 'Desertification', description: 'Activities that combat desertification or mitigate effects of drought', marker_type: 'environmental', display_order: 4 },
      { code: 'environment', name: 'Aid to Environment', description: 'Activities that support environmental protection or enhancement', marker_type: 'environmental', display_order: 5 },
      
      // Social & Governance
      { code: 'gender_equality', name: 'Gender Equality', description: 'Activities that have gender equality and women\'s empowerment as policy objectives', marker_type: 'social_governance', display_order: 6 },
      { code: 'good_governance', name: 'Good Governance', description: 'Activities that support democratic governance and civil society', marker_type: 'social_governance', display_order: 7 },
      { code: 'participatory_dev', name: 'Participatory Development', description: 'Activities that emphasize stakeholder participation in design and implementation', marker_type: 'social_governance', display_order: 8 },
      { code: 'human_rights', name: 'Human Rights', description: 'Activities that support or promote human rights', marker_type: 'social_governance', display_order: 9 },
      { code: 'rule_of_law', name: 'Rule of Law', description: 'Activities that strengthen legal and judicial systems', marker_type: 'social_governance', display_order: 10 },
      { code: 'trade_development', name: 'Trade Development', description: 'Activities that build trade capacity and support trade facilitation', marker_type: 'social_governance', display_order: 11 },
      
      // Other Cross-Cutting Issues
      { code: 'disability', name: 'Disability Inclusion', description: 'Activities that promote inclusion of persons with disabilities', marker_type: 'other', display_order: 12 },
      { code: 'nutrition', name: 'Nutrition', description: 'Activities that address nutrition outcomes', marker_type: 'other', display_order: 13 },
      { code: 'peacebuilding', name: 'Peacebuilding / Conflict Sensitivity', description: 'Activities that contribute to peace and conflict prevention', marker_type: 'other', display_order: 14 },
      { code: 'rural_development', name: 'Rural Development', description: 'Activities focused on rural areas and communities', marker_type: 'other', display_order: 15 },
      { code: 'urban_development', name: 'Urban Development', description: 'Activities focused on urban areas and cities', marker_type: 'other', display_order: 16 },
      { code: 'digitalization', name: 'Digitalization / Technology', description: 'Activities that leverage digital technologies', marker_type: 'other', display_order: 17 },
      { code: 'private_sector', name: 'Private Sector Engagement', description: 'Activities that engage or strengthen private sector', marker_type: 'other', display_order: 18 }
    ];
    
    // Insert policy markers (using upsert to avoid duplicates)
    for (const marker of policyMarkersData) {
      const { error: insertError } = await supabase
        .from('policy_markers')
        .upsert(marker, { onConflict: 'code' });
      
      if (insertError) {
        console.error(`[SETUP] Error inserting policy marker ${marker.code}:`, insertError);
      }
    }
    
    console.log('[SETUP] Policy markers seeded successfully');
    
    return NextResponse.json({ 
      message: 'Tags and policy markers setup completed successfully',
      success: true 
    });
    
  } catch (error) {
    console.error('[SETUP] Error in setup:', error);
    return NextResponse.json(
      { error: 'Failed to setup tags and policy markers', details: error },
      { status: 500 }
    );
  }
}