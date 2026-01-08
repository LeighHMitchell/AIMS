import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'activities.json');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, action, reason } = await request.json();
    
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'User information required' },
        { status: 401 }
      );
    }

    // Load activities
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    const activities = JSON.parse(data);
    
    // Find the activity
    const activityIndex = activities.findIndex((a: any) => a.id === id);
    if (activityIndex === -1) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activity = activities[activityIndex];
    
    // Check if user can validate (Tier 1 Government users)
    const canValidate = user.role === 'gov_partner_tier_1' || user.role === 'super_user';
    if (!canValidate) {
      return NextResponse.json(
        { error: 'You do not have permission to validate activities' },
        { status: 403 }
      );
    }

    // Update status based on action
    if (action === 'approve') {
      activity.submissionStatus = 'validated';
      activity.validatedBy = user.id;
      activity.validatedByName = user.name;
      activity.validatedAt = new Date().toISOString();
    } else if (action === 'reject') {
      activity.submissionStatus = 'rejected';
      activity.rejectedBy = user.id;
      activity.rejectedByName = user.name;
      activity.rejectedAt = new Date().toISOString();
      activity.rejectionReason = reason || 'No reason provided';
    }
    
    activity.updatedAt = new Date().toISOString();

    // Save activities
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(activities, null, 2));

    console.log(`[AIMS] Activity ${id} ${action}ed by ${user.name}`);
    
    return NextResponse.json(activity);
  } catch (error) {
    console.error('[AIMS] Error validating activity:', error);
    return NextResponse.json(
      { error: 'Failed to validate activity' },
      { status: 500 }
    );
  }
} 