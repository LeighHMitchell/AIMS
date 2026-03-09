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
  contact_officer_first_name: string | null
  contact_officer_last_name: string | null
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

export type ColumnKey = "pending" | "desk_review" | "senior_review"

export interface ReviewColumns {
  pending: ReviewProject[]
  desk_review: ReviewProject[]
  senior_review: ReviewProject[]
}

export type IntakeColumnKey = "pending" | "desk_review" | "senior_review"

export interface IntakeReviewColumns {
  pending: IntakeReviewProject[]
  desk_review: IntakeReviewProject[]
  senior_review: IntakeReviewProject[]
}

export interface FS2ReviewProject {
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
  firr: number | null
  eirr: number | null
  ndp_aligned: boolean
  category_recommendation: string | null
  updated_at: string
}

export type FS2ColumnKey = "pending" | "desk_review" | "senior_review" | "categorized"

export interface FS2ReviewColumns {
  pending: FS2ReviewProject[]
  desk_review: FS2ReviewProject[]
  senior_review: FS2ReviewProject[]
  categorized: FS2ReviewProject[]
}

export interface CategorizedProject {
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
  pathway: string | null
  category_decision: string | null
  firr: number | null
  eirr: number | null
  ndp_aligned: boolean
  updated_at: string
}

export type CategorizedColumnKey = "private" | "government" | "ppp" | "oda"

export interface CategorizedColumns {
  private: CategorizedProject[]
  government: CategorizedProject[]
  ppp: CategorizedProject[]
  oda: CategorizedProject[]
}
