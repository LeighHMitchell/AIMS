#!/usr/bin/env tsx

/**
 * Script: Reset User Password
 * 
 * This script resets a user's password and provides the new credentials.
 * 
 * Usage: npm run reset-password -- email@example.com
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomInt } from 'crypto';
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
    console.error('Missing Supabase environment variables');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%';
  
  let password = '';
  
  // Ensure at least one uppercase, lowercase, number, and symbol
  password += 'ABCDEFGHJKMNPQRSTUVWXYZ'[randomInt(23)];
  password += 'abcdefghijkmnpqrstuvwxyz'[randomInt(23)];
  password += '23456789'[randomInt(8)];
  password += symbols[randomInt(symbols.length)];
  
  // Fill the rest
  for (let i = 4; i < 12; i++) {
    password += chars[randomInt(chars.length)];
  }
  
  // Fisher-Yates shuffle with crypto-safe random
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

async function resetUserPassword(email: string) {

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase client');
    process.exit(1);
  }

  try {
    // 1. Find the user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile not found:', profileError?.message);
      return;
    }


    // 2. Generate new password
    const newPassword = generateTempPassword();
    
    // 3. Reset password using the profile ID (which should match auth ID)
    const { error: resetError } = await supabase.auth.admin.updateUserById(userProfile.id, {
      password: newPassword
    });

    if (resetError) {
      console.error('❌ Failed to reset password:', resetError.message);
      return;
    }

    
    // 4. Display new credentials
    

  } catch (error) {
    console.error('💥 Error resetting password:', error);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address:');
  console.error('   npm run reset-password -- dr.yadanar90@gmail.com');
  process.exit(1);
}

// Run the reset
resetUserPassword(email).catch(console.error);
