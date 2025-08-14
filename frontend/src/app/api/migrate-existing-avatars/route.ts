import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here to ensure only admins can run this
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // You should set this secret in your environment variables
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'migrate-avatars-2024';
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      );
    }

    // 1. Find all users with file-based avatar URLs
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url')
      .like('avatar_url', '/uploads/profiles/%');

    if (fetchError) {
      return NextResponse.json(
        { error: `Database fetch error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: 'No users found with file-based avatar URLs',
        processed: 0,
        migrated: 0,
        failed: 0
      });
    }

    // 2. Convert each file to base64
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const user of users) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      
      try {
        // Extract filename from URL like "/uploads/profiles/filename.jpg"
        const filename = user.avatar_url.replace('/uploads/profiles/', '');
        const filePath = join(process.cwd(), 'public', 'uploads', 'profiles', filename);
        
        // Read the file
        const fileBuffer = await readFile(filePath);
        
        // Convert to base64 with proper MIME type
        const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = getMimeType(extension);
        const base64String = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        
        // Update the user's avatar_url in the database
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            avatar_url: base64String,
            updated_at: new Date().toISOString() 
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Update error: ${updateError.message}`);
        }

        results.push({
          user: name,
          oldUrl: user.avatar_url,
          filename: filename,
          status: 'migrated'
        });
        successCount++;
      } catch (error: any) {
        results.push({
          user: name,
          oldUrl: user.avatar_url,
          status: 'failed',
          error: error.message
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      message: 'Avatar migration completed',
      processed: users.length,
      migrated: successCount,
      failed: errorCount,
      results
    });

  } catch (error: any) {
    console.error('Migrate avatars error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate avatars', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get MIME type
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[extension] || 'image/jpeg';
}

// Note: Images will be stored as-is in base64. 
// The AvatarUploader component handles compression for new uploads.

// GET method to check status
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      );
    }

    // Count users with file-based avatar URLs
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .like('avatar_url', '/uploads/profiles/%');

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      usersWithFileAvatars: count || 0,
      message: count > 0 
        ? `Found ${count} users with file-based avatars. Call POST with ?secret=your-secret to migrate them to base64.`
        : 'No users found with file-based avatar URLs.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check avatar URLs', details: error.message },
      { status: 500 }
    );
  }
}
