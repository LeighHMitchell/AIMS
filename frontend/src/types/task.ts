/**
 * Tasking System Types
 * Types for the task assignment and tracking system
 */

// =====================================================
// ENUMS AND BASIC TYPES
// =====================================================

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'declined';
export type TaskEntityType = 'activity' | 'organization';
export type AssignmentType = 'individual' | 'organization' | 'role';
export type HistoryAction = 'created' | 'reassigned' | 'status_changed' | 'note_added' | 'archived' | 'unarchived' | 'reminder_sent' | 'email_sent' | 'opened';

// New types for workflow orchestration
export type TaskType = 'reporting' | 'validation' | 'compliance' | 'information';
export type TaskLifecycleStatus = 'draft' | 'scheduled' | 'sent' | 'completed' | 'cancelled';
export type TargetScope = 'organisation' | 'role' | 'user' | 'activity_set';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type TaskAttachmentType = 'document' | 'guidance' | 'letter' | 'template' | 'evidence' | 'other';
export type TaskEventType =
  | 'created'
  | 'updated'
  | 'scheduled'
  | 'sent'
  | 'email_sent'
  | 'email_failed'
  | 'opened'
  | 'completed'
  | 'cancelled'
  | 'overdue_flagged'
  | 'reminder_sent'
  | 'recurrence_generated'
  | 'attachment_added'
  | 'attachment_removed';

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * Task - The task definition created by a user
 */
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  deadline?: string | null;
  reminder_days: number;
  entity_type?: TaskEntityType | null;
  activity_id?: string | null;
  organization_id?: string | null;
  created_by: string;
  created_by_org_id?: string | null;
  created_at: string;
  updated_at: string;

  // Workflow orchestration fields (new)
  task_type?: TaskType;
  status?: TaskLifecycleStatus;
  send_in_app?: boolean;
  send_email?: boolean;
  scheduled_send_at?: string | null;
  timezone?: string;
  template_id?: string | null;
  recurrence_id?: string | null;
  target_scope?: TargetScope | null;
  parent_task_id?: string | null;
  email_sent_at?: string | null;
  email_sent_count?: number;
  dispatched_at?: string | null;
  dispatched_by?: string | null;

  // Joined fields (from API responses)
  creator?: TaskUser | null;
  activity?: TaskActivity | null;
  linked_organization?: TaskOrganization | null;
  task_assignments?: TaskAssignment[];
  template?: TaskTemplate | null;
  recurrence?: TaskRecurrenceRule | null;
  attachments?: TaskAttachment[];
  task_attachments?: TaskAttachment[]; // API returns this name
  parent_task?: Task | null;

  // Computed fields (calculated by API)
  assignment_count?: number;
  completed_count?: number;
  pending_count?: number;
  in_progress_count?: number;
  declined_count?: number;
  overdue_count?: number;
  is_overdue?: boolean;
}

/**
 * TaskAssignment - One assignment per user per task
 */
export interface TaskAssignment {
  id: string;
  task_id: string;
  assignee_id: string;
  assignment_type: AssignmentType;
  assignment_source?: string | null;
  status: TaskStatus;
  completion_note?: string | null;
  completed_at?: string | null;
  declined_at?: string | null;
  declined_reason?: string | null;
  assigned_by: string;
  reminder_sent: boolean;
  reminder_sent_at?: string | null;
  archived?: boolean | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  task?: Task | null;
  assignee?: TaskUser | null;
  assigner?: TaskUser | null;

  // Computed fields
  is_overdue?: boolean;
  days_until_deadline?: number | null;
}

/**
 * TaskAssignmentHistory - Audit trail entry
 */
export interface TaskAssignmentHistory {
  id: string;
  task_assignment_id: string;
  action: HistoryAction;
  performed_by: string;
  previous_status?: TaskStatus | null;
  new_status?: TaskStatus | null;
  previous_assignee_id?: string | null;
  new_assignee_id?: string | null;
  note?: string | null;
  created_at: string;

