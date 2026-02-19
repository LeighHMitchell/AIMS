/**
 * Government Readiness Checklist Types
 * 
 * Types for the readiness checklist feature that tracks government
 * preparatory milestones before project validation.
 */

// ============================================
// Enums and Constants
// ============================================

export type ChecklistStatus = 'completed' | 'not_completed' | 'not_required' | 'in_progress';

export type FinancingType = 'loan' | 'grant' | 'technical_assistance' | 'mixed' | 'other';

export type FinancingModality = 'standard' | 'results_based' | 'budgetary_support' | 'project_preparation';

export type ResponsibleAgencyType = 
  | 'Implementing Agency' 
  | 'Ministry of Finance' 
  | 'Line Ministry'
  | 'Ministry of Environment'
  | string;

export const CHECKLIST_STATUS_OPTIONS: { value: ChecklistStatus; label: string; color: string }[] = [
  { value: 'completed', label: 'Completed', color: 'text-gray-900' },
  { value: 'in_progress', label: 'In Progress', color: 'text-gray-900' },
  { value: 'not_completed', label: 'Not Completed', color: 'text-gray-900' },
  { value: 'not_required', label: 'Not Required', color: 'text-gray-900' },
];

export const FINANCING_TYPE_OPTIONS: { value: FinancingType; label: string; icon: 'Landmark' | 'Gift' | 'GraduationCap' | 'Layers' | 'MoreHorizontal' }[] = [
  { value: 'loan', label: 'Loan', icon: 'Landmark' },
  { value: 'grant', label: 'Grant', icon: 'Gift' },
  { value: 'technical_assistance', label: 'Technical Assistance', icon: 'GraduationCap' },
  { value: 'mixed', label: 'Mixed (Loan & Grant)', icon: 'Layers' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

export const FINANCING_MODALITY_OPTIONS: { value: FinancingModality; label: string; description: string; icon: 'Briefcase' | 'Target' | 'Wallet' | 'Pencil' }[] = [
  { value: 'standard', label: 'Standard Project', description: 'Traditional investment project financing', icon: 'Briefcase' },
  { value: 'results_based', label: 'Results-Based Financing', description: 'Disbursements linked to achievement of results (PforR/RBL)', icon: 'Target' },
  { value: 'budgetary_support', label: 'Budgetary Support', description: 'Direct budget support tied to policy reforms', icon: 'Wallet' },
  { value: 'project_preparation', label: 'Project Preparation', description: 'Financing for project preparation activities', icon: 'Pencil' },
];

// ============================================
// Database Entity Types
// ============================================

/**
 * Readiness Checklist Template (Stage)
 * Represents a stage in the project preparation lifecycle
 */
export interface ReadinessTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  stage_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Conditions for when a checklist item applies
 */
export interface ApplicableConditions {
  financing_type?: FinancingType[];
  modality?: FinancingModality[];
  is_infrastructure?: boolean;
  excludes_modality?: FinancingModality[];
  [key: string]: unknown;
}

/**
 * Readiness Checklist Item
 * Individual item within a stage
 */
export interface ReadinessChecklistItem {
  id: string;
  template_id: string;
  code: string;
  title: string;
  description: string | null;
  guidance_text: string | null;
  responsible_agency_type: ResponsibleAgencyType | null;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
  applicable_conditions: ApplicableConditions;
  created_at: string;
  updated_at: string;
}

/**
 * Activity Readiness Configuration
 * Per-activity settings for filtering applicable items
 */
export interface ActivityReadinessConfig {
  id: string;
  activity_id: string;
  financing_type: FinancingType | null;
  financing_modality: FinancingModality | null;
  is_infrastructure: boolean;
  additional_flags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Activity Readiness Response
 * User response for a specific checklist item
 */
export interface ActivityReadinessResponse {
  id: string;
  activity_id: string;
  checklist_item_id: string;
  status: ChecklistStatus;
  remarks: string | null;
  completed_by: string | null;
  completed_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  completed_by_user?: {
    id: string;
    name: string;
  };
  verified_by_user?: {
    id: string;
    name: string;
  };
}

/**
 * Readiness Evidence Document
 * File attached as evidence for a checklist item
 */
export interface ReadinessEvidenceDocument {
  id: string;
  response_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
  // Joined fields
  uploaded_by_user?: {
    id: string;
    name: string;
  };
}

/**
 * Readiness Stage Sign-off
 * Formal certification that a stage is complete
 */
export interface ReadinessStageSignoff {
  id: string;
  activity_id: string;
  template_id: string;
  signed_off_by: string;
  signed_off_at: string;
  signature_title: string | null;
  items_completed: number;
  items_not_required: number;
  items_total: number;
  remarks: string | null;
  created_at: string;
  // Joined fields
  signed_off_by_user?: {
    id: string;
    name: string;
  };
}

// ============================================
// Extended/Composite Types
// ============================================

/**
 * Checklist item with response data
 */
export interface ReadinessItemWithResponse extends ReadinessChecklistItem {
  response: ActivityReadinessResponse | null;
  documents: ReadinessEvidenceDocument[];
}

/**
 * Template/Stage with its items
 */
export interface ReadinessTemplateWithItems extends ReadinessTemplate {
  items: ReadinessChecklistItem[];
}

/**
 * Stage with items, responses, and sign-off status
 */
export interface ReadinessStageWithData extends ReadinessTemplate {
  items: ReadinessItemWithResponse[];
  signoff: ReadinessStageSignoff | null;
  progress: {
    completed: number;
    in_progress: number;
    not_required: number;
    not_completed: number;
    total: number;
    percentage: number;
  };
}

/**
 * Complete activity readiness state
 */
export interface ActivityReadinessState {
  config: ActivityReadinessConfig | null;
  stages: ReadinessStageWithData[];
  overallProgress: {
    completed: number;
    in_progress: number;
    not_required: number;
    not_completed: number;
    total: number;
    percentage: number;
    stagesSignedOff: number;
    totalStages: number;
  };
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request to update activity readiness config
 */
export interface UpdateReadinessConfigRequest {
  financing_type?: FinancingType | null;
  financing_modality?: FinancingModality | null;
  is_infrastructure?: boolean;
  additional_flags?: Record<string, unknown>;
}

/**
 * Request to update a checklist item response
 */
export interface UpdateReadinessResponseRequest {
  status: ChecklistStatus;
  remarks?: string | null;
}

/**
 * Request to sign off a stage
 */
export interface SignOffStageRequest {
  signature_title: string;
  remarks?: string | null;
}

/**
 * Request to create/update a template (admin)
 */
export interface UpsertTemplateRequest {
  code: string;
  name: string;
  description?: string | null;
  stage_order: number;
  is_active?: boolean;
}

/**
 * Request to create/update a checklist item (admin)
 */
export interface UpsertChecklistItemRequest {
  template_id: string;
  code: string;
  title: string;
  description?: string | null;
  guidance_text?: string | null;
  responsible_agency_type?: ResponsibleAgencyType | null;
  display_order: number;
  is_required?: boolean;
  is_active?: boolean;
  applicable_conditions?: ApplicableConditions;
}

// ============================================
// Utility Types
// ============================================

/**
 * Context for filtering applicable items
 */
export interface ReadinessFilterContext {
  financing_type: FinancingType | null;
  financing_modality: FinancingModality | null;
  is_infrastructure: boolean;
}

/**
 * Check if an item applies given the current context
 */
export function isItemApplicable(
  item: ReadinessChecklistItem,
  context: ReadinessFilterContext
): boolean {
  const conditions = item.applicable_conditions;
  
  // If no conditions, always applicable
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  // Check financing_type condition
  if (conditions.financing_type && conditions.financing_type.length > 0) {
    if (!context.financing_type || !conditions.financing_type.includes(context.financing_type)) {
      return false;
    }
  }

  // Check modality condition
  if (conditions.modality && conditions.modality.length > 0) {
    if (!context.financing_modality || !conditions.modality.includes(context.financing_modality)) {
      return false;
    }
  }

  // Check excludes_modality condition
  if (conditions.excludes_modality && conditions.excludes_modality.length > 0) {
    if (context.financing_modality && conditions.excludes_modality.includes(context.financing_modality)) {
      return false;
    }
  }

  // Check is_infrastructure condition
  if (conditions.is_infrastructure !== undefined) {
    if (conditions.is_infrastructure !== context.is_infrastructure) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate progress for a set of items with responses
 */
export function calculateProgress(
  items: ReadinessItemWithResponse[]
): {
  completed: number;
  in_progress: number;
  not_required: number;
  not_completed: number;
  total: number;
  percentage: number;
} {
  const total = items.length;
  let completed = 0;
  let in_progress = 0;
  let not_required = 0;
  let not_completed = 0;

  for (const item of items) {
    const status = item.response?.status || 'not_completed';
    switch (status) {
      case 'completed':
        completed++;
        break;
      case 'in_progress':
        in_progress++;
        break;
      case 'not_required':
        not_required++;
        break;
      default:
        not_completed++;
    }
  }

  // Calculate percentage: (completed + not_required) / total
  const effectiveCompleted = completed + not_required;
  const percentage = total > 0 ? Math.round((effectiveCompleted / total) * 100) : 0;

  return {
    completed,
    in_progress,
    not_required,
    not_completed,
    total,
    percentage,
  };
}

/**
 * Check if a stage can be signed off
 * (all required items must be completed or marked not_required)
 */
export function canSignOffStage(items: ReadinessItemWithResponse[]): boolean {
  return items.every(item => {
    if (!item.is_required) return true;
    const status = item.response?.status;
    return status === 'completed' || status === 'not_required';
  });
}
