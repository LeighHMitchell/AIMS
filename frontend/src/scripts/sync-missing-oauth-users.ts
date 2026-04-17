/**
 * Script to sync OAuth users from auth.users to public.users
 * 
 * This script finds users in Supabase Auth that don't have a corresponding
 * record in the public.users table and creates them.
 * 
 * Usage: npm run sync-oauth-users
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface AuthUser {
  id: string;
  email: string;
  raw_user_meta_data: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
  created_at: string;
}

interface PublicUser {
  id: string;
  email: string;
}

async function syncMissingUsers() {

  // Get all auth users
  const { data: authResponse, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    process.exit(1);
  }

  const authUsers = authResponse.users;

  // Get all public users
  const { data: publicUsers, error: publicError } = await supabase
    .from('users')
    .select('id, email');

  if (publicError) {
    console.error('❌ Error fetching public users:', publicError);
    process.exit(1);
  }


  // Find missing users
  const publicUserIds = new Set((publicUsers || []).map((u: PublicUser) => u.id));
  const publicUserEmails = new Set((publicUsers || []).map((u: PublicUser) => u.email.toLowerCase()));

  const missingUsers = authUsers.filter((authUser: AuthUser) => {
    const idMissing = !publicUserIds.has(authUser.id);
    const emailMissing = !publicUserEmails.has(authUser.email?.toLowerCase());
    return idMissing && emailMissing;
  });


  if (missingUsers.length === 0) {
    return;
  }

  // Create missing users
  let created = 0;
  let errors = 0;

  for (const authUser of missingUsers) {
    const fullName = authUser.raw_user_meta_data?.full_name || 
                     authUser.raw_user_meta_data?.name || 
                     '';
    const nameParts = fullName.split(' ').filter(Boolean);

    const newUser = {
      id: authUser.id,
      email: authUser.email,
      first_name: nameParts[0] || authUser.email?.split('@')[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      avatar_url: authUser.raw_user_meta_data?.avatar_url || 
                  authUser.raw_user_meta_data?.picture || 
                  null,
      role: 'public_user',
      auth_provider: 'google', // OAuth users authenticate via Google
      created_at: authUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };


    const { error: insertError } = await supabase
      .from('users')
      .insert(newUser);

    if (insertError) {
      console.error(`   ❌ Error: ${insertError.message}`);
      errors++;
    } else {
      created++;
    }
  }

}

syncMissingUsers().catch(console.error);

