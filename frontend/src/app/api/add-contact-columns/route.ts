import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[Add Contact Columns] Starting to add contact columns');
  
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    
    // Test if the columns exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('contact_type, secondary_email, secondary_phone, fax_number, notes')
      .limit(1);
    
    if (testError) {
      console.log('[Add Contact Columns] Columns do not exist, they need to be added manually');
      
      return NextResponse.json({
        success: false,
        message: 'Contact columns need to be added manually',
        sql: `
-- Please run this SQL in your Supabase SQL Editor:

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contact_type TEXT,
ADD COLUMN IF NOT EXISTS secondary_email TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS fax_number TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add email validation constraint
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS check_secondary_email_format 
CHECK (secondary_email IS NULL OR secondary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_contact_type ON users(contact_type);
CREATE INDEX IF NOT EXISTS idx_users_secondary_email ON users(secondary_email);
        `,
        error: testError.message
      });
    }
    
    console.log('[Add Contact Columns] All contact columns already exist!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All contact columns already exist and are ready to use!',
      columns: ['contact_type', 'secondary_email', 'secondary_phone', 'fax_number', 'notes']
    });
    
  } catch (error) {
    console.error('[Add Contact Columns] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check contact columns', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
