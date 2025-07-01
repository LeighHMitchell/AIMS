import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findSimilarProjects } from '@/lib/project-matching';
import { PROJECT_STATUS } from '@/types/project';

// Force dynamic rendering to ensure environment variables are always loaded
export const dynamic = 'force-dynamic';

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// GET /api/projects - Get all projects or search for similar projects
export async function GET(request: NextRequest) {
  try {
    // Check if getSupabaseAdmin is properly initialized
    if (!getSupabaseAdmin()) {
      console.error('[AIMS] getSupabaseAdmin() is not initialized');
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const similarTo = searchParams.get('similarTo');
    const userId = searchParams.get('userId');
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status');

    // Build query
    let query = getSupabaseAdmin()
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by search term
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by user's projects (created by)
    if (userId) {
      query = query.eq('created_by', userId);
    }

    // Filter by organization
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    // Transform to match expected format
    const transformedProjects = projects.map((project: any) => ({
      id: project.id,
      title: project.name, // map name to title
      description: project.description,
      objectives: project.objectives,
      targetGroups: project.target_groups,
      createdByUserId: project.created_by,
      createdByOrgId: project.organization_id,
      createdByOrgName: project.created_by_org_name,
      createdByUserName: project.created_by_user_name,
      status: project.status || PROJECT_STATUS.PENDING_VALIDATION,
      plannedStartDate: project.start_date,
      plannedEndDate: project.end_date,
      locations: project.locations || [],
      sectors: project.sectors || [],
      budget: project.budget,
      currency: project.currency,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    }));

    // Find similar projects
    if (similarTo) {
      try {
        const similarProject = JSON.parse(similarTo);
        const matches = findSimilarProjects(similarProject, transformedProjects);
        return NextResponse.json({ similar: matches });
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid similarTo parameter' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(transformedProjects);
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

    // Check for duplicates
    const { data: existingProjects } = await getSupabaseAdmin()
      .from('projects')
      .select('*');
    
    if (existingProjects) {
      const transformedExisting = existingProjects.map((p: any) => ({
        id: p.id,
        title: p.name,
        description: p.description,
        objectives: p.objectives,
        targetGroups: p.target_groups,
        plannedStartDate: p.start_date,
        plannedEndDate: p.end_date,
        locations: p.locations || [],
        sectors: p.sectors || [],
        createdByUserId: p.created_by,
        createdByOrgId: p.organization_id,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      const similarProjects = findSimilarProjects(body, transformedExisting);
      if (similarProjects.length > 0 && !body.forceCreate) {
        return NextResponse.json(
          { 
            error: 'Similar projects found',
            similar: similarProjects
          },
          { status: 409 }
        );
      }
    }

    // Create new project
    const projectData = {
      name: body.title, // map title to name
      description: body.description,
      objectives: body.objectives,
      target_groups: body.targetGroups,
      created_by: body.createdByUserId,
      organization_id: body.createdByOrgId,
      created_by_org_name: body.createdByOrgName,
      created_by_user_name: body.createdByUserName,
      status: PROJECT_STATUS.PENDING_VALIDATION,
      start_date: body.plannedStartDate,
      end_date: body.plannedEndDate,
      locations: body.locations || [],
      sectors: body.sectors || [],
      budget: body.budget,
      currency: body.currency || 'USD',
    };

    const { data: newProject, error } = await getSupabaseAdmin()
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    // Transform response
    const transformedProject = {
      id: newProject.id,
      title: newProject.name,
      description: newProject.description,
      objectives: newProject.objectives,
      targetGroups: newProject.target_groups,
      createdByUserId: newProject.created_by,
      createdByOrgId: newProject.organization_id,
      createdByOrgName: newProject.created_by_org_name,
      createdByUserName: newProject.created_by_user_name,
      status: newProject.status,
      plannedStartDate: newProject.start_date,
      plannedEndDate: newProject.end_date,
      locations: newProject.locations || [],
      sectors: newProject.sectors || [],
      budget: newProject.budget,
      currency: newProject.currency,
      createdAt: newProject.created_at,
      updatedAt: newProject.updated_at,
    };

    return NextResponse.json(transformedProject, { status: 201 });
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

    // Transform updates to match database schema
    const updateData: any = {};
    if (updates.title !== undefined) updateData.name = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.objectives !== undefined) updateData.objectives = updates.objectives;
    if (updates.targetGroups !== undefined) updateData.target_groups = updates.targetGroups;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.plannedStartDate !== undefined) updateData.start_date = updates.plannedStartDate;
    if (updates.plannedEndDate !== undefined) updateData.end_date = updates.plannedEndDate;
    if (updates.locations !== undefined) updateData.locations = updates.locations;
    if (updates.sectors !== undefined) updateData.sectors = updates.sectors;
    if (updates.budget !== undefined) updateData.budget = updates.budget;
    if (updates.currency !== undefined) updateData.currency = updates.currency;

    const { data: updatedProject, error } = await getSupabaseAdmin()
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Transform response
    const transformedProject = {
      id: updatedProject.id,
      title: updatedProject.name,
      description: updatedProject.description,
      objectives: updatedProject.objectives,
      targetGroups: updatedProject.target_groups,
      createdByUserId: updatedProject.created_by,
      createdByOrgId: updatedProject.organization_id,
      createdByOrgName: updatedProject.created_by_org_name,
      createdByUserName: updatedProject.created_by_user_name,
      status: updatedProject.status,
      plannedStartDate: updatedProject.start_date,
      plannedEndDate: updatedProject.end_date,
      locations: updatedProject.locations || [],
      sectors: updatedProject.sectors || [],
      budget: updatedProject.budget,
      currency: updatedProject.currency,
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
    };

    return NextResponse.json(transformedProject);
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

    const { error } = await getSupabaseAdmin()
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/projects:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
} 