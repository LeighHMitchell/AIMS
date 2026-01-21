import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[Storage] Creating uploads bucket for profile pictures');
  
  const { supabase, response: authResponse } = await requireAuth();
  
  if (authResponse) return authResponse;

  
  try {

    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    // Check if uploads bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('[Storage] Error listing buckets:', listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    
    const uploadsExists = buckets?.some((bucket: any) => bucket.name === 'uploads');
    
    if (uploadsExists) {
      console.log('[Storage] Uploads bucket already exists');
      return NextResponse.json({ 
        success: true, 
        message: 'Uploads bucket already exists',
        buckets: buckets?.map((b: any) => b.name) || []
      });
    }
    
    // Create the uploads bucket
    const { data, error } = await supabase.storage.createBucket('uploads', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5 * 1024 * 1024 // 5MB
    });
    
    if (error) {
      console.error('[Storage] Error creating uploads bucket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('[Storage] Uploads bucket created successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Uploads bucket created successfully',
      bucket: data
    });
    
  } catch (error) {
    console.error('[Storage] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create uploads bucket', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
