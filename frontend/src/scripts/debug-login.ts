#!/usr/bin/env tsx

/**
 * Script: Debug Login Issue
 * 
 * This script debugs login issues by checking auth accounts and attempting login.
 * 
 * Usage: npm run debug-login -- email@example.com password
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

// Create Supabase admin client
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

// Create regular client for login testing
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase client environment variables');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

async function debugLogin(email: string, password: string) {

  const supabaseAdmin = getSupabaseAdmin();
  const supabaseClient = getSupabaseClient();
  
  if (!supabaseAdmin || !supabaseClient) {
    console.error('❌ Failed to initialize Supabase clients');
    process.exit(1);
  }

  try {
    // 1. Check user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      console.error('❌ User profile not found:', profileError?.message);
      return;
    }


    // 2. Check auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list auth users:', listError.message);
      return;
    }

    const matchingAuthUsers = authUsers.users.filter(user => user.email === email);
    
    matchingAuthUsers.forEach((user, index) => {
    });

    // 3. Check if profile ID matches any auth ID
    const matchingAuth = matchingAuthUsers.find(auth => auth.id === userProfile.id);
    if (matchingAuth) {
    } else {
    }

    // 4. Test login with provided credentials
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      
      // Try to get more details about the error
      if (loginError.message.includes('Invalid login credentials')) {
      }
    } else if (loginData.user) {
    }

    // 5. If login failed but we have auth accounts, try resetting password
    if (loginError && matchingAuthUsers.length > 0) {
      
      // Use the first auth account (or the one matching profile if available)
      const targetAuth = matchingAuth || matchingAuthUsers[0];
      
      const newPassword = generateTempPassword();
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(targetAuth.id, {
        password: newPassword,
        email_confirm: true // Ensure email is confirmed
      });

      if (resetError) {
        console.error('❌ Password reset failed:', resetError.message);
      } else {
        
        // Test login with new password
        const { data: newLoginData, error: newLoginError } = await supabaseClient.auth.signInWithPassword({
          email: email,
          password: newPassword
        });

        if (newLoginError) {
          console.error('❌ Login still failed:', newLoginError.message);
        } else {
        }
      }
    }

  } catch (error) {
    console.error('💥 Debug error:', error);
  }
}

function generateTempPassword(): string {
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

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Please provide email and password:');
  console.error('   npm run debug-login -- dr.yadanar90@gmail.com hAn!suG7pup4');
  process.exit(1);
}

// Run the debug
debugLogin(email, password).catch(console.error);
