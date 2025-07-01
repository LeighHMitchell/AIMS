import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    console.log('[TEST] Testing table existence...');
    
    // Test tags table
    const { data: tagsTest, error: tagsError } = await supabase
      .from('tags')
      .select('count(*)')
      .limit(1);
    
    // Test policy_markers table
    const { data: policyMarkersTest, error: policyMarkersError } = await supabase
      .from('policy_markers')
      .select('count(*)')
      .limit(1);
    
    // Test activity_tags table
    const { data: activityTagsTest, error: activityTagsError } = await supabase
      .from('activity_tags')
      .select('count(*)')
      .limit(1);
    
    // Test activity_policy_markers table
    const { data: activityPolicyMarkersTest, error: activityPolicyMarkersError } = await supabase
      .from('activity_policy_markers')
      .select('count(*)')
      .limit(1);
    
    return NextResponse.json({
      tables: {
        tags: {
          exists: !tagsError,
          error: tagsError?.message,
          data: tagsTest
        },
        policy_markers: {
          exists: !policyMarkersError,
          error: policyMarkersError?.message,
          data: policyMarkersTest
        },
        activity_tags: {
          exists: !activityTagsError,
          error: activityTagsError?.message,
          data: activityTagsTest
        },
        activity_policy_markers: {
          exists: !activityPolicyMarkersError,
          error: activityPolicyMarkersError?.message,
          data: activityPolicyMarkersTest
        }
      }
    });
    
  } catch (error) {
    console.error('[TEST] Error testing tables:', error);
    return NextResponse.json(
      { error: 'Failed to test tables', details: error },
      { status: 500 }
    );
  }
}