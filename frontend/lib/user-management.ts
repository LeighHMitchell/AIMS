import { getSupabaseAdmin } from '@/lib/supabase';

// Helper functions to work with users as a single entity
// This simplifies user management by hiding the complexity of auth + profile sync

export async function getAllUsers() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: profiles } = await supabase
    .from('users')
    .select('*, organizations(name, acronym)');
  
  // Merge both sources into a unified view
  return mergeUserData(authUsers?.users || [], profiles || []);
}

export async function createUser(userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id?: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  // Step 1: Create auth account
  const { data: auth, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true
  });
  
  if (authError) throw authError;
  if (!auth?.user) throw new Error('Failed to create user');
  
  // Step 2: Create profile with same ID
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: auth.user.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      organization_id: userData.organization_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  
  if (profileError) throw profileError;
  
  return { success: true, user: auth.user };
}

export async function deleteUser(email: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  // Find the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const user = authUsers?.users.find((u: any) => u.email === email);
  
  if (!user) throw new Error('User not found');
  
  // Delete both auth and profile (order matters: profile first)
  await supabase.from('users').delete().eq('id', user.id);
  await supabase.auth.admin.deleteUser(user.id);
  
  return { success: true };
}

export async function updateUserProfile(userId: string, updates: {
  first_name?: string;
  last_name?: string;
  role?: string;
  organization_id?: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) throw error;
  return { success: true };
}

// Helper function to merge auth and profile data
function mergeUserData(authUsers: any[], profiles: any[]) {
  const unifiedUsers = new Map();
  
  // Add all auth users
  authUsers.forEach(auth => {
    unifiedUsers.set(auth.id, {
      id: auth.id,
      email: auth.email,
      can_login: true,
      last_login: auth.last_sign_in_at,
      account_created: auth.created_at,
      has_profile: false,
      name: '',
      organization: '',
      organization_acronym: '',
      role: '',
      sync_status: 'No Profile'
    });
  });
  
  // Merge with profile data
  profiles.forEach(profile => {
    const existing = unifiedUsers.get(profile.id);
    if (existing) {
      existing.has_profile = true;
      existing.name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      existing.organization = profile.organizations?.name || '';
      existing.organization_acronym = profile.organizations?.acronym || '';
      existing.role = profile.role;
      existing.sync_status = 'Synced';
    } else {
      // Profile without auth - this shouldn't happen after consolidation
      unifiedUsers.set(profile.id, {
        id: profile.id,
        email: profile.email,
        can_login: false,
        last_login: null,
        account_created: null,
        has_profile: true,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        organization: profile.organizations?.name || '',
        organization_acronym: profile.organizations?.acronym || '',
        role: profile.role,
        sync_status: 'No Auth'
      });
    }
  });
  
  return Array.from(unifiedUsers.values())
    .sort((a, b) => a.email.localeCompare(b.email));
}

// Export types for TypeScript
export interface UnifiedUser {
  id: string;
  email: string;
  can_login: boolean;
  last_login: string | null;
  account_created: string | null;
  has_profile: boolean;
  name: string;
  organization: string;
  organization_acronym: string;
  role: string;
  sync_status: 'Synced' | 'No Profile' | 'No Auth';
}