import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Only allow in development
const isDevelopment = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'Migrations can only be run in development' },
      { status: 403 }
    );
  }

  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const results = [];

    // Create sectors table
    const sectorsTableSQL = `
      CREATE TABLE IF NOT EXISTS public.sectors (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        vocabulary VARCHAR(50) DEFAULT 'DAC',
        parent_code VARCHAR(10),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const { error: sectorsError } = await supabase.from('sectors').select('id').limit(1);
    
    if (sectorsError?.code === '42P01') {
      // Table doesn't exist, create it
      const { error } = await supabase.rpc('exec', { sql: sectorsTableSQL });
      if (error) {
        results.push({ table: 'sectors', status: 'error', error });
      } else {
        results.push({ table: 'sectors', status: 'created' });
      }
    } else {
      results.push({ table: 'sectors', status: 'exists' });
    }

    // Create activity_sectors table
    const activitySectorsTableSQL = `
      CREATE TABLE IF NOT EXISTS public.activity_sectors (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
        sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
        percentage DECIMAL(5,2) DEFAULT 100.00 CHECK (percentage >= 0 AND percentage <= 100),
        vocabulary VARCHAR(50) DEFAULT 'DAC',
        vocabulary_uri VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, sector_id)
      );
    `;

    const { error: activitySectorsError } = await supabase.from('activity_sectors').select('id').limit(1);
    
    if (activitySectorsError?.code === '42P01') {
      // Table doesn't exist, create it
      const { error } = await supabase.rpc('exec', { sql: activitySectorsTableSQL });
      if (error) {
        results.push({ table: 'activity_sectors', status: 'error', error });
      } else {
        results.push({ table: 'activity_sectors', status: 'created' });
      }
    } else {
      results.push({ table: 'activity_sectors', status: 'exists' });
    }

    // Create custom_groups table
    const customGroupsTableSQL = `
      CREATE TABLE IF NOT EXISTS public.custom_groups (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const { error: customGroupsError } = await supabase.from('custom_groups').select('id').limit(1);
    
    if (customGroupsError?.code === '42P01') {
      // Table doesn't exist, create it
      const { error } = await supabase.rpc('exec', { sql: customGroupsTableSQL });
      if (error) {
        results.push({ table: 'custom_groups', status: 'error', error });
      } else {
        results.push({ table: 'custom_groups', status: 'created' });
      }
    } else {
      results.push({ table: 'custom_groups', status: 'exists' });
    }

    // Create custom_group_organizations table
    const customGroupOrgsTableSQL = `
      CREATE TABLE IF NOT EXISTS public.custom_group_organizations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        custom_group_id UUID NOT NULL REFERENCES public.custom_groups(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        added_by UUID REFERENCES auth.users(id),
        UNIQUE(custom_group_id, organization_id)
      );
    `;

    const { error: customGroupOrgsError } = await supabase.from('custom_group_organizations').select('id').limit(1);
    
    if (customGroupOrgsError?.code === '42P01') {
      // Table doesn't exist, create it
      const { error } = await supabase.rpc('exec', { sql: customGroupOrgsTableSQL });
      if (error) {
        results.push({ table: 'custom_group_organizations', status: 'error', error });
      } else {
        results.push({ table: 'custom_group_organizations', status: 'created' });
      }
    } else {
      results.push({ table: 'custom_group_organizations', status: 'exists' });
    }

    // Insert DAC sectors if sectors table is empty
    const { count } = await supabase
      .from('sectors')
      .select('*', { count: 'exact', head: true });

    if (count === 0) {
      const dacSectors = [
        { code: '111', name: 'Education, level unspecified', category: 'Social Infrastructure & Services' },
        { code: '112', name: 'Basic education', category: 'Social Infrastructure & Services' },
        { code: '113', name: 'Secondary education', category: 'Social Infrastructure & Services' },
        { code: '121', name: 'Health, general', category: 'Social Infrastructure & Services' },
        { code: '122', name: 'Basic health', category: 'Social Infrastructure & Services' },
        { code: '130', name: 'Population policies/programmes & reproductive health', category: 'Social Infrastructure & Services' },
        { code: '140', name: 'Water supply & sanitation', category: 'Social Infrastructure & Services' },
        { code: '151', name: 'Government & civil society-general', category: 'Social Infrastructure & Services' },
        { code: '210', name: 'Transport & storage', category: 'Economic Infrastructure & Services' },
        { code: '220', name: 'Communications', category: 'Economic Infrastructure & Services' },
        { code: '230', name: 'Energy', category: 'Economic Infrastructure & Services' },
        { code: '311', name: 'Agriculture', category: 'Production Sectors' },
        { code: '321', name: 'Industry', category: 'Production Sectors' },
        { code: '410', name: 'General environment protection', category: 'Multi-Sector / Cross-Cutting' },
        { code: '720', name: 'Emergency response', category: 'Humanitarian Aid' },
        { code: '998', name: 'Unallocated / Unspecified', category: 'Unallocated / Unspecified' }
      ];

      const { error: insertError } = await supabase
        .from('sectors')
        .insert(dacSectors);

      if (insertError) {
        results.push({ table: 'sectors_data', status: 'error', error: insertError });
      } else {
        results.push({ table: 'sectors_data', status: 'inserted', count: dacSectors.length });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Migration check completed'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 