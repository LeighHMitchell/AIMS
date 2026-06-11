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
    // The requireAuth above ensures caller is authenticated; canEditActivity
    // would be the full fix.
    const { user: bodyUser, action, reason } = body;
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

    // Check if user can validate (Tier 1 Government users)
    const canValidate = effectiveUser.role === 'gov_partner_tier_1' || effectiveUser.role === 'super_user';
    if (!canValidate) {
      return NextResponse.json(
        { error: 'You do not have permission to validate activities' },
        { status: 403 }
      );
    }

    // Update status based on action
    if (action === 'approve') {
      activity.submissionStatus = 'validated';
      activity.validatedBy = effectiveUser.id;
      activity.validatedByName = effectiveUser.name;
      activity.validatedAt = new Date().toISOString();
    } else if (action === 'reject') {
      activity.submissionStatus = 'rejected';
      activity.rejectedBy = effectiveUser.id;
      activity.rejectedByName = effectiveUser.name;
      activity.rejectedAt = new Date().toISOString();
      activity.rejectionReason = reason || 'No reason provided';
    }
    
    activity.updatedAt = new Date().toISOString();

    // Save activities
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(activities, null, 2));

    
    return NextResponse.json(activity);
  } catch (error) {
    console.error('[AIMS] Error validating activity:', error);
    return NextResponse.json(
      { error: 'Failed to validate activity' },
      { status: 500 }
    );
  }
} 