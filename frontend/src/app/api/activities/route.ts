import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('[AIMS API] Received body.contacts:', body.contacts);
    console.log('[AIMS API] Contacts count:', body.contacts?.length || 0);
    
    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Activity title is required' },
        { status: 400 }
      );
    }

    // If we have an ID, this is an update
    if (body.id) {
      // Fetch existing activity
      const { data: existingActivity, error: fetchError } = await supabaseAdmin
        .from('activities')
        .select('*')
        .eq('id', body.id)
        .single();

      if (fetchError || !existingActivity) {
        return NextResponse.json(
          { error: 'Activity not found' },
          { status: 404 }
        );
      }
      
      // Track changes for activity logging
      const changes: any[] = [];
      if (existingActivity.title !== body.title && body.title) {
        changes.push({ field: 'title', oldValue: existingActivity.title, newValue: body.title });
      }
      if (existingActivity.activity_status !== body.activityStatus && body.activityStatus) {
        changes.push({ field: 'activityStatus', oldValue: existingActivity.activity_status, newValue: body.activityStatus });
      }
      if (existingActivity.publication_status !== body.publicationStatus && body.publicationStatus) {
        changes.push({ field: 'publicationStatus', oldValue: existingActivity.publication_status, newValue: body.publicationStatus });
      }

      // Prepare update data
      const updateData = {
        partner_id: body.partnerId,
        iati_id: body.iatiId,
        title: body.title,
        description: body.description,
        objectives: body.objectives,
        target_groups: body.targetGroups,
        collaboration_type: body.collaborationType,
        activity_status: body.activityStatus || existingActivity.activity_status,
        publication_status: body.publicationStatus || existingActivity.publication_status,
        submission_status: body.submissionStatus || existingActivity.submission_status,
        banner: body.banner !== undefined ? body.banner : existingActivity.banner,
        created_by_org: body.createdByOrg !== undefined ? body.createdByOrg : existingActivity.created_by_org,
        planned_start_date: body.plannedStartDate,
        planned_end_date: body.plannedEndDate,
        actual_start_date: body.actualStartDate,
        actual_end_date: body.actualEndDate,
        last_edited_by: body.user?.id,
      };

      // Update activity
      const { data: updatedActivity, error: updateError } = await supabaseAdmin
        .from('activities')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single();

      if (updateError) {
        console.error('[AIMS] Error updating activity:', updateError);
        return NextResponse.json(
          { error: 'Failed to update activity' },
          { status: 500 }
        );
      }

      // Handle sectors
      if (body.sectors) {
        // Delete existing sectors
        await supabaseAdmin
          .from('activity_sectors')
          .delete()
          .eq('activity_id', body.id);

        // Insert new sectors
        if (body.sectors.length > 0) {
          const sectorsData = body.sectors.map((sector: any) => ({
            activity_id: body.id,
            sector_code: sector.code,
            sector_name: sector.name,
            percentage: sector.percentage
          }));

          await supabaseAdmin
            .from('activity_sectors')
            .insert(sectorsData);
        }
      }

      // Handle transactions
      if (body.transactions) {
        // For simplicity, we'll delete and re-insert transactions
        // In production, you might want to update existing ones
        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('activity_id', body.id);

        if (body.transactions.length > 0) {
          const transactionsData = body.transactions.map((transaction: any) => ({
            activity_id: body.id,
            organization_id: body.createdByOrg,
            transaction_type: transaction.type,
            provider_org: transaction.providerOrg,
            receiver_org: transaction.receiverOrg,
            value: transaction.value,
            currency: transaction.currency || 'USD',
            transaction_date: transaction.transactionDate,
            description: transaction.description
          }));

          await supabaseAdmin
            .from('transactions')
            .insert(transactionsData);
        }
      }
      
      // Log the activity changes
      if (body.user) {
        // Log each field change
        for (const change of changes) {
          await ActivityLogger.activityEdited(
            updatedActivity,
            body.user,
            change.field,
            change.oldValue,
            change.newValue
          );
        }
        
        // Log publication status changes
        if (existingActivity.publication_status !== updatedActivity.publication_status) {
          if (updatedActivity.publication_status === 'published') {
            await ActivityLogger.activityPublished(updatedActivity, body.user);
          } else if (existingActivity.publication_status === 'published') {
            await ActivityLogger.activityUnpublished(updatedActivity, body.user);
          }
        }
      }
      
      console.log('[AIMS] Updated activity:', updatedActivity);
      return NextResponse.json(updatedActivity);
    }

    // Otherwise, create new activity
    const insertData = {
      partner_id: body.partnerId,
      iati_id: body.iatiId,
      title: body.title,
      description: body.description,
      objectives: body.objectives,
      target_groups: body.targetGroups,
      collaboration_type: body.collaborationType,
      activity_status: body.activityStatus || 'planning',
      publication_status: body.publicationStatus || 'draft',
      submission_status: body.submissionStatus || 'draft',
      banner: body.banner,
      created_by_org: body.createdByOrg,
      planned_start_date: body.plannedStartDate,
      planned_end_date: body.plannedEndDate,
      actual_start_date: body.actualStartDate,
      actual_end_date: body.actualEndDate,
      created_by: body.user?.id,
      last_edited_by: body.user?.id,
    };

    const { data: newActivity, error: insertError } = await supabaseAdmin
      .from('activities')
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.error('[AIMS] Error creating activity:', insertError);
      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      );
    }

    // Handle sectors
    if (body.sectors && body.sectors.length > 0) {
      const sectorsData = body.sectors.map((sector: any) => ({
        activity_id: newActivity.id,
        sector_code: sector.code,
        sector_name: sector.name,
        percentage: sector.percentage
      }));

      await supabaseAdmin
        .from('activity_sectors')
        .insert(sectorsData);
    }

    // Handle transactions
    if (body.transactions && body.transactions.length > 0) {
      const transactionsData = body.transactions.map((transaction: any) => ({
        activity_id: newActivity.id,
        organization_id: body.createdByOrg,
        transaction_type: transaction.type,
        provider_org: transaction.providerOrg,
        receiver_org: transaction.receiverOrg,
        value: transaction.value,
        currency: transaction.currency || 'USD',
        transaction_date: transaction.transactionDate,
        description: transaction.description
      }));

      await supabaseAdmin
        .from('transactions')
        .insert(transactionsData);
    }
    
    // Log the activity creation
    if (body.user) {
      await ActivityLogger.activityCreated(newActivity, body.user);
    }
    
    console.log('[AIMS] Created new activity:', newActivity);
    
    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Error saving activity:', error);
    return NextResponse.json(
      { error: 'Failed to save activity' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch activities with related data
    const { data: activities, error } = await supabaseAdmin
      .from('activities')
      .select(`
        *,
        activity_sectors (
          id,
          sector_code,
          sector_name,
          percentage
        ),
        transactions (
          id,
          transaction_type,
          provider_org,
          receiver_org,
          value,
          currency,
          transaction_date,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AIMS] Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedActivities = activities.map((activity: any) => ({
      ...activity,
      sectors: activity.activity_sectors,
      transactions: activity.transactions,
      // Map database fields to API fields
      partnerId: activity.partner_id,
      iatiId: activity.iati_id,
      targetGroups: activity.target_groups,
      collaborationType: activity.collaboration_type,
      activityStatus: activity.activity_status,
      publicationStatus: activity.publication_status,
      submissionStatus: activity.submission_status,
      createdByOrg: activity.created_by_org,
      plannedStartDate: activity.planned_start_date,
      plannedEndDate: activity.planned_end_date,
      actualStartDate: activity.actual_start_date,
      actualEndDate: activity.actual_end_date,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
    }));

    return NextResponse.json(transformedActivities);
  } catch (error) {
    console.error('[AIMS] Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }
    
    // Fetch the activity before deletion
    const { data: activity, error: fetchError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    
    // Delete the activity (cascading will handle related records)
    const { error: deleteError } = await supabaseAdmin
      .from('activities')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error("[AIMS] Error deleting activity:", deleteError);
      return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
    }
    
    // Log the activity deletion
    if (user) {
      await ActivityLogger.activityDeleted(activity, user);
    }
    
    console.log("[AIMS] Deleted activity:", activity);
    return NextResponse.json({ message: "Activity deleted successfully", activity });
  } catch (error) {
    console.error("[AIMS] Error deleting activity:", error);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
} 