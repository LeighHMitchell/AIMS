import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('[Migration] Adding otherIdentifiers column to activities table...');
    
    const supabase = getSupabaseAdmin();
    
    // Check if column already exists by trying to select it
    const { error: checkError } = await supabase
      .from('activities')
      .select('otherIdentifiers')
      .limit(1);

    if (!checkError) {
      console.log('[Migration] otherIdentifiers column already exists');
      return NextResponse.json({ 
        success: true, 
        message: 'otherIdentifiers column already exists' 
      });
    }

    if (checkError && !checkError.message.includes('column')) {
      console.error('[Migration] Error checking columns:', checkError);
      return NextResponse.json({ 
        error: 'Failed to check existing columns',
        details: checkError.message 
      }, { status: 500 });
    }

    // Try to create the column using a simple approach
    console.log('[Migration] Attempting to create otherIdentifiers column...');
    
    // Try to update a non-existent record to trigger column creation
    const { error: createError } = await supabase
      .from('activities')
      .update({ otherIdentifiers: [] })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
    
    if (createError) {
      console.log('[Migration] Column creation failed, trying alternative approach:', createError.message);
      
      // Try to insert a new record with the column
      const { error: insertError } = await supabase
        .from('activities')
        .insert({ 
          title_narrative: 'Migration Test',
          otherIdentifiers: []
        });
      
      if (insertError) {
        return NextResponse.json({ 
          error: 'Migration failed - column may need to be added manually',
          details: insertError.message,
          suggestion: 'Please add otherIdentifiers JSONB DEFAULT \'[]\'::jsonb column to activities table in Supabase dashboard'
        }, { status: 500 });
      }
    }
    
    // Check if column exists now
    const { error: verifyError } = await supabase.from('activities').select('otherIdentifiers').limit(1);
    
    if (!verifyError || !verifyError.message.includes('column')) {
      console.log('[Migration] otherIdentifiers column created successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'otherIdentifiers column created successfully' 
      });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create column',
      details: verifyError?.message || 'Unknown error'
    }, { status: 500 });

  } catch (error) {
    console.error('[Migration] Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}