import { NextResponse, NextRequest } from 'next/server';
import { Transaction } from '@/types/transaction';
import fs from 'fs/promises';
import path from 'path';
import { ActivityLogger } from '@/lib/activity-logger';

// Define Comment type for activity discussions
interface ActivityComment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
  type: 'comment' | 'query' | 'response';
}

// Define Contributor type for multi-partner collaboration
interface ActivityContributor {
  id: string;
  organizationId: string;
  organizationName: string;
  status: 'nominated' | 'accepted' | 'declined' | 'requested';
  nominatedBy: string;
  nominatedByName: string;
  nominatedAt: string;
  respondedAt?: string;
  canEditOwnData: boolean;
  canViewOtherDrafts: boolean;
  createdAt: string;
  updatedAt: string;
}

// Define Activity type
interface Activity {
  id: string;
  partnerId: string;
  iatiId: string;
  title: string;
  description: string;
  objectives: string;
  targetGroups: string;
  collaborationType: string;
  activityStatus: string; // IATI activity status (planning, implementation, completed, etc.)
  publicationStatus: string; // Publication status (draft or published)
  banner?: string; // Base64 encoded banner image
  createdByOrg?: string; // Organization that created the activity
  
  // Multi-contributor fields
  contributors?: ActivityContributor[]; // Organizations contributing to this activity
  contributorTransactions?: { [orgId: string]: Transaction[] }; // Transactions separated by contributor
  contributorResults?: { [orgId: string]: any[] }; // Results separated by contributor
  contributorActivities?: { [orgId: string]: any }; // Activity descriptions per contributor
  
  // Partner organisations
  extendingPartners?: Array<{ orgId: string; name: string }>;
  implementingPartners?: Array<{ orgId: string; name: string }>;
  governmentPartners?: Array<{ orgId: string; name: string }>;
  
  // Workflow fields
  submissionStatus: 'draft' | 'submitted' | 'validated' | 'rejected' | 'published';
  submittedBy?: string; // User ID who submitted
  submittedByName?: string; // User name for display
  submittedAt?: string; // Timestamp
  validatedBy?: string; // User ID who validated
  validatedByName?: string; // User name for display
  validatedAt?: string; // Timestamp
  publishedBy?: string; // User ID who published
  publishedByName?: string; // User name for display
  publishedAt?: string; // Timestamp
  rejectedBy?: string; // User ID who rejected
  rejectedByName?: string; // User name for display
  rejectedAt?: string; // Timestamp
  rejectionReason?: string;
  
  // Comments and queries
  comments?: ActivityComment[];
  
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  sectors?: any[];
  transactions?: Transaction[]; // Legacy - for backward compatibility
  createdAt: string;
  updatedAt: string;
  // Legacy field for backward compatibility
  status?: string;
  
  // Additional fields
  contacts?: any[]; // Activity contacts
  governmentInputs?: any; // Government-specific inputs
  
  // User who created/last edited
  createdBy?: { id: string; name: string; role: string };
  lastEditedBy?: { id: string; name: string; role: string };
}

// Path to the data file
const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'activities.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load activities from file
async function loadActivities(): Promise<Activity[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is empty, return empty array
    console.log('[AIMS] No existing activities file found, starting with empty array');
    return [];
  }
}

