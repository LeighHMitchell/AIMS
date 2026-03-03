import type { FeasibilityStage, ProjectStage } from "@/types/project-bank"

export interface ReviewProject {
  id: string
  project_code: string
  name: string
  nominating_ministry: string
  implementing_agency: string | null
  sector: string
  sub_sector: string | null
  region: string | null
  estimated_cost: number | null
  currency: string
  feasibility_stage: FeasibilityStage
  project_stage: ProjectStage
  fs1_rejected_at: string | null
  created_at: string
  updated_at: string
}

export interface IntakeReviewProject {
  id: string
  project_code: string
  name: string
  nominating_ministry: string
  implementing_agency: string | null
  sector: string
  sub_sector: string | null
  region: string | null
  estimated_cost: number | null
  currency: string
  project_stage: ProjectStage
  description: string | null
  contact_officer: string | null
  contact_email: string | null
  banner: string | null
  banner_position: number | null
  created_at: string
  updated_at: string
}

export interface RejectedProject {
  id: string
  project_code: string
  name: string
  nominating_ministry: string
  implementing_agency: string | null
  sector: string
  sub_sector: string | null
  region: string | null
  estimated_cost: number | null
  currency: string
  project_stage: ProjectStage
  rejection_reason: string | null
  review_comments: string | null
  rejected_at: string | null
  fs1_rejected_at: string | null
  updated_at: string
}

export interface DecisionOption {
  value: string
  label: string
  description: string
  image: string
  alt: string
}

export type ColumnKey = "submitted" | "desk_screened" | "returned"

export interface ReviewColumns {
  submitted: ReviewProject[]
  desk_screened: ReviewProject[]
  returned: ReviewProject[]
}

export type IntakeColumnKey = "submitted" | "desk_screened" | "returned"

export interface IntakeReviewColumns {
  submitted: IntakeReviewProject[]
  desk_screened: IntakeReviewProject[]
  returned: IntakeReviewProject[]
}
