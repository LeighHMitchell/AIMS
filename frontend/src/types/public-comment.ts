/**
 * Types for the public comments system on activity profile pages
 * Separate from internal ActivityComment used in Activity Editor
 */

export interface PublicCommentUser {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

export interface PublicComment {
  id: string;
  activityId: string;
  parentId?: string | null;
  user: PublicCommentUser;
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
  replies?: PublicComment[];
}

// Database row type (snake_case)
export interface PublicCommentRow {
  id: string;
  activity_id: string;
  parent_id: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  user_role: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

// Create comment request
export interface CreatePublicCommentRequest {
  content: string;
  parentId?: string | null;
}

// API response types
export interface PublicCommentsResponse {
  comments: PublicComment[];
  total: number;
}

// Transform database row to frontend type
export function transformPublicComment(
  row: PublicCommentRow,
  isLiked: boolean = false,
  replies: PublicComment[] = []
): PublicComment {
  return {
    id: row.id,
    activityId: row.activity_id,
    parentId: row.parent_id,
    user: {
      id: row.user_id,
      name: row.user_name,
      avatar: row.user_avatar || undefined,
      role: row.user_role || undefined,
    },
    content: row.content,
    timestamp: row.created_at,
    likes: row.likes_count,
    isLiked,
    replies,
  };
}

// Format timestamp for display
export function formatCommentTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
