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
    const { user } = await request.json();
    
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
    
    // Check if user can submit
    const canSubmit = user.role === 'gov_partner_tier_2' || user.role === 'dev_partner_tier_2';
    if (!canSubmit) {
      return NextResponse.json(
        { error: 'You do not have permission to submit activities' },
        { status: 403 }
      );
    }

    // Update submission status
    activity.submissionStatus = 'submitted';
    activity.submittedBy = user.id;
    activity.submittedByName = user.name;
    activity.submittedAt = new Date().toISOString();
    activity.updatedAt = new Date().toISOString();

    // Save activities
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(activities, null, 2));

    console.log(`[AIMS] Activity ${id} submitted for validation by ${user.name}`);
    
    return NextResponse.json(activity);
  } catch (error) {
    console.error('[AIMS] Error submitting activity:', error);
    return NextResponse.json(
      { error: 'Failed to submit activity' },
      { status: 500 }
    );
  }
} 