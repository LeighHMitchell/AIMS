export interface CommentAuthor {
  userId: string;
  name: string;
  role: string;
  roleColor?: string;
  profilePicture?: string;
}

export interface CommentMention {
  id: string;
  name: string;
  type: 'user' | 'organization';
}

export interface CommentReply {
  id: string;
  author: CommentAuthor;
  message: string;
  createdAt: string;
  type: 'Question' | 'Feedback';
  mentions?: CommentMention[];
  attachments?: CommentAttachment[];
  isRead?: Record<string, boolean>; // user_id -> read status
}

export interface CommentAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ActivityComment {
  id: string;
  activityId: string;
  author: CommentAuthor;
  type: 'Question' | 'Feedback';
  message: string;
  createdAt: string;
  replies: CommentReply[];
  status: 'Open' | 'Resolved';
  isArchived?: boolean;
  archivedBy?: CommentAuthor;
  archivedAt?: string;
  archiveReason?: string;
  resolvedBy?: CommentAuthor;
  resolvedAt?: string;
  resolutionNote?: string;
  contextSection?: string; // Which activity section this relates to
  contextField?: string;   // Specific field within the section
  mentions?: CommentMention[];
  attachments?: CommentAttachment[];
  isRead?: Record<string, boolean>; // user_id -> read status
  unreadCount?: number; // Computed field for UI
}

export interface CommentNotification {
  id: string;
  userId: string;
  activityId: string;
  commentId?: string;
  replyId?: string;
  type: 'new_comment' | 'new_reply' | 'mention' | 'resolved';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CommentSearchFilters {
  searchTerm?: string;
  contextSection?: string;
  type?: 'Question' | 'Feedback';
  status?: 'Open' | 'Resolved';
  includeArchived?: boolean;
  mentionedUser?: string;
} 