  // Joined fields
  performer?: TaskUser | null;
  previous_assignee?: TaskUser | null;
  new_assignee?: TaskUser | null;
}

/**
 * TaskShare - Read-only visibility share
 */
export interface TaskShare {
  id: string;
  task_id: string;
  task_assignment_id?: string | null;
  shared_by: string;
  shared_with_id: string;
  share_message?: string | null;
  created_at: string;

  // Joined fields
  sharer?: TaskUser | null;
  shared_with?: TaskUser | null;
  task?: Task | null;
}

/**
 * TaskTemplate - Reusable task blueprint
 */
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string | null;
  default_title: string;
  default_body?: string | null;
  default_send_in_app: boolean;
  default_send_email: boolean;
  default_priority: TaskPriority;
  default_reminder_days: number;
  default_task_type: TaskType;
  default_target_scope?: TargetScope | null;
  is_system_template: boolean;
  is_active: boolean;
  created_by_user_id?: string | null;
  created_by_org_id?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  creator?: TaskUser | null;
  organization?: TaskOrganization | null;
}

/**
 * TaskRecurrenceRule - RRULE-style scheduling configuration
 */
export interface TaskRecurrenceRule {
  id: string;
  frequency: RecurrenceFrequency;
  interval: number;
  by_weekday?: string[] | null; // ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  by_month_day?: number[] | null; // 1-31 or negative
  by_month?: number[] | null; // 1-12
  count?: number | null; // Max occurrences
  end_date?: string | null;
  timezone: string;
  generation_time?: string | null; // HH:MM:SS
  last_generated_at?: string | null;
  next_occurrence_at?: string | null;
  occurrences_generated: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * TaskAttachment - Document attached to a task
 */
export interface TaskAttachment {
  id: string;
  task_id: string;
  file_path: string;
  file_name: string;
  file_type: string; // MIME type
  file_size: number;
  description?: string | null;
  attachment_type: TaskAttachmentType;
  uploaded_by_user_id?: string | null;
  uploaded_at: string;
  created_at: string;

  // Joined fields
  uploader?: TaskUser | null;
}

/**
 * TaskEvent - Audit log entry for task-level events
 */
export interface TaskEvent {
  id: string;
  task_id: string;
  event_type: TaskEventType;
  actor_user_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;

  // Joined fields
  actor?: TaskUser | null;
  task?: Task | null;
}

// =====================================================
// NESTED/PARTIAL TYPES
// =====================================================

/**
 * Partial user info for task-related responses
 */
export interface TaskUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  avatar_url?: string | null;
  role?: string | null;
  department?: string | null;
  job_title?: string | null;
  organization?: TaskOrganization | null;
}

/**
 * Partial activity info for task-related responses
 */
export interface TaskActivity {
  id: string;
  title_narrative?: string | null;
  iati_identifier?: string | null;
}

/**
 * Partial organization info for task-related responses
 */
export interface TaskOrganization {
  id: string;
  name: string;
  acronym?: string | null;
  logo?: string | null;
}

// =====================================================
// REQUEST TYPES
// =====================================================

/**
 * Request to create a new task
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  reminder_days?: number;
  entity_type?: TaskEntityType;
  activity_id?: string;
  organization_id?: string;
  assignees: TaskAssignees;

  // Workflow orchestration fields (new)
  task_type?: TaskType;
  status?: TaskLifecycleStatus; // 'draft', 'scheduled', or 'sent' (immediate)
  send_in_app?: boolean;
  send_email?: boolean;
  scheduled_send_at?: string;
  timezone?: string;
  template_id?: string;
  target_scope?: TargetScope;
  recurrence?: CreateRecurrenceRequest;
}

/**
 * Assignee selection for task creation
 */
export interface TaskAssignees {
  user_ids?: string[];
  organization_ids?: string[];
  roles?: string[];
}

/**
 * Request to update a task
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  deadline?: string | null;
  reminder_days?: number;
  assignees?: TaskAssignees;
}

/**
 * Request to update an assignment
 */
