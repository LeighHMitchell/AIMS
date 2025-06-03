import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ActivityLogger } from '@/lib/activity-logger';

export interface Partner {
  id: string;
  name: string;
  code?: string;
  type?: string;
  iatiOrgId?: string;
  fullName?: string;
  acronym?: string;
  organisationType?: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  banner?: string;
  countryRepresented?: string;
  createdAt?: string;
  updatedAt?: string;
}

// GET /api/partners
export async function GET() {
  try {
    const { data: partners, error } = await supabaseAdmin
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AIMS] Error loading partners:', error);
      return NextResponse.json({ error: 'Failed to load partners' }, { status: 500 });
    }

    // Transform data to match expected format
    const transformedPartners = partners.map((partner: any) => ({
      id: partner.id,
      name: partner.name,
      code: partner.code,
      type: partner.type || 'development_partner',
      iatiOrgId: partner.iati_org_id,
      fullName: partner.full_name,
      acronym: partner.acronym,
      organisationType: partner.organisation_type,
      description: partner.description,
      website: partner.website,
      email: partner.email,
      phone: partner.phone,
      address: partner.address,
      logo: partner.logo,
      banner: partner.banner,
      countryRepresented: partner.country_represented,
      createdAt: partner.created_at,
      updatedAt: partner.updated_at,
    }));

    return NextResponse.json(transformedPartners);
  } catch (error) {
    console.error('[AIMS] Error loading partners:', error);
    return NextResponse.json({ error: 'Failed to load partners' }, { status: 500 });
  }
}

// POST /api/partners
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if partner with same name already exists
    const { data: existingPartners } = await supabaseAdmin
      .from('partners')
      .select('id')
      .ilike('name', body.name);
    
    if (existingPartners && existingPartners.length > 0) {
      return NextResponse.json({ error: 'Partner with this name already exists' }, { status: 400 });
    }
    
    // Create new partner
    const partnerData = {
      name: body.name,
      code: body.code,
      type: body.type || 'development_partner',
      iati_org_id: body.iatiOrgId,
      full_name: body.fullName,
      acronym: body.acronym,
      organisation_type: body.organisationType,
      description: body.description,
      website: body.website,
      email: body.email,
      phone: body.phone,
      address: body.address,
      logo: body.logo,
      banner: body.banner,
      country_represented: body.countryRepresented,
      country: body.country,
    };
    
    const { data: newPartner, error } = await supabaseAdmin
      .from('partners')
      .insert([partnerData])
      .select()
      .single();
    
    if (error) {
      console.error('[AIMS] Error creating partner:', error);
      return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 });
    }
    
    // Log the activity if user information is provided
    if (body.user) {
      await ActivityLogger.partnerAdded(newPartner, body.user);
    }
    
    console.log('[AIMS] Created new partner:', newPartner);
    
    // Transform the response to match expected format
    const transformedPartner = {
      id: newPartner.id,
      name: newPartner.name,
      code: newPartner.code,
      type: newPartner.type,
      iatiOrgId: newPartner.iati_org_id,
      fullName: newPartner.full_name,
      acronym: newPartner.acronym,
      organisationType: newPartner.organisation_type,
      description: newPartner.description,
      website: newPartner.website,
      email: newPartner.email,
      phone: newPartner.phone,
      address: newPartner.address,
      logo: newPartner.logo,
      banner: newPartner.banner,
      countryRepresented: newPartner.country_represented,
      createdAt: newPartner.created_at,
      updatedAt: newPartner.updated_at,
    };
    
    return NextResponse.json(transformedPartner, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Error creating partner:', error);
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}

// PUT /api/partners
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Get the existing partner
    const { data: existingPartner, error: fetchError } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('id', body.id)
      .single();
    
    if (fetchError || !existingPartner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    
    // Track what changed for detailed logging
    const changes: string[] = [];
    
    // Check specific field changes
    if (body.logo !== undefined && body.logo !== existingPartner.logo) {
      changes.push(body.logo ? 'uploaded new logo' : 'removed logo');
    }
    
    if (body.banner !== undefined && body.banner !== existingPartner.banner) {
      changes.push(body.banner ? 'uploaded new banner' : 'removed banner');
    }
    
    if (body.name !== existingPartner.name) {
      changes.push(`changed name from "${existingPartner.name}" to "${body.name}"`);
    }
    
    if (body.description !== existingPartner.description) {
      changes.push('updated description');
    }
    
    if (body.website !== existingPartner.website) {
      changes.push('updated website');
    }
    
    if (body.email !== existingPartner.email) {
      changes.push('updated email');
    }
    
    if (body.phone !== existingPartner.phone) {
      changes.push('updated phone');
    }
    
    if (body.address !== existingPartner.address) {
      changes.push('updated address');
    }
    
    if (body.type !== existingPartner.type) {
      changes.push(`changed type from "${existingPartner.type}" to "${body.type}"`);
    }
    
    if (body.countryRepresented !== existingPartner.country_represented) {
      changes.push(`updated country represented to "${body.countryRepresented}"`);
    }
    
    // Update partner
    const updateData = {
      name: body.name,
      code: body.code,
      type: body.type,
      iati_org_id: body.iatiOrgId,
      full_name: body.fullName,
      acronym: body.acronym,
      organisation_type: body.organisationType,
      description: body.description,
      website: body.website,
      email: body.email,
      phone: body.phone,
      address: body.address,
      logo: body.logo,
      banner: body.banner,
      country_represented: body.countryRepresented,
      country: body.country,
    };
    
    const { data: updatedPartner, error: updateError } = await supabaseAdmin
      .from('partners')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[AIMS] Error updating partner:', updateError);
      return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 });
    }
    
    // Log the activity if user information is provided
    if (body.user && changes.length > 0) {
      await ActivityLogger.partnerUpdated(
        updatedPartner, 
        body.user,
        {
          changes: changes.join(', '),
          details: `Updated ${updatedPartner.name}: ${changes.join(', ')}`
        }
      );
    }
    
    console.log('[AIMS] Updated partner:', updatedPartner);
    
    // Transform the response to match expected format
    const transformedPartner = {
      id: updatedPartner.id,
      name: updatedPartner.name,
      code: updatedPartner.code,
      type: updatedPartner.type,
      iatiOrgId: updatedPartner.iati_org_id,
      fullName: updatedPartner.full_name,
      acronym: updatedPartner.acronym,
      organisationType: updatedPartner.organisation_type,
      description: updatedPartner.description,
      website: updatedPartner.website,
      email: updatedPartner.email,
      phone: updatedPartner.phone,
      address: updatedPartner.address,
      logo: updatedPartner.logo,
      banner: updatedPartner.banner,
      countryRepresented: updatedPartner.country_represented,
      createdAt: updatedPartner.created_at,
      updatedAt: updatedPartner.updated_at,
    };
    
    return NextResponse.json(transformedPartner);
  } catch (error) {
    console.error('[AIMS] Error updating partner:', error);
    return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 });
  }
}

// DELETE /api/partners/[id]
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'Partner ID required' }, { status: 400 });
    }
    
    // Get the partner before deletion
    const { data: partner, error: fetchError } = await supabaseAdmin
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    
    // Delete the partner
    const { error: deleteError } = await supabaseAdmin
      .from('partners')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('[AIMS] Error deleting partner:', deleteError);
      return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 });
    }
    
    console.log('[AIMS] Deleted partner:', partner);
    return NextResponse.json({ message: 'Partner deleted successfully', partner });
  } catch (error) {
    console.error('[AIMS] Error deleting partner:', error);
    return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 });
  }
} 