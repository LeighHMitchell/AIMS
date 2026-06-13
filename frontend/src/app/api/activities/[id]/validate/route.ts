import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'activities.json');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase || !user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const { action, reason } = body;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, first_name, last_name')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to verify user permissions' }, { status: 500 });
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
    const canValidate = profile.role === 'gov_partner_tier_1' || profile.role === 'super_user';
    if (!canValidate) {
      return NextResponse.json(
        { error: 'You do not have permission to validate activities' },
        { status: 403 }
      );
    }

    const validatorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email;

    // Update status based on action
    if (action === 'approve') {
      activity.submissionStatus = 'validated';
      activity.validatedBy = user.id;
      activity.validatedByName = validatorName;
      activity.validatedAt = new Date().toISOString();
    } else if (action === 'reject') {
      activity.submissionStatus = 'rejected';
      activity.rejectedBy = user.id;
      activity.rejectedByName = validatorName;
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