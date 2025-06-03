import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ActivityLogger } from '@/lib/activity-logger';

// Define Partner type
export interface Partner {
  id: string;
  name: string;
  code?: string; // Partner code (e.g., MM-FERD-1)
  type: 'development_partner' | 'partner_government' | 'bilateral' | 'other';
  iatiOrgId?: string; // IATI Organisation Identifier
  fullName?: string; // Official full name
  acronym?: string; // Short name/abbreviation
  organisationType?: string; // IATI organisation type code
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string; // Base64 encoded image
  banner?: string; // Base64 encoded image
  countryRepresented?: string; // Required for bilateral partners
  createdAt: string;
  updatedAt: string;
}

// Path to the data file
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'partners.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load partners from file
async function loadPartners(): Promise<Partner[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('[AIMS] No existing partners file found, starting with default partners');
    // Initialize with some default partners
    const defaultPartners: Partner[] = [
      {
        id: '1',
        name: 'World Bank',
        code: 'WB',
        type: 'development_partner',
        description: 'International financial institution',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'UNDP',
        code: 'UNDP',
        type: 'development_partner',
        description: 'United Nations Development Programme',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'Ministry of Agriculture, Livestock and Irrigation',
        code: 'MM-FERD-1',
        type: 'partner_government',
        description: 'Government ministry responsible for agriculture, livestock and irrigation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '4',
        name: 'Ministry of Planning and Finance',
        code: 'MM-MPF-1',
        type: 'partner_government',
        description: 'Government ministry responsible for planning and finance',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '5',
        name: 'Ministry of Education',
        code: 'MM-MOE-1',
        type: 'partner_government',
        description: 'Government ministry responsible for education',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await savePartners(defaultPartners);
    return defaultPartners;
  }
}

// Save partners to file
async function savePartners(partners: Partner[]): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(partners, null, 2));
  console.log('[AIMS] Partners saved to file');
}

// GET /api/partners
export async function GET() {
  try {
    const partners = await loadPartners();
    return NextResponse.json(partners);
  } catch (error) {
    console.error('[AIMS] Error loading partners:', error);
    return NextResponse.json({ error: 'Failed to load partners' }, { status: 500 });
  }
}

// POST /api/partners
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const partners = await loadPartners();
    
    // Create new partner
    const newPartner: Partner = {
      id: body.id || Math.random().toString(36).substring(7),
      name: body.name,
      code: body.code,
      type: body.type || 'development_partner',
      description: body.description,
      website: body.website,
      email: body.email,
      phone: body.phone,
      address: body.address,
      logo: body.logo,
      banner: body.banner,
      countryRepresented: body.countryRepresented,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Check if partner with same name already exists
    const existingPartner = partners.find(p => p.name.toLowerCase() === newPartner.name.toLowerCase());
    if (existingPartner) {
      return NextResponse.json({ error: 'Partner with this name already exists' }, { status: 400 });
    }
    
    partners.push(newPartner);
    await savePartners(partners);
    
    // Log the activity if user information is provided
    if (body.user) {
      await ActivityLogger.partnerAdded(newPartner, body.user);
    }
    
    console.log('[AIMS] Created new partner:', newPartner);
    return NextResponse.json(newPartner, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Error creating partner:', error);
    return NextResponse.json({ error: 'Failed to create partner' }, { status: 500 });
  }
}

// PUT /api/partners
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const partners = await loadPartners();
    
    const index = partners.findIndex(p => p.id === body.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    
    const originalPartner = partners[index];
    
    // Track what changed for detailed logging
    const changes: string[] = [];
    
    // Check specific field changes
    if (body.logo !== undefined && body.logo !== originalPartner.logo) {
      changes.push(body.logo ? 'uploaded new logo' : 'removed logo');
    }
    
    if (body.banner !== undefined && body.banner !== originalPartner.banner) {
      changes.push(body.banner ? 'uploaded new banner' : 'removed banner');
    }
    
    if (body.name !== originalPartner.name) {
      changes.push(`changed name from "${originalPartner.name}" to "${body.name}"`);
    }
    
    if (body.description !== originalPartner.description) {
      changes.push('updated description');
    }
    
    if (body.website !== originalPartner.website) {
      changes.push('updated website');
    }
    
    if (body.email !== originalPartner.email) {
      changes.push('updated email');
    }
    
    if (body.phone !== originalPartner.phone) {
      changes.push('updated phone');
    }
    
    if (body.address !== originalPartner.address) {
      changes.push('updated address');
    }
    
    if (body.type !== originalPartner.type) {
      changes.push(`changed type from "${originalPartner.type}" to "${body.type}"`);
    }
    
    if (body.countryRepresented !== originalPartner.countryRepresented) {
      changes.push(`updated country represented to "${body.countryRepresented}"`);
    }
    
    // Update partner
    partners[index] = {
      ...partners[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    await savePartners(partners);
    
    // Log the activity if user information is provided
    if (body.user && changes.length > 0) {
      await ActivityLogger.partnerUpdated(
        partners[index], 
        body.user,
        {
          changes: changes.join(', '),
          details: `Updated ${partners[index].name}: ${changes.join(', ')}`
        }
      );
    }
    
    console.log('[AIMS] Updated partner:', partners[index]);
    return NextResponse.json(partners[index]);
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
    
    const partners = await loadPartners();
    const index = partners.findIndex(p => p.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }
    
    const deletedPartner = partners[index];
    partners.splice(index, 1);
    await savePartners(partners);
    
    console.log('[AIMS] Deleted partner:', deletedPartner);
    return NextResponse.json({ message: 'Partner deleted successfully', partner: deletedPartner });
  } catch (error) {
    console.error('[AIMS] Error deleting partner:', error);
    return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 });
  }
} 