#!/usr/bin/env tsx

/**
 * Migration Script: Profile Pictures to Cloud Storage
 * 
 * This script migrates all existing profile pictures from local filesystem
 * to Vercel Blob storage and updates the database with new URLs.
 * 
 * Usage: npm run migrate-profile-pics
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { put } from '@vercel/blob';
import { getSupabaseAdmin } from '../lib/supabase';

// Configuration
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads', 'profiles');

interface MigrationResult {
  filename: string;
  oldUrl: string;
  newUrl: string;
  success: boolean;
  error?: string;
  usersUpdated?: number;
}

async function main() {
  console.log('🚀 Starting profile picture migration...\n');

  // Validate environment variables
  const VERCEL_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (!VERCEL_BLOB_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN environment variable is required');
    console.error('   Get it from: https://vercel.com/dashboard/stores');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Failed to initialize Supabase client');
    console.error('   Check your Supabase environment variables');
    process.exit(1);
  }

  try {
    // 1. Read all profile picture files
    console.log('📂 Reading profile pictures from local filesystem...');
    const files = await readdir(UPLOADS_DIR);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    if (imageFiles.length === 0) {
      console.log('ℹ️  No profile pictures found to migrate');
      return;
    }

    console.log(`📸 Found ${imageFiles.length} profile pictures to migrate\n`);

    const results: MigrationResult[] = [];

    // 2. Migrate each file
    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      
      try {
        console.log(`🔄 [${i + 1}/${imageFiles.length}] Migrating: ${filename}`);
        
        // Read file
        const filePath = join(UPLOADS_DIR, filename);
        const fileBuffer = await readFile(filePath);
        
        // Get file extension and mime type
        const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = getMimeType(extension);
        
        // Create blob from buffer
        const file = new File([fileBuffer], filename, { type: mimeType });
        
        // Upload to Vercel Blob
        console.log(`   ☁️  Uploading to cloud storage...`);
        const blob = await put(`profiles/${filename}`, file, {
          access: 'public',
          token: VERCEL_BLOB_TOKEN,
        });

        const oldUrl = `/uploads/profiles/${filename}`;
        const newUrl = blob.url;

        // Update database - find users with this avatar URL
        console.log(`   🔍 Looking for users with this avatar...`);
        const { data: users, error: fetchError } = await supabase
          .from('users')
          .select('id, email, avatar_url, first_name, last_name')
          .eq('avatar_url', oldUrl);

        if (fetchError) {
          throw new Error(`Database fetch error: ${fetchError.message}`);
        }

        let usersUpdated = 0;
        if (users && users.length > 0) {
          console.log(`   📝 Found ${users.length} user(s) to update...`);
          
          // Update users with new URL
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              avatar_url: newUrl,
              updated_at: new Date().toISOString() 
            })
            .eq('avatar_url', oldUrl);

          if (updateError) {
            throw new Error(`Database update error: ${updateError.message}`);
          }

          usersUpdated = users.length;
          
          // Log affected users
          users.forEach((user) => {
            const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
            console.log(`     • ${name}`);
          });
        }

        console.log(`   ✅ Success! Migrated ${filename} → Updated ${usersUpdated} user(s)`);
        console.log(`   📤 Old URL: ${oldUrl}`);
        console.log(`   📥 New URL: ${newUrl}\n`);

        results.push({
          filename,
          oldUrl,
          newUrl,
          success: true,
          usersUpdated
        });

        // Small delay to be nice to the services
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Failed to migrate ${filename}:`, error);
        results.push({
          filename,
          oldUrl: `/uploads/profiles/${filename}`,
          newUrl: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 3. Summary
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalUsersUpdated = successful.reduce((sum, r) => sum + (r.usersUpdated || 0), 0);
    
    console.log(`✅ Successful migrations: ${successful.length}/${results.length}`);
    console.log(`👥 Total users updated: ${totalUsersUpdated}`);
    console.log(`❌ Failed migrations: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed files:');
      failed.forEach(f => {
        console.log(`   - ${f.filename}: ${f.error}`);
      });
    }

    if (successful.length > 0) {
      console.log('\n✅ Successfully migrated:');
      successful.forEach(f => {
        console.log(`   - ${f.filename} (${f.usersUpdated} users)`);
      });
    }

    console.log('\n🎉 Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy your app to production');
    console.log('2. Profile pictures will now persist across deployments');
    console.log('3. Consider updating upload API routes to use cloud storage');
    console.log('4. You can safely delete local /public/uploads/profiles/ files');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[extension] || 'image/jpeg';
}

// Run the migration
main().catch(console.error);
