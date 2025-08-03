export interface CommentAuthor {
  userId: string;
  name: string;
  role: string;
}

export interface CommentLikes {
  thumbsUp: number;
  thumbsDown: number;
  userLike: 'thumbs_up' | 'thumbs_down' | null;
}

export interface CommentReply {
  id: string;
  author: CommentAuthor;
  message: string;
  createdAt: string;
  type: 'Question' | 'Feedback';
  likes?: CommentLikes;
  attachments?: CommentAttachment[];
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
  resolvedBy?: CommentAuthor;
  resolvedAt?: string;
  resolutionNote?: string;
  likes?: CommentLikes;
  attachments?: CommentAttachment[];
}