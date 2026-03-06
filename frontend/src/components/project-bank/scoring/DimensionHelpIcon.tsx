"use client"

import { HelpCircle, Check } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ScoringDimension, ScoringStage } from "@/types/project-bank"

interface HelpItem {
  label: string
  pts: number
  /** key matching the sub_criterion key — used to match against live sub_scores */
  key?: string
}

interface SubScore {
  key: string
  label: string
  earned: number
  max: number
}

const HELP_DATA: Record<ScoringStage, Record<ScoringDimension, HelpItem[]>> = {
  intake: {
    msdp_alignment: [
      { key: 'ndp_goal_linked', label: 'Link a primary NDP goal', pts: 10 },
      { key: 'ndp_aligned_flag', label: 'Set the NDP aligned flag', pts: 5 },
      { key: 'secondary_goals_count', label: 'Link 3+ secondary NDP goals', pts: 10 },
      { key: 'sdg_count', label: 'Link 3+ SDG goals', pts: 10 },
      { key: 'msdp_strategy', label: 'Specify MSDP strategy area', pts: 10 },
      { key: 'alignment_justification', label: 'Write alignment justification (200+ chars)', pts: 10 },
      { key: 'sector_strategy_ref', label: 'Reference a sector strategy', pts: 5 },
      { key: 'in_sector_plan', label: 'Mark as in sector investment plan', pts: 5 },
    ],
    financial_viability: [
      { key: 'cost_provided', label: 'Enter an estimated cost', pts: 25 },
      { key: 'currency_set', label: 'Set the currency', pts: 10 },
      { key: 'budget_doc', label: 'Upload a budget estimate document', pts: 20 },
      { key: 'cost_estimate_doc', label: 'Upload a cost estimate document', pts: 20 },
    ],
    technical_maturity: [
      { key: 'objectives', label: 'Define objectives (100+ chars)', pts: 15 },
      { key: 'project_type', label: 'Specify a project type', pts: 10 },
      { key: 'concept_note', label: 'Upload a concept note', pts: 15 },
      { key: 'proposal_doc', label: 'Upload a project proposal', pts: 15 },
      { key: 'timeline', label: 'Enter estimated duration', pts: 10 },
    ],
    environmental_social_risk: [
      { key: 'env_screening_doc', label: 'Upload environmental screening document', pts: 35 },
      { key: 'stakeholder_analysis_doc', label: 'Upload stakeholder analysis document', pts: 35 },
    ],
    institutional_capacity: [
      { key: 'contact_officer', label: 'Name a contact officer', pts: 10 },
      { key: 'contact_completeness', label: 'Provide both email and phone', pts: 10 },
      { key: 'ministry', label: 'Specify the nominating ministry', pts: 10 },
      { key: 'implementing_agency', label: 'Identify implementing agency', pts: 15 },
      { key: 'endorsement_letter', label: 'Upload an endorsement letter', pts: 15 },
      { key: 'origin_type', label: 'Set the project origin', pts: 5 },
    ],
  },
  fs1: {
    msdp_alignment: [
      { key: 'fs1_narrative_alignment', label: 'Write FS-1 NDP alignment narrative (300+ chars)', pts: 30 },
      { key: 'msdp_alignment_doc', label: 'Upload MSDP alignment justification document', pts: 20 },
      { key: 'alignment_justification', label: 'Update alignment justification (200+ chars)', pts: 15 },
      { key: 'sector_strategy_ref', label: 'Reference a sector strategy', pts: 10 },
    ],
    financial_viability: [
      { key: 'revenue_component', label: 'Identify a revenue component', pts: 5 },
      { key: 'revenue_sources', label: 'Specify 2+ revenue sources', pts: 10 },
      { key: 'market_assessment', label: 'Write market assessment (200+ chars)', pts: 15 },
      { key: 'projected_users', label: 'Enter projected annual users', pts: 5 },
      { key: 'cost_table', label: 'Complete FIRR cost table (3+ years)', pts: 15 },
      { key: 'firr_calculated', label: 'Calculate the FIRR', pts: 10 },
      { key: 'firr_value', label: 'Achieve FIRR of 10%+', pts: 10 },
    ],
    technical_maturity: [
      { key: 'technical_approach', label: 'Document technical approach (200+ chars)', pts: 15 },
      { key: 'methodology', label: 'Describe technology/methodology (200+ chars)', pts: 15 },
      { key: 'risks', label: 'Identify technical risks (100+ chars)', pts: 15 },
      { key: 'has_technical_design', label: 'Indicate whether technical design exists', pts: 5 },
      { key: 'design_maturity', label: 'Set design maturity to construction-ready', pts: 15 },
      { key: 'project_life', label: 'Define project life in years', pts: 5 },
    ],
    environmental_social_risk: [
      { key: 'env_impact_assessed', label: 'Set environmental impact level', pts: 10 },
      { key: 'social_impact_assessed', label: 'Set social impact level', pts: 10 },
      { key: 'env_description', label: 'Describe environmental impact (200+ chars)', pts: 10 },
      { key: 'social_description', label: 'Describe social impact (200+ chars)', pts: 10 },
      { key: 'land_identified', label: 'Answer land acquisition requirement', pts: 10 },
      { key: 'resettlement_identified', label: 'Answer resettlement requirement', pts: 10 },
      { key: 'affected_households', label: 'Quantify affected households', pts: 5 },
      { key: 'eia_doc', label: 'Upload an EIA document', pts: 5 },
    ],
    institutional_capacity: [
      { key: 'fs_conductor', label: 'Identify FS conductor type', pts: 10 },
      { key: 'fs_date', label: 'Record the FS date', pts: 10 },
      { key: 'fs1_narrative_completeness', label: 'Complete all 4 FS-1 narrative sections', pts: 20 },
      { key: 'preliminary_fs_report', label: 'Upload preliminary FS report', pts: 15 },
      { key: 'endorsement_letter', label: 'Upload an endorsement letter', pts: 10 },
    ],
  },
  fs2: {
    msdp_alignment: [
      { key: 'socioeconomic_benefits', label: 'Document socio-economic benefits (300+ chars)', pts: 35 },
      { key: 'demand_methodology', label: 'Describe demand methodology (300+ chars)', pts: 20 },
      { key: 'willingness_to_pay', label: 'Analyse willingness to pay (200+ chars)', pts: 15 },
    ],
    financial_viability: [
      { key: 'eirr_calculated', label: 'Calculate the EIRR', pts: 15 },
      { key: 'eirr_value', label: 'Achieve EIRR of 15%+', pts: 20 },
      { key: 'financing_plan', label: 'Document financing plan (300+ chars)', pts: 15 },
      { key: 'financial_assumptions', label: 'Document financial assumptions (200+ chars)', pts: 10 },
      { key: 'cost_breakdown', label: 'Complete cost breakdown (5 categories)', pts: 10 },
    ],
    technical_maturity: [
      { key: 'engineering_approach', label: 'Describe engineering approach (300+ chars)', pts: 15 },
      { key: 'design_standards', label: 'Reference design standards (100+ chars)', pts: 10 },
      { key: 'construction_methodology', label: 'Describe construction methodology (300+ chars)', pts: 15 },
      { key: 'milestones', label: 'Define implementation milestones', pts: 10 },
      { key: 'tech_design_doc', label: 'Upload technical design document', pts: 15 },
    ],
    environmental_social_risk: [
      { key: 'eia_category', label: 'Assign EIA category', pts: 10 },
      { key: 'env_findings', label: 'Summarise environmental findings (200+ chars)', pts: 10 },
      { key: 'env_mitigation', label: 'Write environmental mitigation plan (300+ chars)', pts: 15 },
      { key: 'resettlement_plan', label: 'Document resettlement plan (300+ chars)', pts: 15 },
      { key: 'grievance_mechanism', label: 'Describe grievance mechanism (200+ chars)', pts: 10 },
      { key: 'eia_doc', label: 'Upload an EIA document', pts: 10 },
    ],
    institutional_capacity: [
      { key: 'procurement_strategy', label: 'Document procurement strategy (300+ chars)', pts: 15 },
      { key: 'institutional_arrangements', label: 'Describe institutional arrangements (300+ chars)', pts: 15 },
      { key: 'me_framework', label: 'Define M&E framework (200+ chars)', pts: 10 },
      { key: 'capacity_building', label: 'Write capacity building plan (200+ chars)', pts: 10 },
      { key: 'risk_register_quality', label: 'Complete risk register (3+ risks, 75%+ fields)', pts: 15 },
      { key: 'detailed_fs_report', label: 'Upload detailed FS report', pts: 10 },
    ],
  },
}

