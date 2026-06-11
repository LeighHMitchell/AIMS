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

    // Check if user can submit
    const canSubmit = profile.role === 'gov_partner_tier_2' || profile.role === 'dev_partner_tier_2';
    if (!canSubmit) {
      return NextResponse.json(
        { error: 'You do not have permission to submit activities' },
        { status: 403 }
      );
    }

    const submitterName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email;

    // Update submission status
    activity.submissionStatus = 'submitted';
    activity.submittedBy = user.id;
    activity.submittedByName = submitterName;
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