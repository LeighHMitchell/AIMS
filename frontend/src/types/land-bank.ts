export type ParcelStatus = 'available' | 'reserved' | 'allocated' | 'disputed';

export type AllocationRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export type TitleStatus = 'Clear' | 'Pending Verification' | 'Under Review' | 'Title Disputed' | 'Unregistered';

export type LandDocumentType = 'title_deed' | 'survey_report' | 'environmental_assessment' | 'valuation_report' | 'legal_opinion' | 'other';

export interface LineMinistry {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
  display_order?: number;
}

export interface LandAssetType {
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface LandParcelDocument {
  id: string;
  parcel_id: string;
  document_type: LandDocumentType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  signed_url?: string | null;
}

export interface LandParcelClassification {
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface LandParcel {
  id: string;
  parcel_code: string;
  name: string;
  state_region: string;
  township: string | null;
  geometry: GeoJSON.Geometry | null;
  size_hectares: number | null;
  classification: string | null;
  status: ParcelStatus;
  allocated_to: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  controlling_ministry_id: string | null;
  asset_type: string | null;
  title_status: TitleStatus;
  ndp_goal_id: string | null;
  secondary_ndp_goals: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  organization?: { id: string; name: string; acronym?: string } | null;
  controlling_ministry?: LineMinistry | null;
  ndp_goal?: { id: string; code: string; name: string } | null;
  allocation_requests?: AllocationRequest[];
  linked_projects?: LinkedProject[];
  documents?: LandParcelDocument[];
}

export interface AllocationRequest {
  id: string;
  parcel_id: string;
  organization_id: string;
  requested_by: string | null;
  status: AllocationRequestStatus;
  purpose: string | null;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  linked_project_id: string | null;
  priority_score_purpose: number | null;
  priority_score_track_record: number | null;
  priority_score_feasibility: number | null;
  total_score: number | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  organization?: { id: string; name: string; acronym?: string } | null;
  project?: { id: string; name: string; project_code: string } | null;
}

export interface LandParcelProject {
  id: string;
  parcel_id: string;
  project_id: string;
  linked_at: string;
  linked_by: string | null;
}

export interface LinkedProject {
  id: string;
  project_id: string;
  linked_at: string;
  project: {
    id: string;
    name: string;
    project_code: string;
    status: string;
    sector: string;
  };
}

export interface LandParcelHistory {
  id: string;
  parcel_id: string;
  action: string;
  details: Record<string, any> | null;
  performed_by: string | null;
  created_at: string;
  // Joined
  user?: { id: string; first_name: string; last_name: string } | null;
}

export interface LandBankStats {
  totalParcels: number;
  totalHectares: number;
  allocatedPercent: number;
  availableCount: number;
  byStatus: Record<ParcelStatus, number>;
  byRegion: { region: string; count: number; hectares: number }[];
  byClassification: { classification: string; count: number; hectares: number }[];
  byAssetType: { asset_type: string; count: number; hectares: number }[];
  byTitleStatus: { title_status: string; count: number }[];
  byMinistry: { ministry: string; count: number; hectares: number }[];
  recentParcels: LandParcel[];
  recentActivity: LandParcelHistory[];
}

export interface SuggestedProject {
  id: string;
  name: string;
  project_code: string;
  sector: string;
  region: string | null;
  status: string;
  score: number;
  match_reasons: string[];
}

export interface SuggestedParcel {
  id: string;
  name: string;
  parcel_code: string;
  state_region: string;
  size_hectares: number | null;
  classification: string | null;
  asset_type: string | null;
  status: ParcelStatus;
  score: number;
  match_reasons: string[];
}

export interface PublicParcel {
  id: string;
  parcel_code: string;
  name: string;
  state_region: string;
  township: string | null;
  size_hectares: number | null;
  classification: string | null;
  asset_type: string | null;
  title_status: TitleStatus;
  status: ParcelStatus;
  geometry: GeoJSON.Geometry | null;
}

export interface PublicProject {
  id: string;
  project_code: string;
  name: string;
  sector: string;
  region: string | null;
  estimated_cost: number | null;
  currency: string;
  status: string;
}