export interface UpdateAssignmentRequest {
  status?: TaskStatus;
  completion_note?: string;
  declined_reason?: string;
  // For reassignment
  reassign_to?: string;
  reassignment_note?: string;
}

/**
 * Request to share a task
 */
export interface ShareTaskRequest {
  shared_with_id: string;
  share_message?: string;
}

/**
 * Request to create a recurrence rule (embedded in CreateTaskRequest)
 */
export interface CreateRecurrenceRequest {
  frequency: RecurrenceFrequency;
  interval?: number;
  by_weekday?: string[];
  by_month_day?: number[];
  by_month?: number[];
  count?: number;
  end_date?: string;
  timezone?: string;
  generation_time?: string; // HH:MM format
}

/**
 * Request to create a task template
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  default_title: string;
  default_body?: string;
  default_send_in_app?: boolean;
  default_send_email?: boolean;
  default_priority?: TaskPriority;
  default_reminder_days?: number;
  default_task_type?: TaskType;
  default_target_scope?: TargetScope;
}

/**
 * Request to update a task template
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string | null;
  default_title?: string;
  default_body?: string | null;
  default_send_in_app?: boolean;
  default_send_email?: boolean;
  default_priority?: TaskPriority;
  default_reminder_days?: number;
  default_task_type?: TaskType;
  default_target_scope?: TargetScope | null;
  is_active?: boolean;
}

/**
 * Request to upload a task attachment
 */
export interface UploadAttachmentRequest {
  file: File;
  description?: string;
  attachment_type?: TaskAttachmentType;
}

// =====================================================
// RESPONSE TYPES
// =====================================================

/**
 * Summary statistics for tasks
 */
export interface TaskSummaryStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  declined: number;
  overdue: number;
  archived?: number;
}

/**
 * API response for task list
 */
export interface TaskListResponse {
  success: boolean;
  data: Task[];
  total: number;
  stats?: TaskSummaryStats;
  error?: string;
}

/**
 * API response for single task
 */
export interface TaskDetailResponse {
  success: boolean;
  data: Task;
  assignments: TaskAssignment[];
  history?: TaskAssignmentHistory[];
  shares?: TaskShare[];
  error?: string;
}

/**
 * API response for assigned tasks
 */
export interface AssignedTasksResponse {
  success: boolean;
  data: TaskAssignment[];
  total: number;
  stats?: TaskSummaryStats;
  error?: string;
}

/**
 * API response for taskable users
 */
export interface TaskableUsersResponse {
  success: boolean;
  users: TaskUser[];
  organizations: TaskOrganization[];
  roles: string[];
}

/**
 * API response for template list
 */
export interface TemplateListResponse {
  success: boolean;
  data: TaskTemplate[];
  total: number;
  error?: string;
}

/**
 * API response for single template
 */
export interface TemplateDetailResponse {
  success: boolean;
  data: TaskTemplate;
  error?: string;
}

/**
 * API response for task events
 */
export interface TaskEventsResponse {
  success: boolean;
  data: TaskEvent[];
  total: number;
  error?: string;
}

/**
 * API response for task attachments
 */
export interface TaskAttachmentsResponse {
  success: boolean;
  data: TaskAttachment[];
  error?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Filter options for fetching tasks
 */
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  is_overdue?: boolean;
  entity_type?: TaskEntityType;
  search?: string;
  includeArchived?: boolean;
  // New filters for workflow orchestration
  task_type?: TaskType;
  lifecycle_status?: TaskLifecycleStatus;
  template_id?: string;
  has_recurrence?: boolean;
}

/**
 * Filter options for fetching templates
 */
export interface TemplateFilters {
  search?: string;
  is_system_template?: boolean;
  task_type?: TaskType;
  is_active?: boolean;
}

/**
 * Sort options for tasks
 */
export interface TaskSort {
  field: 'created_at' | 'deadline' | 'priority' | 'title';
  direction: 'asc' | 'desc';
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get display label for task priority
 */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[priority];
}

