import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('[Add Feature Column] Starting migration for user:', userId);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Check if user has admin permissions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow super users to run migrations
    if (user.role !== 'super_user') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if column already exists
    const { data: existingFeedback, error: checkError } = await supabase
      .from('feedback')
      .select('*')
      .limit(1);

    if (existingFeedback && existingFeedback.length > 0) {
      if ('feature' in existingFeedback[0]) {
        return NextResponse.json({ 
          success: true, 
          message: 'Feature column already exists',
          alreadyExists: true 
        });
      }
    }

    // Since we can't execute DDL directly through Supabase client,
    // we'll return instructions for manual migration
    const migrationSQL = `
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feature TEXT;
COMMENT ON COLUMN feedback.feature IS 'App feature/functionality this feedback relates to';
`;

    return NextResponse.json({ 
      success: false,
      requiresManualMigration: true,
      message: 'Feature column needs to be added manually',
      instructions: {
        steps: [
          'Go to your Supabase Dashboard',
          'Navigate to SQL Editor',
          'Run the provided SQL'
        ],
        sql: migrationSQL
      }
    });

  } catch (error) {
    console.error('[Add Feature Column] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}