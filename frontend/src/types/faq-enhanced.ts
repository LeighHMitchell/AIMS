/**
 * Enhanced FAQ System Types
 * Supports user question submission, manager review, attachments, and ratings
 */

// ============================================================================
// Question Status Types
// ============================================================================

export type FAQQuestionStatus =
  | 'pending'      // Awaiting manager review
  | 'in_progress'  // Manager is working on the answer
  | 'published'    // Converted to a public FAQ
  | 'rejected'     // Not suitable for FAQ
  | 'duplicate';   // Already answered elsewhere

export type FAQStatus =
  | 'draft'        // Not yet visible
  | 'published'    // Visible to all
  | 'archived';    // Hidden but preserved

export type RatingType = 'question_helpful' | 'answer_helpful';

// ============================================================================
// User-Submitted Question Types
// ============================================================================

/**
 * User-submitted question awaiting manager review
 */
export interface FAQQuestion {
  id: string;
  userId: string;
  question: string;
  context?: string;           // Where/why the question arose
  tags: string[];
  status: FAQQuestionStatus;
  assignedTo?: string;        // Manager assigned to answer
  adminNotes?: string;        // Internal notes from managers
  linkedFaqId?: string;       // Link to published FAQ
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;

  // Joined data
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  assignedUser?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  linkedFaq?: FAQItem;
}

/**
 * Database row format for faq_questions
 */
export interface FAQQuestionRow {
  id: string;
  user_id: string;
  question: string;
  context?: string;
  tags: string[];
  status: FAQQuestionStatus;
  assigned_to?: string;
  admin_notes?: string;
  linked_faq_id?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;

  // Joined data
  users?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  assigned_user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  faq?: FAQItemRow;
}

/**
 * Form data for submitting a new question
 */
export interface SubmitQuestionFormData {
  question: string;
  context?: string;
  tags?: string[];
}

// ============================================================================
// FAQ Item Types (Enhanced)
// ============================================================================

/**
 * FAQ item with enhanced fields
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  status: FAQStatus;
  sourceQuestionId?: string;  // Original user question
  viewCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;

  // Joined/computed data
  attachments?: FAQAttachment[];
  ratings?: FAQRatingSummary;
  sourceQuestion?: FAQQuestion;
}

/**
 * Database row format for faq table
 */
export interface FAQItemRow {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  status: FAQStatus;
  source_question_id?: string;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Joined data
  faq_attachments?: FAQAttachmentRow[];
  faq_questions?: FAQQuestionRow;
}

// ============================================================================
// Attachment Types
// ============================================================================

/**
 * File attachment for FAQ entries
 */
export interface FAQAttachment {
  id: string;
  faqId: string;
  fileUrl: string;
  filename: string;
  fileType?: string;     // MIME type
  fileSize?: number;     // Size in bytes
  displayOrder: number;
  caption?: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Database row format for faq_attachments
 */
export interface FAQAttachmentRow {
  id: string;
  faq_id: string;
  file_url: string;
  filename: string;
  file_type?: string;
  file_size?: number;
  display_order: number;
  caption?: string;
  created_at: string;
  created_by?: string;
}

// ============================================================================
// Rating Types
// ============================================================================

/**
 * Individual user rating
 */
export interface FAQRating {
  id: string;
  faqId: string;
  userId: string;
  ratingType: RatingType;
  isPositive: boolean;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format for faq_ratings
 */
export interface FAQRatingRow {
  id: string;
  faq_id: string;
  user_id: string;
  rating_type: RatingType;
  is_positive: boolean;
  comment?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Aggregated rating summary for an FAQ
 */
export interface FAQRatingSummary {
  faqId: string;
  questionHelpful: {
    positive: number;
    negative: number;
    total: number;
  };
  answerHelpful: {
    positive: number;
    negative: number;
    total: number;
  };
  userRating?: {
    questionHelpful?: boolean;
    answerHelpful?: boolean;
  };
}

/**
 * Form data for submitting a rating
 */
export interface SubmitRatingFormData {
  ratingType: RatingType;
  isPositive: boolean;
  comment?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for listing FAQ questions (admin queue)
 */
export interface FAQQuestionsListResponse {
  success: boolean;
  data: FAQQuestion[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats: {
    pending: number;
    inProgress: number;
    published: number;
    rejected: number;
    duplicate: number;
  };
}

/**
 * Response for FAQ stats (admin dashboard)
 */
export interface FAQStatsResponse {
  success: boolean;
  pendingQuestions: number;
  totalFaqs: number;
  totalViews: number;
  avgRating: number;
  recentQuestions: FAQQuestion[];
}

/**
 * Response for publishing a question as FAQ
 */
export interface PublishQuestionResponse {
  success: boolean;
  faq: FAQItem;
  question: FAQQuestion;
}

// ============================================================================
// Utility Functions for Type Conversion
// ============================================================================

/**
 * Convert database row to FAQQuestion
 */
export function toFAQQuestion(row: FAQQuestionRow): FAQQuestion {
  return {
    id: row.id,
    userId: row.user_id,
    question: row.question,
    context: row.context,
    tags: row.tags || [],
    status: row.status,
    assignedTo: row.assigned_to,
    adminNotes: row.admin_notes,
    linkedFaqId: row.linked_faq_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    user: row.users,
    assignedUser: row.assigned_user,
    linkedFaq: row.faq ? toFAQItem(row.faq) : undefined,
  };
}

/**
 * Convert database row to FAQItem
 */
export function toFAQItem(row: FAQItemRow): FAQItem {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    tags: row.tags || [],
    status: row.status || 'published',
    sourceQuestionId: row.source_question_id,
    viewCount: row.view_count || 0,
    isPinned: row.is_pinned || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    attachments: row.faq_attachments?.map(toFAQAttachment),
    sourceQuestion: row.faq_questions ? toFAQQuestion(row.faq_questions) : undefined,
  };
}

/**
 * Convert database row to FAQAttachment
 */
export function toFAQAttachment(row: FAQAttachmentRow): FAQAttachment {
  return {
    id: row.id,
    faqId: row.faq_id,
    fileUrl: row.file_url,
    filename: row.filename,
    fileType: row.file_type,
    fileSize: row.file_size,
    displayOrder: row.display_order,
    caption: row.caption,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/**
 * Convert database row to FAQRating
 */
export function toFAQRating(row: FAQRatingRow): FAQRating {
  return {
    id: row.id,
    faqId: row.faq_id,
    userId: row.user_id,
    ratingType: row.rating_type,
    isPositive: row.is_positive,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Constants
// ============================================================================

export const FAQ_QUESTION_STATUS_LABELS: Record<FAQQuestionStatus, string> = {
  pending: 'Pending Review',
  in_progress: 'In Progress',
  published: 'Published',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
};

export const FAQ_QUESTION_STATUS_COLORS: Record<FAQQuestionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  duplicate: 'bg-gray-100 text-gray-800',
};

export const FAQ_STATUS_LABELS: Record<FAQStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export const FAQ_STATUS_COLORS: Record<FAQStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-orange-100 text-orange-800',
};

export const RATING_TYPE_LABELS: Record<RatingType, string> = {
  question_helpful: 'Was this question helpful?',
  answer_helpful: 'Was this answer helpful?',
};