const DIMENSION_DESCRIPTIONS: Record<ScoringDimension, string> = {
  msdp_alignment: 'Alignment with the Myanmar Sustainable Development Plan (MSDP) and national development goals.',
  financial_viability: 'Financial sustainability, cost-benefit analysis, and return on investment potential.',
  technical_maturity: 'Technical readiness of the project design and implementation methodology.',
  environmental_social_risk: 'Environmental and social risk identification, assessment, and mitigation.',
  institutional_capacity: 'Implementing agency\'s organisational readiness and capacity for delivery.',
}

interface DimensionHelpIconProps {
  dimension: ScoringDimension
  stage: ScoringStage
  /** Live sub-score results from the scoring engine */
  subScores?: SubScore[]
}

export function DimensionHelpIcon({ dimension, stage, subScores }: DimensionHelpIconProps) {
  const items = HELP_DATA[stage]?.[dimension] || HELP_DATA.intake[dimension]
  const description = DIMENSION_DESCRIPTIONS[dimension]
  const totalPts = items.reduce((sum, i) => sum + i.pts, 0)

  // Build a lookup of earned points by sub-criterion key
  const earnedByKey: Record<string, number> = {}
  if (subScores) {
    subScores.forEach(s => { earnedByKey[s.key] = s.earned })
  }

  const hasScores = subScores && subScores.length > 0
  const earnedTotal = hasScores
    ? items.reduce((sum, item) => sum + (item.key ? (earnedByKey[item.key] ?? 0) : 0), 0)
    : 0
  // "full" = earned max points; "partial" = some but not all
  const fullCount = hasScores
    ? items.filter(item => item.key && (earnedByKey[item.key] ?? 0) >= item.pts).length
    : 0
  const partialCount = hasScores
    ? items.filter(item => {
        if (!item.key) return false
        const earned = earnedByKey[item.key] ?? 0
        return earned > 0 && earned < item.pts
      }).length
    : 0

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/50 cursor-help flex-shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[280px] p-3">
          <p className="text-[11px] text-muted-foreground mb-2">{description}</p>
          {hasScores && (
            <p className="text-[10px] text-muted-foreground mb-1">
              {fullCount}/{items.length} complete{partialCount > 0 ? `, ${partialCount} partial` : ''} ({earnedTotal}/{totalPts} pts)
            </p>
          )}
          <p className="text-[10px] font-semibold mb-1">
            {hasScores ? 'Scoring checklist:' : `How to score 100% (${totalPts} pts):`}
          </p>
          <ul className="space-y-0.5">
            {items.map((item, i) => {
              const earnedPts = item.key ? (earnedByKey[item.key] ?? 0) : 0
              const isFull = hasScores && earnedPts >= item.pts
              const isPartial = hasScores && earnedPts > 0 && earnedPts < item.pts
              return (
                <li key={i} className="text-[10px] flex items-start gap-1">
                  {hasScores ? (
                    isFull ? (
                      <Check className="h-2.5 w-2.5 text-emerald-500 mt-px flex-shrink-0" />
                    ) : isPartial ? (
                      <span className="text-amber-500 mt-px flex-shrink-0">&#9679;</span>
                    ) : (
                      <span className="text-muted-foreground/60 mt-px flex-shrink-0">&#8226;</span>
                    )
                  ) : (
                    <span className="text-muted-foreground/60 mt-px flex-shrink-0">&#8226;</span>
                  )}
                  <span className={`flex-1 ${isFull ? 'text-muted-foreground/40 line-through' : isPartial ? 'text-amber-600/70' : ''}`}>
                    {item.label}
                  </span>
                  <span className={`flex-shrink-0 tabular-nums ${isFull ? 'text-emerald-500/60' : isPartial ? 'text-amber-500' : 'text-muted-foreground/60'}`}>
                    {hasScores ? `${earnedPts}/${item.pts}` : item.pts}
                  </span>
                </li>
              )
            })}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
