#!/usr/bin/env tsx

/**
 * Script: Create Supabase Auth Accounts for Existing Users
 * 
 * This script finds all user profiles in the users table that don't have
 * corresponding Supabase Auth accounts and creates them with temporary passwords.
 * 
 * Usage: npm run create-auth-accounts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables manually from .env.local
function loadEnvVars() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.error('Failed to load .env.local:', error);
  }
}

// Load environment variables
loadEnvVars();

// Create Supabase admin client directly
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  organization_id: string | null;
}

interface CreatedUser {
  email: string;
  password: string;
  name: string;
  role: string;
  success: boolean;
  error?: string;
}

async function main() {

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase client');
    console.error('   Check your Supabase environment variables');
    process.exit(1);
  }

  try {
    // 1. Get all user profiles
    const { data: userProfiles, error: fetchError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, organization_id')
      .order('email');

    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!userProfiles || userProfiles.length === 0) {
      return;
    }


    const results: CreatedUser[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    // 2. Process each user profile
    for (let i = 0; i < userProfiles.length; i++) {
      const profile = userProfiles[i];
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';
      

      try {
        // Check if auth user already exists
        const { data: existingAuthUser, error: checkError } = await supabase.auth.admin.getUserById(profile.id);

        if (existingAuthUser && existingAuthUser.user && !checkError) {
          skipped++;
          results.push({
            email: profile.email,
            password: '(already exists)',
            name,
            role: profile.role,
            success: true
          });
          continue;
        }

        // Create auth account
        const tempPassword = generateTempPassword();

        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: profile.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name: name,
            role: profile.role,
            created_by_script: true
          }
        });

        if (createError || !authData.user) {
          throw new Error(createError?.message || 'Failed to create auth user');
        }

        // Update profile with correct auth ID if different
        if (authData.user.id !== profile.id) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              id: authData.user.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);

          if (updateError) {
          }
        }

        created++;

        results.push({
          email: profile.email,
          password: tempPassword,
          name,
          role: profile.role,
          success: true
        });

        // Small delay to be nice to Supabase
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`   ❌ Failed to create auth account: ${error}`);
        failed++;

        results.push({
          email: profile.email,
          password: '',
          name,
          role: profile.role,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 3. Summary and credentials

    if (failed > 0) {
      results.filter(r => !r.success).forEach(user => {
      });
    }

    if (created > 0 || skipped > 0) {
      
      results.filter(r => r.success).forEach(user => {
        const email = user.email.padEnd(28, ' ');
        const password = user.password.padEnd(16, ' ');
        const name = user.name.padEnd(15, ' ');
        const role = user.role.padEnd(11, ' ');
      });
    }


    // Save credentials to file for reference
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user-credentials-${timestamp}.txt`;
    
    
    let credentialsContent = `User Login Credentials - Generated ${new Date().toLocaleString()}\n`;
    credentialsContent += '='.repeat(80) + '\n\n';
    
    results.filter(r => r.success).forEach(user => {
      credentialsContent += `Name: ${user.name}\n`;
      credentialsContent += `Email: ${user.email}\n`;
      credentialsContent += `Password: ${user.password}\n`;
      credentialsContent += `Role: ${user.role}\n`;
      credentialsContent += '-'.repeat(40) + '\n\n';
    });

    writeFileSync(filename, credentialsContent);

  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

function generateTempPassword(): string {
  // Generate a secure temporary password
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%';
  
  let password = '';
  
  // Ensure at least one uppercase, lowercase, number, and symbol
  password += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)];
  password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)];
  password += '23456789'[Math.floor(Math.random() * 8)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest
  for (let i = 4; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Run the script
main().catch(console.error);
