import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Project, PROJECT_STATUS } from '@/types/project';
import { findSimilarProjects } from '@/lib/project-matching';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure data directory and file exist
async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(PROJECTS_FILE);
    } catch {
      await fs.writeFile(PROJECTS_FILE, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error ensuring data file:', error);
  }
}

// Load projects from file
async function loadProjects(): Promise<Project[]> {
  await ensureDataFile();
  try {
    const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

// Save projects to file
async function saveProjects(projects: Project[]) {
  await ensureDataFile();
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// GET /api/projects - Get all projects or search for similar projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const similarTo = searchParams.get('similarTo');
    const userId = searchParams.get('userId');
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status');

    const projects = await loadProjects();

    // Filter by search term
    let filteredProjects = projects;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProjects = filteredProjects.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (status) {
      filteredProjects = filteredProjects.filter(p => p.status === status);
    }

    // Filter by user's projects (created by)
    if (userId) {
      filteredProjects = filteredProjects.filter(p => p.createdByUserId === userId);
    }

    // Filter by organization
    if (orgId) {
      filteredProjects = filteredProjects.filter(p => p.createdByOrgId === orgId);
    }

    // Find similar projects
    if (similarTo) {
      try {
        const similarProject = JSON.parse(similarTo);
        const matches = findSimilarProjects(similarProject, projects);
        return NextResponse.json({ similar: matches });
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid similarTo parameter' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(filteredProjects);
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.description || !body.createdByUserId || !body.createdByOrgId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const projects = await loadProjects();

    // Check for duplicates
    const similarProjects = findSimilarProjects(body, projects);
    if (similarProjects.length > 0 && !body.forceCreate) {
      return NextResponse.json(
        { 
          error: 'Similar projects found',
          similar: similarProjects
        },
        { status: 409 }
      );
    }

    // Create new project
    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: body.title,
      description: body.description,
      objectives: body.objectives,
      targetGroups: body.targetGroups,
      createdByUserId: body.createdByUserId,
      createdByOrgId: body.createdByOrgId,
      createdByOrgName: body.createdByOrgName,
      createdByUserName: body.createdByUserName,
      status: PROJECT_STATUS.PENDING_VALIDATION,
      plannedStartDate: body.plannedStartDate,
      plannedEndDate: body.plannedEndDate,
      locations: body.locations || [],
      sectors: body.sectors || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    projects.push(newProject);
    await saveProjects(projects);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id - Update a project
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projects = await loadProjects();
    const projectIndex = projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update project
    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await saveProjects(projects);

    return NextResponse.json(projects[projectIndex]);
  } catch (error) {
    console.error('Error in PATCH /api/projects:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - Delete a project
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projects = await loadProjects();
    const filteredProjects = projects.filter(p => p.id !== id);

    if (filteredProjects.length === projects.length) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await saveProjects(filteredProjects);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
} 