// Save activities to file
async function saveActivities(activities: Activity[]) {
  try {
    await ensureDataDirectory();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(activities, null, 2));
    console.log('[AIMS] Activities saved to file');
  } catch (error) {
    console.error('[AIMS] Error saving activities to file:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('[AIMS API] Received body.contacts:', body.contacts);
    console.log('[AIMS API] Contacts count:', body.contacts?.length || 0);
    
    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Activity title is required' },
        { status: 400 }
      );
    }

    // Load current activities
    const activities = await loadActivities();

    // If we have an ID, this is an update
    if (body.id) {
      const index = activities.findIndex(a => a.id === body.id);
      if (index === -1) {
        return NextResponse.json(
          { error: 'Activity not found' },
          { status: 404 }
        );
      }

      const existingActivity = activities[index];
      
      // Track changes for activity logging
      const changes: any[] = [];
      if (existingActivity.title !== body.title && body.title) {
        changes.push({ field: 'title', oldValue: existingActivity.title, newValue: body.title });
      }
      if (existingActivity.activityStatus !== body.activityStatus && body.activityStatus) {
        changes.push({ field: 'activityStatus', oldValue: existingActivity.activityStatus, newValue: body.activityStatus });
      }
      if (existingActivity.publicationStatus !== body.publicationStatus && body.publicationStatus) {
        changes.push({ field: 'publicationStatus', oldValue: existingActivity.publicationStatus, newValue: body.publicationStatus });
      }

      // Update existing activity
      const updatedActivity: Activity = {
        ...activities[index],
        ...body,
        sectors: body.sectors || activities[index].sectors || [],
        transactions: body.transactions || activities[index].transactions || [],
        banner: body.banner !== undefined ? body.banner : activities[index].banner,
        extendingPartners: body.extendingPartners || activities[index].extendingPartners || [],
        implementingPartners: body.implementingPartners || activities[index].implementingPartners || [],
        governmentPartners: body.governmentPartners || activities[index].governmentPartners || [],
        createdByOrg: body.createdByOrg !== undefined ? body.createdByOrg : activities[index].createdByOrg,
        // Handle status fields migration
        activityStatus: body.activityStatus || activities[index].activityStatus || activities[index].status || 'planning',
        publicationStatus: body.publicationStatus || activities[index].publicationStatus || (activities[index].status === 'published' ? 'published' : 'draft'),
        submissionStatus: body.submissionStatus !== undefined ? body.submissionStatus : activities[index].submissionStatus || 'draft',
        plannedStartDate: body.plannedStartDate !== undefined ? body.plannedStartDate : activities[index].plannedStartDate,
        plannedEndDate: body.plannedEndDate !== undefined ? body.plannedEndDate : activities[index].plannedEndDate,
        actualStartDate: body.actualStartDate !== undefined ? body.actualStartDate : activities[index].actualStartDate,
        actualEndDate: body.actualEndDate !== undefined ? body.actualEndDate : activities[index].actualEndDate,
        contacts: body.contacts || activities[index].contacts || [],
        governmentInputs: body.governmentInputs || activities[index].governmentInputs || {},
        comments: activities[index].comments || [],
        updatedAt: new Date().toISOString(),
        lastEditedBy: body.user || activities[index].lastEditedBy,
      };
      
      console.log('[AIMS API] Updating activity with contacts:', updatedActivity.contacts);
      console.log('[AIMS API] Updated contacts count:', updatedActivity.contacts?.length || 0);
      
      // Remove legacy status field
      delete updatedActivity.status;
      activities[index] = updatedActivity;
      
      // Save to file
      await saveActivities(activities);
      
      // Log the activity changes
      if (body.user) {
        // Log each field change
        for (const change of changes) {
          await ActivityLogger.activityEdited(
            updatedActivity,
            body.user,
            change.field,
            change.oldValue,
            change.newValue
          );
        }
        
        // Log publication status changes
        if (existingActivity.publicationStatus !== updatedActivity.publicationStatus) {
          if (updatedActivity.publicationStatus === 'published') {
            await ActivityLogger.activityPublished(updatedActivity, body.user);
          } else if (existingActivity.publicationStatus === 'published') {
            await ActivityLogger.activityUnpublished(updatedActivity, body.user);
          }
        }
      }
      
      console.log('[AIMS] Updated activity:', updatedActivity);
      console.log('[AIMS API] Returning activity with contacts:', updatedActivity.contacts);
      return NextResponse.json(updatedActivity);
    }

    // Otherwise, create new activity
    const newActivity: Activity = {
      id: Math.random().toString(36).substring(7),
      partnerId: body.partnerId || '',
      iatiId: body.iatiId || '',
      title: body.title,
      description: body.description || '',
      objectives: body.objectives || '',
      targetGroups: body.targetGroups || '',
      collaborationType: body.collaborationType || '',
      activityStatus: body.activityStatus || 'planning',
      publicationStatus: body.publicationStatus || 'draft',
      submissionStatus: body.submissionStatus || 'draft',
      banner: body.banner || undefined,
      createdByOrg: body.createdByOrg || undefined,
      extendingPartners: body.extendingPartners || [],
      implementingPartners: body.implementingPartners || [],
      governmentPartners: body.governmentPartners || [],
      plannedStartDate: body.plannedStartDate || '',
      plannedEndDate: body.plannedEndDate || '',
      actualStartDate: body.actualStartDate || '',
      actualEndDate: body.actualEndDate || '',
      sectors: body.sectors || [],
      transactions: body.transactions || [],
      contacts: body.contacts || [],
      governmentInputs: body.governmentInputs || {},
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.user,
      lastEditedBy: body.user,
    };

    activities.push(newActivity);
    
    // Save to file
    await saveActivities(activities);
    
    // Log the activity creation
    if (body.user) {
      await ActivityLogger.activityCreated(newActivity, body.user);
    }
    
    console.log('[AIMS] Created new activity:', newActivity);
    
    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error('[AIMS] Error saving activity:', error);
    return NextResponse.json(
      { error: 'Failed to save activity' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Load activities from file
    const activities = await loadActivities();
    
    // Return all activities, sorted by creation date (newest first)
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(sortedActivities);
  } catch (error) {
    console.error('[AIMS] Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, user } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }
    
    const activities = await loadActivities();
    const index = activities.findIndex(a => a.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    
    const deletedActivity = activities[index];
    activities.splice(index, 1);
    await saveActivities(activities);
    
    // Log the activity deletion
    if (user) {
      await ActivityLogger.activityDeleted(deletedActivity, user);
    }
    
    console.log("[AIMS] Deleted activity:", deletedActivity);
    return NextResponse.json({ message: "Activity deleted successfully", activity: deletedActivity });
  } catch (error) {
    console.error("[AIMS] Error deleting activity:", error);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
} 