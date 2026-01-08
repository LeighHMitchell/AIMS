import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ActivityLogger } from '@/lib/activity-logger';
import { calculateCooperationModality } from '@/components/OrganizationFieldHelpers';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Get system home country from database
async function getSystemHomeCountry(supabaseAdmin: any): Promise<string> {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('system_settings')
      .select('home_country')
      .single();

    if (error) {
      console.log('Error fetching system settings, using default:', error.message);
      return 'RW'; // Default fallback
    }

    return settings?.home_country || 'RW';
  } catch (error) {
    console.log('System settings not found, using default');
    return 'RW'; // Default fallback
  }
}

// Create Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[AIMS] Missing Supabase environment variables');
    throw new Error('Missing required environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// GET /api/partners/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();
    const homeCountry = await getSystemHomeCountry(supabaseAdmin);

    console.log('[AIMS] GET /api/partners/[id] - Fetching:', id);

    if (!id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    // Try Supabase first if available
    try {
      console.log('[AIMS] Attempting Supabase fetch...');
      
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[AIMS] Supabase error fetching organization:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      console.log('[AIMS] Fetched organization from Supabase:', data);
      
      // Transform to partner format
      const isDevelopmentPartner = data.is_development_partner || false;
      const countryRepresented = data.country_represented || data.country || null;
      const organisationType = data.organisation_type || null;
      const orgClassificationOverride = data.org_classification_override || false;
      
      const partner = {
        ...data,
        iatiOrgId: data.iati_org_id,
        fullName: data.full_name,
        organisationType,
        cooperationModality: data.cooperation_modality,
        isDevelopmentPartner,
        countryRepresented,
        orgClassificationOverride,
        // Calculate classification automatically
        orgClassification: calculateCooperationModality(
          countryRepresented || "",
          organisationType || "",
          homeCountry
        ),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      const response = NextResponse.json(partner);
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
      
    } catch (supabaseError) {
      console.log('[AIMS] Supabase failed, falling back to file storage:', supabaseError);
      
      // Fallback to file-based storage
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const partnersFilePath = path.join(process.cwd(), 'data', 'partners.json');
      
      try {
        // Read existing partners
        let partners: any[] = [];
        try {
          const fileContent = await fs.readFile(partnersFilePath, 'utf-8');
          partners = JSON.parse(fileContent);
          if (!Array.isArray(partners)) {
            partners = [];
          }
        } catch (fileError) {
          console.log('[AIMS] Partners file not found');
          return NextResponse.json(
            { error: 'Partner not found' },
            { status: 404 }
          );
        }

        // Find the partner
        const partner = partners.find(p => p.id === id);
        
        if (!partner) {
          console.error('[AIMS] Partner not found in file storage:', id);
          return NextResponse.json(
            { error: 'Partner not found' },
            { status: 404 }
          );
        }

        console.log('[AIMS] Successfully fetched partner from file storage');
        
        const response = NextResponse.json(partner);
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
        
      } catch (fileError) {
        console.error('[AIMS] Error fetching partner from file storage:', fileError);
        return NextResponse.json(
          { error: 'Failed to fetch partner' },
          { status: 500 }
        );
      }
    }
    
  } catch (error) {
    console.error('[AIMS] Unexpected error fetching partner:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/partners/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();
    const homeCountry = await getSystemHomeCountry(supabaseAdmin);
    const body = await request.json();
    const { user, ...updates } = body;  // Extract user separately so it's not included in updates

    console.log('[AIMS] PUT /api/partners/[id] - Updating:', id);
    console.log('[AIMS] Request body:', JSON.stringify(body, null, 2));

    if (!id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    // Try Supabase first if available
    try {
      console.log('[AIMS] Attempting Supabase update...');
      
      // Create Supabase client
      const supabaseAdmin = getSupabaseAdmin();

      // Map partner fields to organization fields
      const organizationUpdates = {
        ...updates,
        iati_org_id: updates.iatiOrgId || updates.iati_org_id,
        full_name: updates.fullName || updates.full_name,
        organisation_type: updates.organisationType || updates.organisation_type,
        cooperation_modality: updates.cooperationModality || updates.cooperation_modality,
        country_represented: updates.countryRepresented || updates.country_represented,
      };

      // Remove camelCase fields and fields that don't exist in Supabase
      delete organizationUpdates.iatiOrgId;
      delete organizationUpdates.fullName;
      delete organizationUpdates.organisationType;
      delete organizationUpdates.cooperationModality;
      delete organizationUpdates.isDevelopmentPartner;
      delete organizationUpdates.countryRepresented;
      delete organizationUpdates.orgClassificationOverride;
      delete organizationUpdates.orgClassificationManual;
      delete organizationUpdates.orgClassification; // This column doesn't exist in Supabase
      
      // Ensure we never try to update the id or any other system fields
      delete organizationUpdates.id;
      delete organizationUpdates.created_at;
      delete organizationUpdates.updated_at;

      console.log('[AIMS] Organization updates to apply:', JSON.stringify(organizationUpdates, null, 2));

      const { data, error } = await supabaseAdmin
        .from('organizations')
        .update(organizationUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[AIMS] Supabase error updating organization:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      console.log('[AIMS] Updated organization in Supabase:', data);
      
      // Log the activity if user information is provided
      if (user) {
        try {
          await ActivityLogger.partnerUpdated(data, user);
        } catch (logError) {
          console.warn('[AIMS] Failed to log activity:', logError);
        }
      }
      
      // Transform back to partner format
      const isDevelopmentPartner = data.is_development_partner || false;
      const countryRepresented = data.country_represented || data.country || null;
      const organisationType = data.organisation_type || null;
      const orgClassificationOverride = data.org_classification_override || false;
      
      const partner = {
        ...data,
        iatiOrgId: data.iati_org_id,
        fullName: data.full_name,
        organisationType,
        cooperationModality: data.cooperation_modality,
        isDevelopmentPartner,
        countryRepresented,
        orgClassificationOverride,
        // Calculate classification automatically
        orgClassification: calculateCooperationModality(
          countryRepresented || "",
          organisationType || "",
          homeCountry
        ),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      const response = NextResponse.json(partner);
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
      
    } catch (supabaseError) {
      console.log('[AIMS] Supabase failed, falling back to file storage:', supabaseError);
      
      // Fallback to file-based storage
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const partnersFilePath = path.join(process.cwd(), 'data', 'partners.json');
      
      try {
        // Read existing partners
        let partners: any[] = [];
        try {
          const fileContent = await fs.readFile(partnersFilePath, 'utf-8');
          partners = JSON.parse(fileContent);
          if (!Array.isArray(partners)) {
            partners = [];
          }
        } catch (fileError) {
          console.log('[AIMS] Partners file not found, creating empty array');
          partners = [];
        }

        // Find and update the partner
        const partnerIndex = partners.findIndex(p => p.id === id);
        
        if (partnerIndex === -1) {
          console.error('[AIMS] Partner not found in file storage:', id);
          return NextResponse.json(
            { error: 'Partner not found' },
            { status: 404 }
          );
        }

        const existingPartner = partners[partnerIndex];
        
        // Merge updates with existing data
        const updatedPartner = {
          ...existingPartner,
          ...updates,
          id, // Ensure ID doesn't change
          updatedAt: new Date().toISOString(),
          // Calculate classification automatically
          orgClassification: calculateCooperationModality(
            updates.countryRepresented || existingPartner.countryRepresented || "",
            updates.organisationType || existingPartner.organisationType || "",
            homeCountry
          ),
        };

        // Replace the partner in the array
        partners[partnerIndex] = updatedPartner;

        // Save back to file
        await fs.writeFile(partnersFilePath, JSON.stringify(partners, null, 2));
        
        console.log('[AIMS] Successfully updated partner in file storage');
        
        const response = NextResponse.json(updatedPartner);
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
        
      } catch (fileError) {
        console.error('[AIMS] Error updating partner in file storage:', fileError);
        return NextResponse.json(
          { error: 'Failed to update partner' },
          { status: 500 }
        );
      }
    }
    
  } catch (error) {
    console.error('[AIMS] Unexpected error updating partner:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/partners/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    console.log('[AIMS] DELETE /api/partners/[id] - Deleting organization:', id);

    if (!id) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabaseAdmin = getSupabaseAdmin();

    // First, get the organization details for logging
    const { data: organization, error: fetchError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !organization) {
      console.error('[AIMS] Organization not found:', fetchError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if organization has users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('organization_id', id);

    if (usersError) {
      console.error('[AIMS] Error checking users:', usersError);
      return NextResponse.json({ error: 'Failed to check organization dependencies' }, { status: 500 });
    }

    if (users && users.length > 0) {
      console.log('[AIMS] Cannot delete organization with users:', users.length);
      return NextResponse.json(
        { 
          error: 'Cannot delete organization with assigned users',
          details: `This organization has ${users.length} user(s) assigned to it. Please reassign or remove these users before deleting the organization.`,
          users: users.map(u => ({ id: u.id, name: u.name }))
        },
        { status: 400 }
      );
    }

    // Check if organization is involved in activities
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('activities')
      .select('id, title')
      .eq('created_by_org', id)
      .limit(5);

    if (activitiesError) {
      console.error('[AIMS] Error checking activities:', activitiesError);
      // Continue with deletion even if we can't check activities
    }

    if (activities && activities.length > 0) {
      console.log('[AIMS] Warning: Organization has activities associated:', activities.length);
      return NextResponse.json(
        { 
          error: 'Cannot delete organization with associated activities',
          details: `This organization has ${activities.length} activities associated with it. Please reassign or remove these activities before deleting the organization.`,
          activities: activities.map(a => ({ id: a.id, title: a.title }))
        },
        { status: 400 }
      );
    }

    // Proceed with deletion
    const { error: deleteError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[AIMS] Error deleting organization:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('[AIMS] Successfully deleted organization:', organization.name);
    
    const response = NextResponse.json({ 
      success: true, 
      message: `Organization "${organization.name}" has been deleted successfully.`
    });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
    
  } catch (error) {
    console.error('[AIMS] Unexpected error deleting partner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 