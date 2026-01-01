/**
 * Type definitions for AIMS Focal Point management
 */

// Focal point status values
export type FocalPointStatus = 'assigned' | 'pending_handoff' | 'accepted';

// Focal point type values
export type FocalPointType = 'government_focal_point' | 'development_partner_focal_point';

// Core focal point data structure
export interface FocalPoint {
  id: string;
  name: string;
  email: string;
  type: FocalPointType;
  status: FocalPointStatus;
  title?: string;
  job_title?: string;
  organisation?: string;
  avatar_url?: string;
  user_id?: string;
  
  // Assignment tracking
  assigned_by?: string;
  assigned_by_name?: string;
  assigned_at?: string;
  
  // Handoff tracking
  handed_off_by?: string;
  handed_off_by_name?: string;
  handed_off_at?: string;
  handed_off_to?: string;
  responded_at?: string;
  
  // Organization data
  organization?: {
    id: string;
    name: string;
    acronym?: string;
    iati_org_id?: string;
    country?: string;
  } | null;
}

// Focal point assignment request payload
export interface FocalPointAssignmentRequest {
  user_id: string;
  type: FocalPointType;
  action: 'assign' | 'remove';
  current_user_id: string;
}

// Focal point handoff request payload
export interface FocalPointHandoffRequest {
  user_id: string;
  type: FocalPointType;
  action: 'handoff';
  current_user_id: string;
}

// Focal point handoff response request payload
export interface FocalPointHandoffResponseRequest {
  user_id: string;
  type: FocalPointType;
  action: 'accept_handoff' | 'decline_handoff';
  current_user_id: string;
}

// Combined request type for API
export type FocalPointRequest = 
  | FocalPointAssignmentRequest 
  | FocalPointHandoffRequest 
  | FocalPointHandoffResponseRequest;

// API response for focal points
export interface FocalPointsResponse {
  government_focal_points: FocalPoint[];
  development_partner_focal_points: FocalPoint[];
}

// API response for focal point actions
export interface FocalPointActionResponse {
  success: boolean;
  action: 'assigned' | 'removed' | 'handoff_initiated' | 'handoff_accepted' | 'handoff_declined';
  assignment?: FocalPoint;
  error?: string;
}

// Props for Focal Points Tab component
export interface FocalPointsTabProps {
  activityId: string;
  onFocalPointsChange?: (focalPoints: FocalPoint[]) => void;
}

// Props for Handoff Modal component
export interface FocalPointHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  currentFocalPointName: string;
  type: FocalPointType;
  activityId: string;
}

// User option for selection
export interface FocalPointUserOption {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  organizationId?: string;
  organization?: string;
  value: string;
  label: string;
}


