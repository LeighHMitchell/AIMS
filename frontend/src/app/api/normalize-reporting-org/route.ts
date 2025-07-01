import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // Check if reporting_org_id column exists
    const { data: columnCheck, error: columnCheckError } = await supabase
      .from('activities')
      .select('reporting_org_id')
      .limit(1);

    if (columnCheckError && columnCheckError.message.includes('column')) {
      return NextResponse.json({
        status: 'not_migrated',
        message: 'reporting_org_id column does not exist. Run the SQL migration first.',
        sqlFile: 'add_reporting_org_normalization.sql'
      });
    }

    // Get statistics
    const { count: totalActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true });

    const { count: nullReportingOrg } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .is('reporting_org_id', null);

    const { count: withCreatedByOrg } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .not('created_by_org', 'is', null)
      .is('reporting_org_id', null);

    return NextResponse.json({
      status: 'ready',
      message: 'Migration status check completed',
      statistics: {
        totalActivities: totalActivities || 0,
        activitiesWithNullReportingOrg: nullReportingOrg || 0,
        activitiesNeedingMigration: withCreatedByOrg || 0,
        migrationProgress: totalActivities ? 
          ((totalActivities - (nullReportingOrg || 0)) / totalActivities * 100).toFixed(2) + '%' : '0%'
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check migration status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Unable to connect to database' },
        { status: 500 }
      );
    }

    // Note: This uses admin privileges, so it should be protected by authentication middleware
    // or called only from admin-protected routes

    let updatedCount = 0;
    let nullCount = 0;

    // Step 1: Check if reporting_org_id column exists
    const { data: columnCheck, error: columnCheckError } = await supabase
      .from('activities')
      .select('reporting_org_id')
      .limit(1);

    // If column doesn't exist, we need to run the SQL migration first
    if (columnCheckError && columnCheckError.message.includes('column')) {
      return NextResponse.json({ 
        error: 'reporting_org_id column does not exist', 
        details: 'Please run the SQL migration file add_reporting_org_normalization.sql first' 
      }, { status: 400 });
    }

    // Step 2: Get activities that need updating
    const { data: activitiesToUpdate, error: fetchError } = await supabase
      .from('activities')
      .select('id, created_by_org')
      .not('created_by_org', 'is', null)
      .is('reporting_org_id', null);

    if (fetchError) {
      console.error('Error fetching activities:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch activities', 
        details: fetchError.message 
      }, { status: 500 });
    }

    // Step 3: Get valid organization IDs
    const { data: validOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id');

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return NextResponse.json({ 
        error: 'Failed to fetch organizations', 
        details: orgsError.message 
      }, { status: 500 });
    }

    const validOrgIds = new Set(validOrgs?.map((org: { id: string }) => org.id) || []);

    // Step 4: Update activities in batches
    const batchSize = 100;
    const updates = activitiesToUpdate?.filter((activity: { created_by_org: string }) => 
      validOrgIds.has(activity.created_by_org)
    ) || [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const activity of batch) {
        const { error: updateError } = await supabase
          .from('activities')
          .update({ 
            reporting_org_id: activity.created_by_org,
            updated_at: new Date().toISOString()
          })
          .eq('id', activity.id);

        if (updateError) {
          console.error(`Error updating activity ${activity.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    // Step 5: Count remaining NULL values
    const { count, error: countError } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .is('reporting_org_id', null);

    if (!countError) {
      nullCount = count || 0;
    }

    // Return success with statistics
    return NextResponse.json({
      success: true,
      message: 'Reporting org normalization completed successfully',
      statistics: {
        activitiesWithNullReportingOrg: nullCount,
        updatedActivities: updatedCount
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 