/**
 * Get display label for task status
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    declined: 'Declined',
  };
  return labels[status];
}

/**
 * Get CSS color class for priority
 * High: #DC2625 (red)
 * Medium: #4C5568 (slate)
 * Low: default slate
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    high: 'text-[#DC2625] bg-red-50 border-[#DC2625]/30',
    medium: 'text-[#4C5568] bg-slate-50 border-[#4C5568]/30',
    low: 'text-slate-500 bg-slate-50 border-slate-200',
  };
  return colors[priority];
}

/**
 * Get CSS color class for status
 * Completed: #5f7f7a (teal)
 * In Progress: default blue
 */
export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    pending: 'text-slate-600 bg-slate-50 border-slate-200',
    in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
    completed: 'text-[#5f7f7a] bg-[#5f7f7a]/10 border-[#5f7f7a]/30',
    declined: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status];
}

/**
 * Check if a task assignment is overdue
 */
export function isAssignmentOverdue(assignment: TaskAssignment, task?: Task | null): boolean {
  if (assignment.status === 'completed' || assignment.status === 'declined') {
    return false;
  }
  const deadline = task?.deadline || assignment.task?.deadline;
  if (!deadline) {
    return false;
  }
  return new Date(deadline) < new Date();
}

/**
 * Calculate days until deadline (negative if overdue)
 */
export function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get user display name
 */
export function getTaskUserDisplayName(user: TaskUser | null | undefined): string {
  if (!user) return 'Unknown';
  if (user.first_name || user.last_name) {
    return [user.first_name, user.last_name].filter(Boolean).join(' ');
  }
  return user.email;
}

/**
 * Get display label for task type
 */
export function getTaskTypeLabel(taskType: TaskType): string {
  const labels: Record<TaskType, string> = {
    reporting: 'Reporting',
    validation: 'Validation',
    compliance: 'Compliance',
    information: 'Information',
  };
  return labels[taskType];
}

/**
 * Get CSS color class for task type
 */
export function getTaskTypeColor(taskType: TaskType): string {
  const colors: Record<TaskType, string> = {
    reporting: 'text-blue-600 bg-blue-50 border-blue-200',
    validation: 'text-purple-600 bg-purple-50 border-purple-200',
    compliance: 'text-orange-600 bg-orange-50 border-orange-200',
    information: 'text-slate-600 bg-slate-50 border-slate-200',
  };
  return colors[taskType];
}

/**
 * Get display label for task lifecycle status
 */
export function getLifecycleStatusLabel(status: TaskLifecycleStatus): string {
  const labels: Record<TaskLifecycleStatus, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    sent: 'Sent',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/**
 * Get CSS color class for task lifecycle status
 */
export function getLifecycleStatusColor(status: TaskLifecycleStatus): string {
  const colors: Record<TaskLifecycleStatus, string> = {
    draft: 'text-slate-600 bg-slate-50 border-slate-200',
    scheduled: 'text-amber-600 bg-amber-50 border-amber-200',
    sent: 'text-blue-600 bg-blue-50 border-blue-200',
    completed: 'text-green-600 bg-green-50 border-green-200',
    cancelled: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status];
}

/**
 * Get display label for recurrence frequency
 */
export function getRecurrenceFrequencyLabel(frequency: RecurrenceFrequency, interval: number = 1): string {
  if (interval === 1) {
    const labels: Record<RecurrenceFrequency, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    };
    return labels[frequency];
  }

  const plurals: Record<RecurrenceFrequency, string> = {
    daily: 'days',
    weekly: 'weeks',
    monthly: 'months',
    quarterly: 'quarters',
    yearly: 'years',
  };
  return `Every ${interval} ${plurals[frequency]}`;
}

/**
 * Get display label for target scope
 */
export function getTargetScopeLabel(scope: TargetScope): string {
  const labels: Record<TargetScope, string> = {
    organisation: 'By Organization',
    role: 'By Role',
    user: 'Individual Users',
    activity_set: 'Activity Stakeholders',
  };
  return labels[scope];
}

/**
 * Get display label for attachment type
 */
