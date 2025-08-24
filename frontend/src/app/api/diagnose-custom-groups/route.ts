import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('🔍 Diagnosing Custom Groups Logo/Banner Issues...');
  
  const results = [];
  const issues = [];

  // Check environment variables
  results.push('1. Checking Environment Variables:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  results.push(`   ✓ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Set' : '❌ Missing'}`);
  results.push(`   ✓ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Set' : '❌ Missing'}`);
  
  if (!supabaseUrl || !supabaseServiceKey) {
    issues.push('Required environment variables missing');
    return NextResponse.json({ 
      error: 'Environment variables not configured',
      results,
      issues 
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check database schema
  results.push('\n2. Checking Database Schema:');
  try {
    const { data: columns, error: schemaError } = await supabase.rpc('get_custom_groups_columns');

    if (schemaError) {
      // Fallback: try to query custom_groups directly to see if table exists
      const { data: testQuery, error: testError } = await supabase
        .from('custom_groups')
        .select('*')
        .limit(1);
      
      if (testError) {
        results.push(`   ❌ Custom groups table error: ${testError.message}`);
        issues.push('Custom groups table may not exist or have permission issues');
      } else {
        results.push('   ✅ Custom groups table exists (schema details unavailable)');
        
        // Check if a test group has logo/banner fields
        if (testQuery && testQuery.length > 0) {
          const hasLogo = 'logo' in testQuery[0];
          const hasBanner = 'banner' in testQuery[0];
          
          results.push(`   ${hasLogo ? '✅' : '❌'} Logo column: ${hasLogo ? 'exists' : 'missing'}`);
          results.push(`   ${hasBanner ? '✅' : '❌'} Banner column: ${hasBanner ? 'exists' : 'missing'}`);
          
          if (!hasLogo || !hasBanner) {
            issues.push('Logo and/or banner columns missing from custom_groups table');
          }
        }
      }
    } else {
      results.push('   ✓ Schema check completed');
    }
  } catch (error: any) {
    results.push(`   ❌ Database connection error: ${error.message}`);
    issues.push(`Database connection failed: ${error.message}`);
  }

  // Check storage buckets
  results.push('\n3. Checking Supabase Storage:');
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      results.push(`   ❌ Storage check failed: ${bucketError.message}`);
      issues.push(`Supabase storage error: ${bucketError.message}`);
    } else {
      results.push('   ✓ Available storage buckets:');
      buckets?.forEach(bucket => {
        const isUploads = bucket.name === 'uploads';
        const icon = isUploads ? '📁 ' : '   ';
        results.push(`     ${icon}${bucket.name} (public: ${bucket.public})`);
      });
      
      const uploadsExists = buckets?.some(bucket => bucket.name === 'uploads');
      if (!uploadsExists) {
        results.push('   ❌ "uploads" bucket missing');
        issues.push('Supabase "uploads" storage bucket does not exist');
      } else {
        results.push('   ✅ "uploads" bucket exists');
      }
    }
  } catch (error: any) {
    results.push(`   ❌ Storage error: ${error.message}`);
    issues.push(`Storage check failed: ${error.message}`);
  }

  // Check existing custom groups
  results.push('\n4. Checking Existing Custom Groups:');
  try {
    const { data: groups, error: groupsError } = await supabase
      .from('custom_groups')
      .select('id, name, logo, banner')
      .limit(5);

    if (groupsError) {
      results.push(`   ❌ Custom groups query failed: ${groupsError.message}`);
      issues.push(`Cannot query custom groups: ${groupsError.message}`);
    } else {
      results.push(`   ✓ Found ${groups?.length || 0} custom groups:`);
      groups?.forEach((group, index) => {
        results.push(`     ${index + 1}. ${group.name}`);
        results.push(`        Logo: ${group.logo || '❌ No logo'}`);
        results.push(`        Banner: ${group.banner || '❌ No banner'}`);
        
        // Test if URLs are accessible
        if (group.logo && !isValidUrl(group.logo)) {
          issues.push(`Invalid logo URL for group "${group.name}"`);
        }
        if (group.banner && !isValidUrl(group.banner)) {
          issues.push(`Invalid banner URL for group "${group.name}"`);
        }
      });
    }
  } catch (error: any) {
    results.push(`   ❌ Custom groups error: ${error.message}`);
    issues.push(`Custom groups check failed: ${error.message}`);
  }

  // Test file upload endpoint
  results.push('\n5. Upload Endpoint Configuration:');
  results.push('   ℹ️  To test uploads, use: POST /api/upload with a file');
  
  results.push('\n🏁 Diagnosis Complete!');

  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  return NextResponse.json({
    success: issues.length === 0,
    results: results.join('\n'),
    issues: issues,
    summary: {
      totalIssues: issues.length,
      hasEnvironmentVars: !!(supabaseUrl && supabaseServiceKey),
      needsMigration: issues.some(i => i.includes('columns missing')),
      needsStorageBucket: issues.some(i => i.includes('uploads')),
    }
  });
}
