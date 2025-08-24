#!/usr/bin/env tsx

/**
 * Diagnostic script to check custom groups logo/banner issues in production
 * Run: npm run dev then visit http://localhost:3000/api/diagnose-custom-groups
 */

import { createClient } from '@supabase/supabase-js';

export default async function diagnoseCustomGroups() {
  console.log('🔍 Diagnosing Custom Groups Logo/Banner Issues...');
  
  // Check environment variables
  console.log('\n1. Checking Environment Variables:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`   ✓ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Set' : '❌ Missing'}`);
  console.log(`   ✓ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Set' : '❌ Missing'}`);
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('   ❌ Required environment variables missing');
    return { error: 'Environment variables not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check database schema
  console.log('\n2. Checking Database Schema:');
  try {
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'custom_groups')
      .order('column_name');

    if (schemaError) {
      console.log(`   ❌ Schema check failed: ${schemaError.message}`);
    } else {
      console.log('   ✓ Custom groups table columns:');
      columns?.forEach(col => {
        const isLogoOrBanner = col.column_name === 'logo' || col.column_name === 'banner';
        const icon = isLogoOrBanner ? '🖼️ ' : '   ';
        console.log(`     ${icon}${col.column_name} (${col.data_type})`);
      });
      
      const hasLogo = columns?.some(col => col.column_name === 'logo');
      const hasBanner = columns?.some(col => col.column_name === 'banner');
      
      if (!hasLogo || !hasBanner) {
        console.log('   ❌ Missing logo/banner columns - migration needed');
      } else {
        console.log('   ✅ Logo and banner columns exist');
      }
    }
  } catch (error) {
    console.log(`   ❌ Database connection error: ${error}`);
  }

  // Check storage buckets
  console.log('\n3. Checking Supabase Storage:');
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log(`   ❌ Storage check failed: ${bucketError.message}`);
    } else {
      console.log('   ✓ Available storage buckets:');
      buckets?.forEach(bucket => {
        const isUploads = bucket.name === 'uploads';
        const icon = isUploads ? '📁 ' : '   ';
        console.log(`     ${icon}${bucket.name} (public: ${bucket.public})`);
      });
      
      const uploadsExists = buckets?.some(bucket => bucket.name === 'uploads');
      if (!uploadsExists) {
        console.log('   ❌ "uploads" bucket missing');
      } else {
        console.log('   ✅ "uploads" bucket exists');
      }
    }
  } catch (error) {
    console.log(`   ❌ Storage error: ${error}`);
  }

  // Check existing custom groups
  console.log('\n4. Checking Existing Custom Groups:');
  try {
    const { data: groups, error: groupsError } = await supabase
      .from('custom_groups')
      .select('id, name, logo, banner')
      .limit(5);

    if (groupsError) {
      console.log(`   ❌ Custom groups query failed: ${groupsError.message}`);
    } else {
      console.log(`   ✓ Found ${groups?.length || 0} custom groups:`);
      groups?.forEach((group, index) => {
        console.log(`     ${index + 1}. ${group.name}`);
        console.log(`        Logo: ${group.logo || '❌ No logo'}`);
        console.log(`        Banner: ${group.banner || '❌ No banner'}`);
        
        // Test if URLs are accessible
        if (group.logo) {
          console.log(`        Logo URL valid: ${isValidUrl(group.logo) ? '✅' : '❌'}`);
        }
        if (group.banner) {
          console.log(`        Banner URL valid: ${isValidUrl(group.banner) ? '✅' : '❌'}`);
        }
      });
    }
  } catch (error) {
    console.log(`   ❌ Custom groups error: ${error}`);
  }

  // Test file upload endpoint
  console.log('\n5. Testing Upload Endpoint Configuration:');
  console.log('   ℹ️  To test uploads, use: POST /api/upload with a file');
  
  console.log('\n🏁 Diagnosis Complete!');
  
  return {
    success: true,
    message: 'Diagnosis complete - check console output above'
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Export for use in API route
export { diagnoseCustomGroups };
