import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('[AIMS DEBUG] Comparing partners and organizations tables');
  
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    // Fetch from partners table
    const { data: partners, error: partnersError } = await supabaseAdmin
      .from('partners')
      .select('id, name, type, created_at')
      .order('name');
      
    if (partnersError) {
      console.error('[AIMS DEBUG] Error fetching partners:', partnersError);
    }
    
    // Fetch from organizations table
    const { data: organizations, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, type, created_at')
      .order('name');
      
    if (orgsError) {
      console.error('[AIMS DEBUG] Error fetching organizations:', orgsError);
    }
    
    // Compare the two tables
    const partnersMap = new Map((partners || []).map((p: any) => [p.id, p]));
    const orgsMap = new Map((organizations || []).map((o: any) => [o.id, o]));
    
    const onlyInPartners = (partners || []).filter((p: any) => !orgsMap.has(p.id));
    const onlyInOrganizations = (organizations || []).filter((o: any) => !partnersMap.has(o.id));
    const inBoth = (partners || []).filter((p: any) => orgsMap.has(p.id));
    
    const result = {
      summary: {
        partnersCount: partners?.length || 0,
        organizationsCount: organizations?.length || 0,
        onlyInPartnersCount: onlyInPartners.length,
        onlyInOrganizationsCount: onlyInOrganizations.length,
        inBothCount: inBoth.length,
      },
      onlyInPartners,
      onlyInOrganizations,
      recommendation: '',
    };
    
    // Add recommendation
    if (onlyInPartners.length > 0 && onlyInOrganizations.length === 0) {
      result.recommendation = 'The partners table has entries not in organizations. Consider migrating partners to organizations table.';
    } else if (onlyInOrganizations.length > 0 && onlyInPartners.length === 0) {
      result.recommendation = 'The organizations table is the correct source. Update your API to use organizations instead of partners.';
    } else if (onlyInPartners.length > 0 && onlyInOrganizations.length > 0) {
      result.recommendation = 'Both tables have unique entries. Data sync is needed between partners and organizations tables.';
    } else {
      result.recommendation = 'Tables are in sync.';
    }
    
    console.log('[AIMS DEBUG] Comparison result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[AIMS DEBUG] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 