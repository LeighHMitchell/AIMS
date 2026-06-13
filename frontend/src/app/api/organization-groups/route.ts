import { NextRequest, NextResponse } from "next/server";
import {
  loadOrganizationGroups,
  createOrganizationGroup,
  updateOrganizationGroup,
  deleteOrganizationGroup,
  getOrganizationGroupById
} from "@/lib/organizationGroups";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const groups = loadOrganizationGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching organization groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization groups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const data = await request.json().catch(() => null);
    if (!data) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    
    // Validate required fields
    if (!data.name || !data.organizationIds || data.organizationIds.length === 0) {
      return NextResponse.json(
        { error: "Group name and at least one organization are required" },
        { status: 400 }
      );
    }
    
    const groups = loadOrganizationGroups();
    
    // Check for duplicate name
    const duplicateName = groups.find(
      group => group.name.toLowerCase() === data.name.toLowerCase()
    );
    if (duplicateName) {
      return NextResponse.json(
        { error: "A group with this name already exists. Please use a different name." },
        { status: 409 }
      );
    }
    
    // Check for duplicate organization composition
    const sortedOrgIds = [...data.organizationIds].sort();
    const duplicateComposition = groups.find(group => {
      const sortedGroupOrgIds = [...group.organizationIds].sort();
      return JSON.stringify(sortedGroupOrgIds) === JSON.stringify(sortedOrgIds);
    });
    
    if (duplicateComposition) {
      return NextResponse.json(
        { 
          error: `This exact combination of organizations already exists in the group "${duplicateComposition.name}". Please use the existing group instead of creating a duplicate.` 
        },
        { status: 409 }
      );
    }
    
    // Use authenticated user identity — never trust client-supplied identity
    const newGroup = createOrganizationGroup({
      name: data.name,
      description: data.description || "",
      organizationIds: data.organizationIds,
      createdBy: user!.id,
      createdByName: user!.email ?? "Unknown User",
      isPublic: data.isPublic || false
    });
    
    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating organization group:", error);
    return NextResponse.json(
      { error: "Failed to create organization group" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }
    
    const data = await request.json().catch(() => null);
    if (!data) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    
    // Check if group exists
    const existingGroup = getOrganizationGroupById(id);
    if (!existingGroup) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }
    
    // Check for duplicate name (excluding current group)
    const groups = loadOrganizationGroups();
    const duplicateName = groups.find(
      group => group.id !== id && group.name.toLowerCase() === data.name.toLowerCase()
    );
    if (duplicateName) {
      return NextResponse.json(
        { error: "A group with this name already exists." },
        { status: 409 }
      );
    }
    
    // Use authenticated user identity — never trust client-supplied identity
    const updatedGroup = updateOrganizationGroup(
      id,
      {
        name: data.name,
        description: data.description,
        organizationIds: data.organizationIds,
        isPublic: data.isPublic
      },
      user!.id,
      user!.email ?? "Unknown User"
    );
    
    if (!updatedGroup) {
      return NextResponse.json(
        { error: "Failed to update group" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating organization group:", error);
    return NextResponse.json(
      { error: "Failed to update organization group" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }
    
    const success = deleteOrganizationGroup(id);
    
    if (!success) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting organization group:", error);
    return NextResponse.json(
      { error: "Failed to delete organization group" },
      { status: 500 }
    );
  }
} 