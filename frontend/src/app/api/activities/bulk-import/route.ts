import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  console.log('[AIMS] POST /api/activities/bulk-import - Starting bulk import');
  
  try {
    const { activities } = await request.json();
    
    if (!activities || !Array.isArray(activities)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected array of activities.' },
        { status: 400 }
      );
    }

    console.log(`[AIMS] Processing bulk import for ${activities.length} activities`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each activity
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      
      try {
        // Generate a unique ID for the activity
        const id = crypto.randomUUID();
        
        // Extract user info for logging
        const user = activity.user;
        delete activity.user; // Don't save user info in activity
        
        // Prepare activity data
        const activityData = {
          id,
          ...activity,
          submissionStatus: 'draft',
          publicationStatus: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          organizationId: user?.organizationId,
          createdBy: user?.id || null
        };

        // Save sectors separately if provided
        const sectors = activityData.sectors || [];
        delete activityData.sectors;

        // Save tags separately if provided  
        const tags = activityData.tags || [];
        delete activityData.tags;

        // Insert the activity
        const { data: insertedActivity, error } = await supabaseAdmin
          .from('activities')
          .insert(activityData)
          .select()
          .single();

        if (error) {
          console.error(`[AIMS] Error inserting activity ${i + 1}:`, error);
          results.failed++;
          results.errors.push({
            row: i + 1,
            title: activity.title,
            error: error.message
          });
          continue;
        }

        // Insert sectors if any
        if (sectors.length > 0 && insertedActivity) {
          const sectorData = sectors.map((sector: any) => ({
            activityId: insertedActivity.id,
            name: sector.name,
            percentage: sector.percentage || 100 / sectors.length,
            vocabulary: '1', // IATI default
            code: sector.code || null
          }));

          const { error: sectorError } = await supabaseAdmin
            .from('activity_sectors')
            .insert(sectorData);

          if (sectorError) {
            console.error(`[AIMS] Error inserting sectors for activity ${i + 1}:`, sectorError);
          }
        }

        // Insert tags if any
        if (tags.length > 0 && insertedActivity) {
          // First, ensure tags exist in the tags table
          for (const tagName of tags) {
            const { data: existingTag } = await supabaseAdmin
              .from('tags')
              .select('id')
              .eq('name', tagName)
              .single();

            if (!existingTag) {
              // Create the tag
              const { data: newTag } = await supabaseAdmin
                .from('tags')
                .insert({ name: tagName, vocabulary: '99' }) // 99 for user-defined
                .select()
                .single();

              if (newTag) {
                // Link tag to activity
                await supabaseAdmin
                  .from('activity_tags')
                  .insert({ activityId: insertedActivity.id, tagId: newTag.id });
              }
            } else {
              // Link existing tag to activity
              await supabaseAdmin
                .from('activity_tags')
                .insert({ activityId: insertedActivity.id, tagId: existingTag.id });
            }
          }
        }

        // Log the activity creation
        if (user && insertedActivity) {
          ActivityLogger.activityCreated(insertedActivity, user);
        }

        results.success++;
      } catch (error: any) {
        console.error(`[AIMS] Error processing activity ${i + 1}:`, error);
        results.failed++;
        results.errors.push({
          row: i + 1,
          title: activity.title || 'Unknown',
          error: error.message || 'Unknown error'
        });
      }
    }

    console.log(`[AIMS] Bulk import completed. Success: ${results.success}, Failed: ${results.failed}`);

    return NextResponse.json({
      message: 'Bulk import completed',
      success: results.success,
      failed: results.failed,
      errors: results.errors,
      total: activities.length
    });

  } catch (error) {
    console.error('[AIMS] Bulk import error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    );
  }
} 