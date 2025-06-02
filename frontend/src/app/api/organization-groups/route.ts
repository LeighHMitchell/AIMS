import { NextRequest, NextResponse } from "next/server";
import { 
  loadOrganizationGroups, 
  createOrganizationGroup, 
  updateOrganizationGroup, 
  deleteOrganizationGroup,
  getOrganizationGroupById 
} from "@/lib/organizationGroups";

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
  try {
    const data = await request.json();
    
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
    
    // Create new group - expect createdByName from client
    const newGroup = createOrganizationGroup({
      name: data.name,
      description: data.description || "",
      organizationIds: data.organizationIds,
      createdBy: data.createdBy || "1",
      createdByName: data.createdByName || "Unknown User"
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    
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
    
    // Update group - expect updatedByName from client
    const updatedGroup = updateOrganizationGroup(
      id, 
      {
        name: data.name,
        description: data.description,
        organizationIds: data.organizationIds
      },
      data.updatedBy || "1",
      data.updatedByName || "Unknown User"
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