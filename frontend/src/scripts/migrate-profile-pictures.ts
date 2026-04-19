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
    const files = await readdir(UPLOADS_DIR);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    if (imageFiles.length === 0) {
      return;
    }


    const results: MigrationResult[] = [];

    // 2. Migrate each file
    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      
      try {
        
        // Read file
        const filePath = join(UPLOADS_DIR, filename);
        const fileBuffer = await readFile(filePath);
        
        // Get file extension and mime type
        const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = getMimeType(extension);
        
        // Create blob from buffer
        const file = new File([fileBuffer], filename, { type: mimeType });
        
        // Upload to Vercel Blob
        const blob = await put(`profiles/${filename}`, file, {
          access: 'public',
          token: VERCEL_BLOB_TOKEN,
        });

        const oldUrl = `/uploads/profiles/${filename}`;
        const newUrl = blob.url;

        // Update database - find users with this avatar URL
        const { data: users, error: fetchError } = await supabase
          .from('users')
          .select('id, email, avatar_url, first_name, last_name')
          .eq('avatar_url', oldUrl);

        if (fetchError) {
          throw new Error(`Database fetch error: ${fetchError.message}`);
        }

        let usersUpdated = 0;
        if (users && users.length > 0) {
          
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
          users.forEach((user: any) => {
            const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
          });
        }


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
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalUsersUpdated = successful.reduce((sum, r) => sum + (r.usersUpdated || 0), 0);
    
    
    if (failed.length > 0) {
      failed.forEach(f => {
      });
    }

    if (successful.length > 0) {
      successful.forEach(f => {
      });
    }


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
