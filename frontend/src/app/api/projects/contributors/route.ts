import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProjectContributor, CONTRIBUTOR_STATUS } from '@/types/project';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONTRIBUTORS_FILE = path.join(DATA_DIR, 'project-contributors.json');

// Ensure data file exists
async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(CONTRIBUTORS_FILE);
    } catch {
      await fs.writeFile(CONTRIBUTORS_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error ensuring contributors file:', error);
  }
}

// Load contributors
async function loadContributors(): Promise<ProjectContributor[]> {
  await ensureDataFile();
  try {
    const data = await fs.readFile(CONTRIBUTORS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading contributors:', error);
    return [];
  }
}

// Save contributors
async function saveContributors(contributors: ProjectContributor[]) {
  await ensureDataFile();
  await fs.writeFile(CONTRIBUTORS_FILE, JSON.stringify(contributors, null, 2));
}

// GET /api/projects/contributors
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status');

    const contributors = await loadContributors();

    let filtered = contributors;

    // Filter by project
    if (projectId) {
      filtered = filtered.filter(c => c.projectId === projectId);
    }

    // Filter by organization
    if (orgId) {
      filtered = filtered.filter(c => c.organizationId === orgId);
    }

    // Filter by status
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error in GET /api/projects/contributors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributors' },
      { status: 500 }
    );
  }
}

// POST /api/projects/contributors - Nominate a contributor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.projectId || !body.organizationId || !body.nominatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const contributors = await loadContributors();

    // Check if already exists
    const exists = contributors.some(c => 
      c.projectId === body.projectId && 
      c.organizationId === body.organizationId
    );

    if (exists) {
      return NextResponse.json(
        { error: 'Contributor already exists for this project' },
        { status: 409 }
      );
    }

    // Create new contributor
    const newContributor: ProjectContributor = {
      id: uuidv4(),
      projectId: body.projectId,
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      status: CONTRIBUTOR_STATUS.NOMINATED,
      nominatedBy: body.nominatedBy,
      nominatedByName: body.nominatedByName,
      nominatedAt: new Date().toISOString(),
      canEditOwnData: true,
      canViewOtherDrafts: false,
      canValidate: false,
      emailNotifications: true,
      systemNotifications: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    contributors.push(newContributor);
    await saveContributors(contributors);

    return NextResponse.json(newContributor, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/contributors:', error);
    return NextResponse.json(
      { error: 'Failed to create contributor' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/contributors - Update contributor status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, respondedAt } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const contributors = await loadContributors();
    const index = contributors.findIndex(c => c.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Contributor not found' },
        { status: 404 }
      );
    }

    // Update contributor
    contributors[index] = {
      ...contributors[index],
      status,
      respondedAt: respondedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveContributors(contributors);

    return NextResponse.json(contributors[index]);
  } catch (error) {
    console.error('Error in PATCH /api/projects/contributors:', error);
    return NextResponse.json(
      { error: 'Failed to update contributor' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/contributors
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Contributor ID is required' },
        { status: 400 }
      );
    }

    const contributors = await loadContributors();
    const filtered = contributors.filter(c => c.id !== id);

    if (filtered.length === contributors.length) {
      return NextResponse.json(
        { error: 'Contributor not found' },
        { status: 404 }
      );
    }

    await saveContributors(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects/contributors:', error);
    return NextResponse.json(
      { error: 'Failed to delete contributor' },
      { status: 500 }
    );
  }
} 