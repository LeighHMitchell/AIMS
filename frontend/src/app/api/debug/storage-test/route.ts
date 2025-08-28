import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('[Storage Test] Testing Supabase storage configuration...');

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('[Storage Test] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test bucket access
    console.log('[Storage Test] Testing bucket access...');
    
    // List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('[Storage Test] Error listing buckets:', bucketsError);
      return NextResponse.json({
        error: 'Failed to list storage buckets',
        details: bucketsError.message
      }, { status: 500 });
    }

    console.log('[Storage Test] Available buckets:', buckets);

    // Check if 'uploads' bucket exists
    const uploadsBucket = buckets?.find(b => b.name === 'uploads');
    
    if (!uploadsBucket) {
      return NextResponse.json({
        error: 'Uploads bucket not found',
        availableBuckets: buckets?.map(b => b.name) || [],
        details: 'The "uploads" bucket does not exist in your Supabase storage'
      }, { status: 500 });
    }

    // Test file listing in uploads bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('uploads')
      .list('', { limit: 10 });

    if (filesError) {
      console.error('[Storage Test] Error listing files:', filesError);
      return NextResponse.json({
        error: 'Failed to list files in uploads bucket',
        details: filesError.message
      }, { status: 500 });
    }

    console.log('[Storage Test] Files in uploads bucket:', files);

    return NextResponse.json({
      success: true,
      supabaseUrl: supabaseUrl.substring(0, 20) + '...',
      hasServiceKey: true,
      availableBuckets: buckets?.map(b => b.name) || [],
      uploadsBucket: {
        name: uploadsBucket.name,
        public: uploadsBucket.public,
        fileCount: files?.length || 0
      },
      sampleFiles: files?.slice(0, 5) || []
    });

  } catch (error) {
    console.error('[Storage Test] Error:', error);
    return NextResponse.json({
      error: 'Internal server error during storage test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
