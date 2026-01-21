import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const { reporting_org_id } = await request.json();
    
    console.log('[AIMS] Reporting org update request:', { activityId: id, reporting_org_id });
    
    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Get the organization details to update the display fields
    let organizationData = null;
    if (reporting_org_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name, acronym, logo')
        .eq('id', reporting_org_id)
        .single();

      if (orgError) {
        console.error('[AIMS] Error fetching organization:', orgError);
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
      organizationData = orgData;
    }

    // Update the activity with the new reporting organization
    const updateData: any = {
      reporting_org_id: reporting_org_id || null,
      updated_at: new Date().toISOString()
    };

    // Update display fields if organization is selected
    if (organizationData) {
      updateData.created_by_org_name = organizationData.name;
      updateData.created_by_org_acronym = organizationData.acronym;
    } else {
      // Clear display fields if no organization selected
      updateData.created_by_org_name = null;
      updateData.created_by_org_acronym = null;
    }

    console.log('[AIMS] Updating activity with data:', updateData);
    const { error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[AIMS] Error updating reporting organization:', updateError);
      return NextResponse.json(
        { error: 'Failed to update reporting organization', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Reporting organization updated successfully',
      data: {
        reporting_org_id,
        created_by_org_name: organizationData?.name || null,
        created_by_org_acronym: organizationData?.acronym || null
      }
    });

  } catch (error) {
    console.error('[AIMS] Error in reporting organization API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
