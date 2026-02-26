export type ParcelStatus = 'available' | 'reserved' | 'allocated' | 'disputed';

export type AllocationRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

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
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  organization?: { id: string; name: string; acronym?: string } | null;
  allocation_requests?: AllocationRequest[];
  linked_projects?: LinkedProject[];
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
  recentParcels: LandParcel[];
  recentActivity: LandParcelHistory[];
}