export function getAttachmentTypeLabel(type: TaskAttachmentType): string {
  const labels: Record<TaskAttachmentType, string> = {
    document: 'Document',
    guidance: 'Guidance Note',
    letter: 'Signed Letter',
    template: 'Template',
    evidence: 'Evidence',
    other: 'Other',
  };
  return labels[type];
}

/**
 * Get icon name for task event type (for use with lucide-react)
 */
export function getTaskEventIcon(eventType: TaskEventType): string {
  const icons: Record<TaskEventType, string> = {
    created: 'PlusCircle',
    updated: 'Edit',
    scheduled: 'Clock',
    sent: 'Send',
    email_sent: 'Mail',
    email_failed: 'MailX',
    opened: 'Eye',
    completed: 'CheckCircle',
    cancelled: 'XCircle',
    overdue_flagged: 'AlertTriangle',
    reminder_sent: 'Bell',
    recurrence_generated: 'Repeat',
    attachment_added: 'Paperclip',
    attachment_removed: 'Trash2',
  };
  return icons[eventType];
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

/**
 * Overall task analytics summary
 */
export interface TaskAnalyticsSummary {
  // Task counts
  total_tasks: number;
  draft_tasks: number;
  scheduled_tasks: number;
  sent_tasks: number;
  completed_tasks: number;
  cancelled_tasks: number;

  // Assignment counts
  total_assignments: number;
  pending_assignments: number;
  in_progress_assignments: number;
  completed_assignments: number;
  declined_assignments: number;
  overdue_assignments: number;

  // Rates
  completion_rate: number; // percentage
  on_time_rate: number; // percentage completed before deadline
  decline_rate: number; // percentage

  // Response times (in hours)
  avg_response_time: number | null;
  median_response_time: number | null;

  // Email stats
  total_emails_sent: number;
  emails_this_period: number;
}

/**
 * Task analytics by type
 */
export interface TaskTypeAnalytics {
  task_type: TaskType;
  total: number;
  completed: number;
  overdue: number;
  completion_rate: number;
  avg_response_time: number | null;
}

/**
 * Task analytics by priority
 */
export interface TaskPriorityAnalytics {
  priority: TaskPriority;
  total: number;
  completed: number;
  overdue: number;
  completion_rate: number;
}

/**
 * Task analytics over time (for charts)
 */
export interface TaskTimeSeriesData {
  date: string;
  created: number;
  completed: number;
  overdue: number;
}

/**
 * Overdue task details for tracking
 */
export interface OverdueTaskDetail {
  task_id: string;
  task_title: string;
  task_type: TaskType;
  priority: TaskPriority;
  deadline: string;
  days_overdue: number;
  assignee_count: number;
  completed_count: number;
  creator: TaskUser | null;
}

/**
 * Top performer stats
 */
export interface TaskPerformerStats {
  user: TaskUser;
  assigned_count: number;
  completed_count: number;
  completion_rate: number;
  avg_response_time: number | null;
  overdue_count: number;
}

/**
 * Organization task stats
 */
export interface OrgTaskStats {
  organization: TaskOrganization;
  created_count: number;
  assigned_count: number;
  completed_count: number;
  overdue_count: number;
  completion_rate: number;
}

/**
 * Full analytics response
 */
export interface TaskAnalyticsResponse {
  success: boolean;
  summary: TaskAnalyticsSummary;
  by_type: TaskTypeAnalytics[];
  by_priority: TaskPriorityAnalytics[];
  time_series: TaskTimeSeriesData[];
  overdue_tasks: OverdueTaskDetail[];
  top_performers?: TaskPerformerStats[];
  by_organization?: OrgTaskStats[];
  period: {
    start: string;
    end: string;
    days: number;
  };
  error?: string;
}

/**
 * Analytics filter options
 */
export interface TaskAnalyticsFilters {
  start_date?: string;
  end_date?: string;
  task_type?: TaskType;
  organization_id?: string;
  include_performers?: boolean;
  include_org_breakdown?: boolean;
}
