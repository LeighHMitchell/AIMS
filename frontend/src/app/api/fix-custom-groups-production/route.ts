import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('🔧 Fixing Custom Groups Production Issues...');
  
  const results = [];
  const fixes = [];

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      error: 'Environment variables not configured',
      message: 'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set'
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fix 1: Add logo and banner columns if missing
  results.push('1. Checking and adding logo/banner columns...');
  try {
    // Try to add the columns (will fail silently if they exist)
    const addLogoColumn = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE custom_groups ADD COLUMN IF NOT EXISTS logo TEXT'
    });
    
    const addBannerColumn = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE custom_groups ADD COLUMN IF NOT EXISTS banner TEXT'
    });

    if (addLogoColumn.error && !addLogoColumn.error.message.includes('already exists')) {
      results.push(`   ❌ Failed to add logo column: ${addLogoColumn.error.message}`);
    } else {
      results.push('   ✅ Logo column added/verified');
      fixes.push('Added logo column to custom_groups table');
    }

    if (addBannerColumn.error && !addBannerColumn.error.message.includes('already exists')) {
      results.push(`   ❌ Failed to add banner column: ${addBannerColumn.error.message}`);
    } else {
      results.push('   ✅ Banner column added/verified');
      fixes.push('Added banner column to custom_groups table');
    }

  } catch (error: any) {
    results.push(`   ❌ Column addition error: ${error.message}`);
    
    // Alternative approach: Try direct ALTER statements
    try {
      await supabase.from('information_schema.columns').select('*').limit(1); // Test connection
      
      results.push('   🔧 Attempting alternative column addition method...');
      // Note: Direct SQL execution may not be available in some Supabase configurations
      results.push('   ⚠️  Please run this SQL manually in Supabase Dashboard:');
      results.push('      ALTER TABLE custom_groups ADD COLUMN IF NOT EXISTS logo TEXT;');
      results.push('      ALTER TABLE custom_groups ADD COLUMN IF NOT EXISTS banner TEXT;');
    } catch (altError: any) {
      results.push(`   ❌ Alternative method failed: ${altError.message}`);
    }
  }

  // Fix 2: Create uploads bucket if missing
  results.push('\n2. Checking and creating uploads bucket...');
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      results.push(`   ❌ Cannot list buckets: ${listError.message}`);
    } else {
      const uploadsExists = buckets?.some((bucket: any) => bucket.name === 'uploads');
      
      if (!uploadsExists) {
        results.push('   🔧 Creating uploads bucket...');
        
        const { data, error: createError } = await supabase.storage.createBucket('uploads', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 10 * 1024 * 1024 // 10MB
        });
        
        if (createError) {
          results.push(`   ❌ Failed to create uploads bucket: ${createError.message}`);
        } else {
          results.push('   ✅ Uploads bucket created successfully');
          fixes.push('Created uploads storage bucket');
        }
      } else {
        results.push('   ✅ Uploads bucket already exists');
      }
    }
  } catch (error: any) {
    results.push(`   ❌ Bucket creation error: ${error.message}`);
  }

  // Fix 3: Update the view to include logo and banner
  results.push('\n3. Updating custom_groups_with_stats view...');
  try {
    const viewSQL = `
      DROP VIEW IF EXISTS custom_groups_with_stats;
      
      CREATE VIEW custom_groups_with_stats AS
      SELECT 
          cg.*,
          COUNT(DISTINCT cgm.organization_id) as member_count,
          ARRAY_AGG(
              jsonb_build_object(
                  'id', o.id,
                  'name', o.name,
                  'acronym', o.acronym,
                  'logo', o.logo,
                  'organization_id', o.id,
                  'organization_name', o.name,
                  'organization', jsonb_build_object(
                      'id', o.id,
                      'name', o.name,
                      'acronym', o.acronym,
                      'logo', o.logo
                  )
              ) ORDER BY o.name
          ) FILTER (WHERE o.id IS NOT NULL) as members
      FROM custom_groups cg
      LEFT JOIN custom_group_memberships cgm ON cg.id = cgm.group_id
      LEFT JOIN organizations o ON cgm.organization_id = o.id
      GROUP BY cg.id;
    `;

    const viewResult = await supabase.rpc('exec_sql', { sql: viewSQL });
    
    if (viewResult.error) {
      results.push(`   ❌ Failed to update view: ${viewResult.error.message}`);
      results.push('   ⚠️  Please run this SQL manually in Supabase Dashboard:');
      results.push(viewSQL.split('\n').map(line => '      ' + line).join('\n'));
    } else {
      results.push('   ✅ View updated successfully');
      fixes.push('Updated custom_groups_with_stats view to include logo and banner');
    }
  } catch (error: any) {
    results.push(`   ❌ View update error: ${error.message}`);
  }

  // Summary
  results.push('\n🏁 Fix Attempt Complete!');
  
  if (fixes.length > 0) {
    results.push(`\n✅ Applied fixes: ${fixes.length}`);
    fixes.forEach((fix, index) => {
      results.push(`   ${index + 1}. ${fix}`);
    });
  }

  results.push('\n📋 Next Steps:');
  results.push('   1. Run the diagnostic again: GET /api/diagnose-custom-groups');
  results.push('   2. If manual SQL execution is needed, run the commands shown above');
  results.push('   3. Test uploading a new logo/banner to verify the fix');
  results.push('   4. Check existing custom groups to see if images now display');

  return NextResponse.json({
    success: fixes.length > 0,
    results: results.join('\n'),
    fixes: fixes,
    fixesApplied: fixes.length,
    message: fixes.length > 0 
      ? `Successfully applied ${fixes.length} fixes` 
      : 'No automatic fixes could be applied - manual intervention may be required'
  });
}
