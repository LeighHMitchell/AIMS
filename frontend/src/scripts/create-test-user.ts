#!/usr/bin/env node
/**
 * Script to create a test user in the users table for development
 * 
 * Usage: npm run create-test-user
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Get directory path in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  console.log('🔄 Creating test user for development...\n');

  const testUserId = randomUUID();
  const testUserData = {
    id: testUserId,
    email: 'test@aims.local',
    name: 'Test User',
    role: 'admin'
  };

  try {
    // Check if test user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'test@aims.local')
      .single();

    if (existingUser) {
      console.log('✅ Test user already exists:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      return existingUser.id;
    }

    // Create the test user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert(testUserData)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create test user:', error.message);
      
      // If organization_id is required, try with a null value
      if (error.message.includes('organization_id')) {
        console.log('🔄 Retrying with null organization_id...');
        
        const { data: retryUser, error: retryError } = await supabase
          .from('users')
          .insert({
            ...testUserData,
            organization_id: null
          })
          .select()
          .single();
          
        if (retryError) {
          console.error('❌ Retry failed:', retryError.message);
          process.exit(1);
        }
        
        console.log('✅ Test user created successfully:');
        console.log(`   ID: ${retryUser.id}`);
        console.log(`   Email: ${retryUser.email}`);
        console.log(`   Role: ${retryUser.role}`);
        return retryUser.id;
      }
      
      process.exit(1);
    }

    console.log('✅ Test user created successfully:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    
    return newUser.id;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the function
createTestUser()
  .then((userId) => {
    console.log('\n📝 You can use this user ID for testing:');
    console.log(`   ${userId}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 