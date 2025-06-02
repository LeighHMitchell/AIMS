import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ActivityComment, CommentReply } from '@/types/comment';
import { ActivityLogger } from '@/lib/activity-logger';

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
async function loadActivities(): Promise<any[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('[AIMS] No existing activities file found, starting with empty array');
    return [];
  }
}

// Save activities to file
async function saveActivities(activities: any[]) {
  try {
    await ensureDataDirectory();
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(activities, null, 2));
    console.log('[AIMS] Activities saved to file');
  } catch (error) {
    console.error('[AIMS] Error saving activities to file:', error);
    throw error;
  }
}

// GET comments for an activity
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activities = await loadActivities();
    const activity = activities.find(a => a.id === params.id);
    
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    // Return comments, sorted by creation date (newest first)
    const comments = activity.comments || [];
    const sortedComments = [...comments].sort((a: ActivityComment, b: ActivityComment) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return NextResponse.json(sortedComments);
  } catch (error) {
    console.error('[AIMS] Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST new comment or reply
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, content, type, parentCommentId, attachments } = body;
    
    const activities = await loadActivities();
    const activityIndex = activities.findIndex(a => a.id === params.id);
    
    if (activityIndex === -1) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    const activity = activities[activityIndex];
    
    if (!activity.comments) {
      activity.comments = [];
    }
    
    if (parentCommentId) {
      // This is a reply to an existing comment
      const parentComment = activity.comments.find((c: ActivityComment) => c.id === parentCommentId);
      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
      
      const reply: CommentReply = {
        id: Math.random().toString(36).substring(7),
        author: {
          userId: user.id,
          name: user.name,
          role: user.role,
        },
        message: content,
        createdAt: new Date().toISOString(),
        type: type || 'Feedback',
        attachments: attachments || [],
      };
      
      if (!parentComment.replies) {
        parentComment.replies = [];
      }
      parentComment.replies.push(reply);
      
      console.log(`[AIMS] Reply added to comment ${parentCommentId} in activity ${params.id} by ${user.name}`);
    } else {
      // This is a new top-level comment
      const newComment: ActivityComment = {
        id: Math.random().toString(36).substring(7),
        activityId: params.id,
        author: {
          userId: user.id,
          name: user.name,
          role: user.role,
        },
        type: type || 'Feedback',
        message: content,
        createdAt: new Date().toISOString(),
        replies: [],
        status: 'Open',
        attachments: attachments || [],
      };
      
      activity.comments.push(newComment);
      
      console.log(`[AIMS] Comment added to activity ${params.id} by ${user.name}`);
      
      // Log the activity
      if (user) {
        await ActivityLogger.activityEdited(
          activity,
          user,
          'comments',
          undefined,
          `Added comment: ${content.substring(0, 50)}...`
        );
      }
    }
    
    // Update the activity
    activities[activityIndex] = activity;
    await saveActivities(activities);
    
    // Return the updated comments
    return NextResponse.json(activity.comments);
  } catch (error) {
    console.error('[AIMS] Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// PATCH to resolve/update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { user, commentId, action, resolutionNote } = body;
    
    const activities = await loadActivities();
    const activityIndex = activities.findIndex(a => a.id === params.id);
    
    if (activityIndex === -1) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }
    
    const activity = activities[activityIndex];
    const comment = activity.comments?.find((c: ActivityComment) => c.id === commentId);
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    // Only the original author can resolve their comment
    if (action === 'resolve' && comment.author.userId !== user.id) {
      return NextResponse.json(
        { error: 'Only the original author can resolve their comment' },
        { status: 403 }
      );
    }
    
    if (action === 'resolve') {
      comment.status = 'Resolved';
      comment.resolvedBy = {
        userId: user.id,
        name: user.name,
        role: user.role,
      };
      comment.resolvedAt = new Date().toISOString();
      comment.resolutionNote = resolutionNote || '';
      
      console.log(`[AIMS] Comment ${commentId} resolved by ${user.name}`);
    } else if (action === 'reopen' && comment.author.userId === user.id) {
      comment.status = 'Open';
      delete comment.resolvedBy;
      delete comment.resolvedAt;
      delete comment.resolutionNote;
      
      console.log(`[AIMS] Comment ${commentId} reopened by ${user.name}`);
    }
    
    // Update the activity
    activities[activityIndex] = activity;
    await saveActivities(activities);
    
    return NextResponse.json(comment);
  } catch (error) {
    console.error('[AIMS] Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
} 