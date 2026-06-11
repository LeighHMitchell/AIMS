import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'activities.json');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    // Note: residual authz gap — role check still reads from request body.
    // The requireAuth above ensures caller is authenticated; role-based
    // per-activity permission (canEditActivity) would be the full fix.
    const { user: bodyUser } = body;
    const effectiveUser = user ?? bodyUser;

    if (!effectiveUser || !effectiveUser.id) {
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
    const canSubmit = effectiveUser.role === 'gov_partner_tier_2' || effectiveUser.role === 'dev_partner_tier_2';
    if (!canSubmit) {
      return NextResponse.json(
        { error: 'You do not have permission to submit activities' },
        { status: 403 }
      );
    }

    // Update submission status
    activity.submissionStatus = 'submitted';
    activity.submittedBy = effectiveUser.id;
    activity.submittedByName = effectiveUser.name;
    activity.submittedAt = new Date().toISOString();
    activity.updatedAt = new Date().toISOString();

    // Save activities
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(activities, null, 2));

    
    return NextResponse.json(activity);
  } catch (error) {
    console.error('[AIMS] Error submitting activity:', error);
    return NextResponse.json(
      { error: 'Failed to submit activity' },
      { status: 500 }
    );
  }
} 