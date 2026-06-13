"use client"

import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AnalyticsSkeleton } from '@/components/ui/skeleton-loader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Shield, Target, Building2, SlidersHorizontal,
  CheckCircle2, Users, BarChart3, Globe, Handshake,
  Eye, Heart, Calendar, HelpCircle, ChevronDown, CalendarIcon
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { SectorHierarchyFilter, SectorFilterSelection, matchesSectorFilter } from '@/components/maps/SectorHierarchyFilter'
import { OrganizationCombobox } from '@/components/ui/organization-combobox'
import { format } from 'date-fns'
import { isPositiveValue } from '@/lib/aid-effectiveness-helpers'
import { TiedAidChart } from '@/components/aid-effectiveness/TiedAidChart'
import { BudgetPlanningChart } from '@/components/aid-effectiveness/BudgetPlanningChart'
import { GovernmentSystemsChart } from '@/components/aid-effectiveness/GovernmentSystemsChart'
import { DevelopmentIndicatorsChart } from '@/components/aid-effectiveness/DevelopmentIndicatorsChart'
import { GPEDCComplianceChart } from '@/components/aid-effectiveness/GPEDCComplianceChart'
import { ImplementingPartnersChart } from '@/components/aid-effectiveness/ImplementingPartnersChart'
import { ChartTooltipCard } from '@/components/ui/chart-tooltip'
import { ChartExpandButton } from '@/components/aid-effectiveness/ChartExpandButton'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'
import { DashboardFilters } from '@/components/aid-effectiveness/DashboardFilters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// --- Types ---

interface AidEffectivenessData {
  implementingPartner?: string
  // Section 1
  formallyApprovedByGov?: boolean
  includedInNationalPlan?: boolean
  linkedToGovFramework?: boolean
  indicatorsFromGov?: boolean
  indicatorsViaGovData?: boolean
  implementedByNationalInstitution?: boolean
  govEntityAccountable?: boolean
  supportsPublicSector?: boolean
  capacityDevFromNationalPlan?: boolean
  numOutcomeIndicators?: number
  // Section 2
  fundsViaNationalTreasury?: boolean
  govBudgetSystem?: boolean
  govFinReporting?: boolean
  finReportingIntegratedPFM?: boolean
  govAudit?: boolean
  govProcurement?: boolean
  govSystemWhyNot?: string
  // Section 3
  annualBudgetShared?: boolean
  forwardPlanShared?: boolean
  multiYearFinancingAgreement?: boolean
  tiedStatus?: string
  // Section 4
  annualFinReportsPublic?: boolean
  dataUpdatedPublicly?: boolean
  finalEvalPlanned?: boolean
  finalEvalDate?: string
  evalReportPublic?: boolean
  performanceIndicatorsReported?: boolean
  // Section 5
  jointAnnualReview?: boolean
  mutualAccountabilityFramework?: boolean
  correctiveActionsDocumented?: boolean
  // Section 6
  civilSocietyConsulted?: boolean
  csoInvolvedInImplementation?: boolean
  coreFlexibleFundingToCSO?: boolean
  publicPrivateDialogue?: boolean
  privateSectorEngaged?: boolean
  // Section 7
  genderObjectivesIntegrated?: boolean
  genderBudgetAllocation?: boolean
  genderDisaggregatedIndicators?: boolean
  remarks?: string
}

interface ActivityRow {
  id: string
  title_narrative: string | null
  planned_start_date: string | null
  activity_status: string | null
  general_info: any
  reporting_org_id: string | null
}

interface ReportingOrg {
  id: string
  name: string
  acronym: string | null
  logo: string | null
}

// --- Constants ---

const AVAILABLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 2008 + 4 },
  (_, i) => 2008 + i
)
const GPEDC_BG = 'url(https://www.effectivecooperation.org/sites/default/files/imported/images/Colors_GPEDC.png)'

// --- Helpers ---

const toBool = (val: any): boolean => isPositiveValue(val)
const pct = (count: number, total: number): number =>
  total === 0 ? 0 : Math.round((count / total) * 100)

// Help tooltip descriptions for each chart. Each entry explains why this slice
// of data matters for assessing aid effectiveness in country, what "good" and
// "concerning" look like in practice, and what the user should do about it.
const CHART_HELP: Record<string, string> = {
  overallScore: 'The single headline number for how country-led, transparent and accountable the development cooperation in this portfolio is. It averages the share of "Yes" responses across every GPEDC monitoring question. Above 70% means most activities are honouring the international effectiveness commitments; below 50% means at least half the portfolio is bypassing one or more core principles. Use this to track progress year-on-year and to anchor donor dialogue at portfolio level.',

  gpedcCompliant: 'The number and share of activities meeting at least 60% of the GPEDC monitoring criteria. 60% is the working threshold used to flag activities that are broadly aligned with the principles versus those that need a structured improvement plan. A rising compliance rate is direct evidence that effectiveness commitments are translating into practice; a falling rate signals new activities entering the portfolio without effectiveness safeguards built in.',

  govOwnership: 'GPEDC Indicator 1: the extent to which development partners use the country\'s own priorities, plans, results frameworks and institutions. High ownership means the activity is co-owned by government and embedded in national delivery structures; low ownership means parallel donor systems are duplicating what government already has. This is the bedrock of country-led development; every other indicator depends on it.',

  untiedAid: 'GPEDC Indicator 10: the share of aid that is fully untied, meaning recipients can procure goods and services from any source rather than only from the donor country. Untied aid produces better value for money, supports local markets, and respects country sovereignty over procurement. The DAC global benchmark is around 80%; a tied share above 25% in country warrants direct engagement on procurement rules.',

  avgOutcomes: 'The average number of government-defined outcome indicators on each activity\'s results framework. Outcome indicators (changes in conditions or behaviour) signal whether monitoring is built into activities, and using government-defined ones means partners are aligning to the country\'s own M&E system rather than parallel donor frameworks. 3–5 indicators per activity is the healthy range; 0 means flying blind on results, 10+ often signals output counts mislabelled as outcomes.',

  sectionRadar: 'A bird\'s-eye view of the portfolio across all seven GPEDC principles. Each axis is one principle; the further the polygon reaches towards the outer edge, the better the portfolio honours that principle. A round shape means broad effectiveness; sharp inward dents identify the specific principles needing attention. Most portfolios show predictable weak points around country systems and mutual accountability, and those are the structural conversations to prioritise.',

  tiedAid: 'GPEDC Indicator 10 in detail: the split between untied, partially tied, and tied aid. Tied aid restricts procurement to the donor country or a limited set of providers, which inflates costs and crowds out local suppliers. Aid that flows untied produces better value for the recipient and recycles through local markets. Watch the tied share over time: falling = effectiveness commitments being honoured.',

  sectionBars: 'Side-by-side comparison of the seven GPEDC principles with exact percentages, easier than the radar for reading numbers and prioritising. The lowest bar is the principle most worth addressing across the portfolio; the highest bar identifies an area where partners can share practice with peers. Anything below 50% means a principle is being met in fewer than half of activities; that\'s a structural issue, not a coverage gap.',

  partners: 'How activity delivery is distributed across implementing partners. Concentration in 2–3 large agencies is a delivery-risk signal: losing one disrupts the portfolio. A long tail of single-activity partners adds coordination cost without much depth. The healthy pattern is 5–10 substantial partners; review the mix against ownership commitments: are national or local partners under-represented?',

  ownership: 'GPEDC Indicator 1: Government Ownership and Strategic Alignment. This block asks whether each activity is formally approved by government, sits inside the national plan, draws indicators from the government\'s results framework, is implemented through a national institution, holds a government entity accountable, and supports public-sector capacity. It is the most concrete test of whether development cooperation is country-led rather than donor-driven.',

  countrySystems: 'GPEDC Indicator 5a: Use of Country Public Financial Management and Procurement Systems. The four sub-questions ask whether funds flow through the national treasury, the government\'s budget execution system, government financial reporting, government audit, and national procurement law. Using country systems builds capacity and reduces parallel structures; bypassing them means donors are signalling fiduciary doubt, a finding that needs an explicit response.',

  govWhyNot: 'When development partners bypass government PFM, audit, or procurement systems, this captures the reason given. The pattern of justifications is itself diagnostic: repeated "fiduciary risk" or "donor procurement rules" answers point to specific reforms (audit credibility, procurement law alignment) that would unlock deeper alignment. This is where the country systems agenda gets practical.',

  outcomeIndicators: 'Distribution of activities by how many government-defined outcome indicators they track. The "0" slice is the highest-priority gap: those activities have no government-aligned results monitoring at all and can\'t be held to account against country development plans. A bell shape centred on 3–5 indicators is healthy; heavy 10+ tail usually signals padded output counts rather than rigorous M&E.',

  predictability: 'GPEDC Indicators 5b, 6 and 10 combined. Are annual budgets shared with government before the fiscal year? Are 3-year forward plans shared? Are multi-year financing agreements in place? Predictability is what allows recipient governments to plan their own budgets and service delivery. Activities that fail this block create planning black holes; government can\'t budget against money it doesn\'t know is coming.',

  transparency: 'GPEDC Indicator 4: Transparency and Timely Reporting. Whether annual financial reports, evaluation reports, performance data and disbursement updates are publicly available and regularly refreshed. Transparency is the precondition for citizen accountability and for parliaments to scrutinise external assistance. Low scores here usually mean the IATI publishing pipeline isn\'t in place or hasn\'t been resourced.',

  accountability: 'GPEDC Indicator 7: Mutual Accountability. Are joint government-partner reviews happening? Is there a mutual accountability framework in place? Are corrective actions documented and followed up? This block tests whether the partnership has feedback loops and consequences, or whether reporting is one-way (recipient to donor) without ever reversing direction.',

  civilSociety: 'GPEDC Indicators 2 and 3, engagement with civil society and the private sector. Are CSOs consulted on activity design? Do they help implement? Is there core flexible funding for the CSO sector or only short-term project grants? Is there structured public-private dialogue? Inclusive partnerships are correlated with longer-term sustainability and stronger local accountability.',

  gender: 'GPEDC Indicator 8: Gender Equality and Women\'s Empowerment. Are gender objectives integrated into the activity design? Is there a budget line specifically allocated to gender equality? Are indicators disaggregated by sex? Activities scoring zero across this block aren\'t gender-blind by accident; they\'re evidence the gender mainstreaming policy isn\'t reaching implementation.',

  complianceRadar: 'The full GPEDC monitoring framework as a compliance radar, with every principle visible at once. Use this for board reports and for spotting the difference between portfolios that are evenly aligned versus portfolios that score well overall but with one or two principles dragging the rest down. The shape tells the story.',

  allSections: 'Numeric scoreboard of all seven GPEDC sections with badges colour-coded by tier: above 70% (consistent practice), 50–70% (uneven adoption, partner-driven), below 50% (structural weakness). Designed to be lifted directly into status reports and effectiveness dialogues.',
}

// Substantive interpretation paragraphs shown beneath each section's chart.
// Each one explains what the GPEDC principle actually means, what each
// indicator (row) captures, and what understanding this picture tells the user
// about aid effectiveness in country.
const SECTION_INTERPRETATIONS: Record<string, string> = {
  ownership:
    "Government ownership in GPEDC means the country's own development priorities, plans and institutions drive how external assistance is used, not the development partner's own programming. Each row here captures a different operational test of that ownership: whether the activity has a formal government agreement, whether it appears inside the national development plan, whether its results framework draws on the government's own goals and indicators, whether monitoring data flows through government M&E systems, whether implementation sits with a national institution and a government entity is contractually accountable, and whether the activity strengthens public-sector capacity. Together, these tell you whether external assistance in country is genuinely co-owned with government, or whether donors are running parallel programmes that happen to take place in the country.",

  countrySystems:
    "GPEDC Indicator 5a asks whether external assistance flows through the country's own public financial management (PFM) systems (the same treasury, budget execution, financial reporting, audit and procurement systems that manage domestic public spending), or through parallel donor processes. Each row here tracks one specific PFM channel: whether funds actually pass through the national treasury before disbursement, whether spending uses the country's budget execution and chart of accounts, whether expenditure is recorded in the government's financial reporting system, whether activities are subject to country audit institutions, and whether procurement follows national law. When activities use these systems, country PFM capacity is exercised and strengthened; when they don't, donors are signalling fiduciary doubt, a finding that warrants a specific reform response rather than indefinite parallel structures.",

  predictability:
    "Predictability means the recipient government knows what funding to expect, when, and on what terms, so it can build external assistance into its own budget cycle and medium-term plans. Without it, country-led planning collapses into reactive scrambling. The rows here capture three distinct predictability commitments: whether the development partner shares its annual disbursement plan with government before the fiscal year starts (GPEDC Indicator 5b), whether it shares a 3-year forward plan so the recipient can plan beyond the immediate year (Indicator 6), and whether a multi-year financing agreement formalises the commitment beyond a single fiscal cycle. The picture here tells you whether the country can actually plan around its external assistance, or whether it has to treat each year as a fresh negotiation.",

  transparency:
    "Transparency in GPEDC means the public, parliament, civil society and other partners can see what's being spent in the country, on what, and with what results. The rows here cover the full transparency lifecycle of an activity: whether annual financial reports are publicly available, whether activity and disbursement data are refreshed regularly (typically via IATI publishing), whether a final evaluation is planned at the start, whether the evaluation report is then published rather than buried, and whether performance against indicators is reported openly. Strong scores here mean external scrutiny is enabled: citizens, oversight bodies and other partners can independently assess how external assistance is being used. Low scores mean reporting is happening privately or not at all, breaking the accountability chain.",

  accountability:
    "Mutual accountability is the commitment that the development partnership has feedback loops in both directions: government and partners review each other's performance, agree on what needs to change, and document what they'll do about it. The rows here check whether these loops actually exist in practice: whether a joint annual review is held where government and partners assess effectiveness together, whether there's a documented mutual accountability framework defining how that review happens, and whether corrective actions identified during the review are written down and tracked through to follow-up. Without these, 'partnership' becomes a one-way street, where donors hold recipients to account, but face no equivalent reciprocal scrutiny themselves. Strong scores here are evidence that the country has genuine governance over how its external assistance evolves.",

  civilSociety:
    "Effective development cooperation isn't only government-to-government; it depends on the citizens, civil society organisations and private-sector actors who shape, deliver and benefit from activities. GPEDC Indicators 2 and 3 measure how genuinely inclusive activities are. The rows here capture five engagement points: whether civil society is consulted in activity design, whether CSOs are involved in implementation rather than just consultation, whether they receive core flexible funding (rather than only short-term project grants), whether structured public-private dialogue exists, and whether the private sector is engaged as a partner. Together they tell you whether external assistance in country is genuinely co-produced with local actors, or imposed on them, a strong predictor of whether outcomes will outlast donor presence.",

  gender:
    "GPEDC Indicator 8 asks whether gender mainstreaming actually reaches activity-level practice in country, rather than living only in policy documents. The rows here are the specific operational tests: whether gender objectives are integrated into the activity's results framework, whether budget is specifically allocated to gender equality outcomes, and whether performance indicators are reported disaggregated by sex. Activities scoring zero across this section aren't gender-blind by accident; they're evidence that the country's gender mainstreaming policy isn't translating into design and reporting practice, and they're the precise activities to focus gender-targeted technical assistance on.",
}

// All boolean indicator fields grouped by section
// IATI Codelist 9 (OrganisationType) — labels used when disaggregating charts by org type.
const IATI_ORG_TYPE_LABELS: Record<string, string> = {
  '10': 'Government',
  '11': 'Local Government',
  '15': 'Other Public Sector',
  '21': 'International NGO',
  '22': 'National NGO',
  '23': 'Regional NGO',
  '24': 'Country-based NGO',
  '30': 'Public-Private Partnership',
  '40': 'Multilateral',
  '60': 'Foundation',
  '70': 'Private Sector',
  '71': 'Private Sector – Provider Country',
  '72': 'Private Sector – Aid Recipient Country',
  '73': 'Private Sector – Third Country',
  '80': 'Academic / Research',
  '90': 'Other',
}

// Discrete orange/slate palette for disaggregated series (used for stacked bars by donor / org type).
const DISAGG_COLORS = ['#F37021', '#F8A872', '#C25A10', '#1e293b', '#475569', '#94a3b8', '#fbbf24', '#0ea5e9', '#22c55e', '#8b5cf6']

const SECTION_FIELDS: Record<string, { label: string; fields: { key: keyof AidEffectivenessData; label: string }[] }> = {
  ownership: {
    label: '1. Government Ownership',
    fields: [
      { key: 'formallyApprovedByGov', label: 'Formally Approved by Government' },
      { key: 'includedInNationalPlan', label: 'Included in National Plan' },
      { key: 'linkedToGovFramework', label: 'Linked to Government Results Framework' },
      { key: 'indicatorsFromGov', label: 'Indicators from Government Frameworks' },
      { key: 'indicatorsViaGovData', label: 'Monitored via Government M&E' },
      { key: 'implementedByNationalInstitution', label: 'Implemented by National Institution' },
      { key: 'govEntityAccountable', label: 'Government Entity Accountable' },
      { key: 'supportsPublicSector', label: 'Supports Public Sector' },
      { key: 'capacityDevFromNationalPlan', label: 'Capacity Development from National Plan' },
    ]
  },
  countrySystems: {
    label: '2. Country Systems',
    fields: [
      { key: 'fundsViaNationalTreasury', label: 'Funds via National Treasury' },
      { key: 'govBudgetSystem', label: 'Government Budget Execution' },
      { key: 'govFinReporting', label: 'Government Financial Reporting' },
      { key: 'finReportingIntegratedPFM', label: 'Integrated into Public Financial Management' },
      { key: 'govAudit', label: 'Government Audit Procedures' },
      { key: 'govProcurement', label: 'National Procurement Systems' },
    ]
  },
  predictability: {
    label: '3. Predictability',
    fields: [
      { key: 'annualBudgetShared', label: 'Annual Budget Shared' },
      { key: 'forwardPlanShared', label: '3-Year Forward Plan Shared' },
      { key: 'multiYearFinancingAgreement', label: 'Multi-Year Financing Agreement' },
    ]
  },
  transparency: {
    label: '4. Transparency',
    fields: [
      { key: 'annualFinReportsPublic', label: 'Annual Reports Public' },
      { key: 'dataUpdatedPublicly', label: 'Data Updated Publicly' },
      { key: 'finalEvalPlanned', label: 'Final Evaluation Planned' },
      { key: 'evalReportPublic', label: 'Evaluation Report Public' },
      { key: 'performanceIndicatorsReported', label: 'Performance Indicators Reported' },
    ]
  },
  accountability: {
    label: '5. Mutual Accountability',
    fields: [
      { key: 'jointAnnualReview', label: 'Joint Annual Review' },
      { key: 'mutualAccountabilityFramework', label: 'Mutual Accountability Framework' },
      { key: 'correctiveActionsDocumented', label: 'Corrective Actions Documented' },
    ]
  },
  civilSociety: {
    label: '6. Civil Society & Private Sector',
    fields: [
      { key: 'civilSocietyConsulted', label: 'Civil Society Consulted' },
      { key: 'csoInvolvedInImplementation', label: 'CSOs in Implementation' },
      { key: 'coreFlexibleFundingToCSO', label: 'Core Funding to CSOs' },
      { key: 'publicPrivateDialogue', label: 'Public-Private Dialogue' },
      { key: 'privateSectorEngaged', label: 'Private Sector Engaged' },
    ]
  },
  gender: {
    label: '7. Gender Equality',
    fields: [
      { key: 'genderObjectivesIntegrated', label: 'Gender Objectives Integrated' },
      { key: 'genderBudgetAllocation', label: 'Gender Budget Allocation' },
      { key: 'genderDisaggregatedIndicators', label: 'Gender-Disaggregated Indicators' },
    ]
  },
}

// --- Help Tooltip ---

function HelpTooltip({ helpKey, className }: { helpKey: string; className?: string }) {
  const text = CHART_HELP[helpKey]
  if (!text) return null
  return (
    <TooltipProvider>
      <UITooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-4 w-4 cursor-help shrink-0 ${className || 'text-muted-foreground hover:text-foreground'}`} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-helper leading-relaxed">
          {text}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  )
}

// --- Shared dashboard filters via context (avoids prop-drilling and remounts) ---

const DashboardFiltersContext = createContext<React.ReactNode>(null)

// --- Main Component ---

export default function AidEffectivenessDashboard() {
  const [loading, setLoading] = useState(true)
  const [rawActivities, setRawActivities] = useState<ActivityRow[]>([])
  const [orgMap, setOrgMap] = useState<Map<string, string>>(new Map())
  const [orgTypeMap, setOrgTypeMap] = useState<Map<string, string>>(new Map())

  // Year / calendar state
  const [calendarType, setCalendarType] = useState<string>('')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [customYears, setCustomYears] = useState<CustomYear[]>([])
  const [customYearsLoading, setCustomYearsLoading] = useState(true)

  // Reporting org filter (donor filter)
  const [reportingOrgs, setReportingOrgs] = useState<ReportingOrg[]>([])
  const [selectedReportingOrg, setSelectedReportingOrg] = useState<string>('all')

  // Sector filter — uses the same hierarchical selector as the Atlas page.
  const [chartSectorSelection, setChartSectorSelection] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  })
  const [chartSectorFilterOpen, setChartSectorFilterOpen] = useState(false)
  const [activitySectors, setActivitySectors] = useState<Map<string, Set<string>>>(new Map())
  const [sectorActivityCounts, setSectorActivityCounts] = useState<Record<string, number>>({})
  const [chartSectorShowOnlyActive, setChartSectorShowOnlyActive] = useState(true)

  // Org-type filter (IATI organisation type code on the reporting org)
  const [chartOrgTypeFilter, setChartOrgTypeFilter] = useState<string>('all')

  // Effective date range from year selection
  const effectiveDateRange = useMemo(() => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear && selectedYears.length > 0) {
      const sortedYears = [...selectedYears].sort((a, b) => a - b)
      const firstYearRange = getCustomYearRange(customYear, sortedYears[0])
      const lastYearRange = getCustomYearRange(customYear, sortedYears[sortedYears.length - 1])
      return { from: firstYearRange.start, to: lastYearRange.end }
    }
    return null
  }, [customYears, selectedYears, calendarType])

  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      const start = Math.min(selectedYears[0], year)
      const end = Math.max(selectedYears[0], year)
      setSelectedYears([start, end])
    } else if (selectedYears.length === 0) {
      setSelectedYears([year])
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) {
        setSelectedYears([])
      } else {
        const start = Math.min(selectedYears[0], year)
        const end = Math.max(selectedYears[0], year)
        setSelectedYears([start, end])
      }
    } else {
      setSelectedYears([year])
    }
  }

  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    return year > minYear && year < maxYear
  }

  const getYearLabel = (year: number) => {
    const customYear = customYears.find(cy => cy.id === calendarType)
    if (customYear) return getCustomYearLabel(customYear, year)
    return `${year}`
  }

  useEffect(() => { fetchData() }, [])

  // Fetch custom years
  useEffect(() => {
    const fetchCustomYears = async () => {
      try {
        const response = await fetch('/api/custom-years')
        if (response.ok) {
          const result = await response.json()
          const years = result.data || []
          setCustomYears(years)
          let selectedCalendar: CustomYear | undefined
          if (result.defaultId) {
            selectedCalendar = years.find((cy: CustomYear) => cy.id === result.defaultId)
          }
          if (!selectedCalendar && years.length > 0) {
            selectedCalendar = years[0]
          }
          if (selectedCalendar) {
            setCalendarType(selectedCalendar.id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch custom years:', err)
      } finally {
        setCustomYearsLoading(false)
      }
    }
    fetchCustomYears()
  }, [])

  // Fetch sector activity IDs when sector filter changes
  // Load sector membership once: activity_id -> set of sector codes, plus a flat
  // list of distinct codes for the per-chart sector filter dropdown.
  useEffect(() => {
    let cancelled = false
    const loadSectors = async () => {
      try {
        // Schema: activity_sectors(activity_id, sector_code, percentage)
        // Paginate to avoid the PostgREST max-rows cap.
        const all: any[] = []
        const PAGE = 1000
        let from = 0
        while (true) {
          const { data, error } = await supabase
            .from('activity_sectors')
            .select('activity_id, sector_code')
            .range(from, from + PAGE - 1)
          if (cancelled) return
          if (error) {
            console.warn('[Aid Effectiveness] activity_sectors fetch error:', error)
            break
          }
          if (!data || data.length === 0) break
          all.push(...data)
          if (data.length < PAGE) break
          from += PAGE
          if (from > 200_000) break
        }
        const map = new Map<string, Set<string>>()
        // Activity counts per sector code, with category/group rollups so the
        // hierarchical SectorHierarchyFilter can show counts at every level.
        const counts: Record<string, number> = {}
        const seen = new Map<string, Set<string>>() // code -> set of activity ids (de-dupe)
        const bumpCount = (code: string, activityId: string) => {
          if (!seen.has(code)) seen.set(code, new Set())
          const set = seen.get(code)!
          if (set.has(activityId)) return
          set.add(activityId)
          counts[code] = (counts[code] || 0) + 1
        }
        all.forEach((row: any) => {
          const code = row.sector_code
          if (!code) return
          if (!map.has(row.activity_id)) map.set(row.activity_id, new Set())
          map.get(row.activity_id)!.add(code)
          bumpCount(code, row.activity_id)
          if (code.length >= 3) bumpCount(code.substring(0, 3), row.activity_id)
        })
        setActivitySectors(map)
        setSectorActivityCounts(counts)
      } catch (err) {
        console.warn('[Aid Effectiveness] Sector lookup error:', err)
      }
    }
    loadSectors()
    return () => { cancelled = true }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: activities, error } = await supabase
        .from('activities')
        .select('id, title_narrative, general_info, planned_start_date, activity_status, reporting_org_id')
      if (error) throw error

      const withAE = (activities || []).filter((a: any) => a.general_info?.aidEffectiveness)
      setRawActivities(withAE)

      // Collect every org id referenced by these activities so we can fetch them
      // explicitly. The broad fetch below can hit Supabase's PostgREST max-rows
      // cap (typically 1000) and silently miss orgs we need for disaggregation.
      const referencedOrgIds = new Set<string>()
      withAE.forEach((a: any) => {
        if (a.reporting_org_id) referencedOrgIds.add(a.reporting_org_id)
        const ip = a.general_info?.aidEffectiveness?.implementingPartner
        if (ip) referencedOrgIds.add(ip)
      })

      // Paginate through all orgs — `.limit()` doesn't override the PostgREST
      // server-side `max-rows` cap (typically 1000), but `.range()` requests
      // are honoured up to whatever the server returns per page.
      const broadOrgs: any[] = []
      const PAGE = 1000
      let pageFrom = 0
      while (true) {
        const { data: page, error: pageErr } = await supabase
          .from('organizations')
          .select('id, name, acronym, logo, Organisation_Type_Code')
          .range(pageFrom, pageFrom + PAGE - 1)
        if (pageErr) {
          console.warn('[Aid Effectiveness] orgs page fetch error:', pageErr)
          break
        }
        if (!page || page.length === 0) break
        broadOrgs.push(...page)
        if (page.length < PAGE) break
        pageFrom += PAGE
        if (pageFrom > 200_000) break // hard guard
      }

      // Targeted fetch by exact IDs for orgs referenced by activities — covers
      // anything missed by the broad pagination (RLS-scoped, recently inserted, etc.)
      const referencedList = Array.from(referencedOrgIds)
      const targetedOrgs: any[] = []
      const CHUNK = 200
      for (let i = 0; i < referencedList.length; i += CHUNK) {
        const slice = referencedList.slice(i, i + CHUNK)
        const { data: chunk, error: chunkErr } = await supabase
          .from('organizations')
          .select('id, name, acronym, logo, Organisation_Type_Code')
          .in('id', slice)
        if (chunkErr) {
          console.warn('[Aid Effectiveness] targeted org chunk error:', chunkErr)
          continue
        }
        if (chunk) targetedOrgs.push(...chunk)
      }

      // Merge: targeted entries win over broad (in case of any duplicate id).
      const orgsById = new Map<string, any>()
      broadOrgs.forEach((o: any) => orgsById.set(o.id, o))
      targetedOrgs.forEach((o: any) => orgsById.set(o.id, o))

      const map = new Map<string, string>()
      const typeMap = new Map<string, string>()
      orgsById.forEach((o: any) => {
        const label = (o.acronym && String(o.acronym).trim()) || (o.name && String(o.name).trim())
        if (label) map.set(o.id, label)
        const orgType = o.Organisation_Type_Code
        if (orgType) typeMap.set(o.id, String(orgType))
      })
      setOrgMap(map)
      setOrgTypeMap(typeMap)

      // Build reporting orgs list from activities that have aid effectiveness data.
      // Important: include EVERY distinct reporting_org_id, even those whose org
      // row isn't in `orgsById` (RLS / stale FK / org row deleted). Fall back to
      // a derived label so the donor dropdown still lets the user filter by them.
      const seen = new Set<string>()
      const reportingOrgList: ReportingOrg[] = []
      withAE.forEach((a: any) => {
        const id = a.reporting_org_id
        if (!id || seen.has(id)) return
        seen.add(id)
        const org = orgsById.get(id)
        if (org) {
          reportingOrgList.push({ id, name: org.name, acronym: org.acronym, logo: org.logo })
        } else {
          reportingOrgList.push({ id, name: `Unknown organisation (${id.substring(0, 8)})`, acronym: null, logo: null })
        }
      })
      reportingOrgList.sort((a, b) => (a.acronym || a.name || '').localeCompare(b.acronym || b.name || ''))
      const matchedDonorOrgs = reportingOrgList.filter((r) => orgsById.has(r.id)).length
      console.log('[Aid Effectiveness] Loaded:', {
        activities: withAE.length,
        donorsTotal: reportingOrgList.length,
        donorsResolvedToOrg: matchedDonorOrgs,
        donorsUnknown: reportingOrgList.length - matchedDonorOrgs,
        broadOrgsFetched: broadOrgs.length,
        targetedOrgsFetched: targetedOrgs.length,
        orgsByIdSize: orgsById.size,
        referencedOrgIdCount: referencedList.length,
        sampleReportingOrgIds: withAE.slice(0, 5).map((a: any) => a.reporting_org_id),
        sampleResolved: reportingOrgList.slice(0, 5).map((r) => ({ id: r.id, name: r.name, acronym: r.acronym })),
      })
      setReportingOrgs(reportingOrgList)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = useMemo(() => {
    return rawActivities.filter(a => {
      const ae = a.general_info?.aidEffectiveness as AidEffectivenessData
      if (!ae) return false
      // Year filter via date range (kept for future use; UI removed)
      if (effectiveDateRange && a.planned_start_date) {
        const d = new Date(a.planned_start_date)
        if (d < effectiveDateRange.from || d > effectiveDateRange.to) return false
      }
      // Donor filter
      if (selectedReportingOrg !== 'all' && a.reporting_org_id !== selectedReportingOrg) return false
      // Org-type filter (uses reporting org's IATI organisation_type)
      if (chartOrgTypeFilter !== 'all') {
        const t = orgTypeMap.get(a.reporting_org_id || '')
        if (t !== chartOrgTypeFilter) return false
      }
      // Sector filter (hierarchical, matching the Atlas selector behaviour)
      const hasSectorFilter =
        chartSectorSelection.sectorCategories.length > 0 ||
        chartSectorSelection.sectors.length > 0 ||
        chartSectorSelection.subSectors.length > 0
      if (hasSectorFilter) {
        const codes = activitySectors.get(a.id)
        if (!codes || !matchesSectorFilter(Array.from(codes), chartSectorSelection)) return false
      }
      return true
    })
  }, [rawActivities, effectiveDateRange, selectedReportingOrg, chartOrgTypeFilter, chartSectorSelection, orgTypeMap, activitySectors])

  // Compute all metrics. We always return a non-null shape — even when zero
  // activities match the current filter — so individual charts can render their
  // own inline empty state without unmounting the whole dashboard (or kicking
  // the user out of an expanded-chart dialog).
  const metrics = useMemo(() => {
    const total = filteredActivities.length
    const aeList = filteredActivities.map(a => a.general_info.aidEffectiveness as AidEffectivenessData)
    const count = (field: keyof AidEffectivenessData) => aeList.filter(ae => toBool(ae[field])).length

    // Section scores (average % of true booleans per section)
    const sectionScores: Record<string, number> = {}
    Object.entries(SECTION_FIELDS).forEach(([key, section]) => {
      const totalChecks = total * section.fields.length
      const yesChecks = section.fields.reduce((sum, f) => sum + count(f.key), 0)
      sectionScores[key] = pct(yesChecks, totalChecks)
    })

    // Per-field counts for each section
    const fieldCounts: Record<string, { label: string; yes: number; pct: number }[]> = {}
    Object.entries(SECTION_FIELDS).forEach(([key, section]) => {
      fieldCounts[key] = section.fields.map(f => ({
        label: f.label,
        yes: count(f.key),
        pct: pct(count(f.key), total)
      }))
    })

    // Tied aid
    const tiedCounts = { untied: 0, partially_tied: 0, tied: 0 }
    aeList.forEach(ae => {
      const s = ae.tiedStatus
      if (s === 'untied') tiedCounts.untied++
      else if (s === 'partially_tied') tiedCounts.partially_tied++
      else if (s === 'tied') tiedCounts.tied++
    })

    // Outcome indicators
    const avgOutcome = aeList.reduce((s, ae) => s + (ae.numOutcomeIndicators || 0), 0) / total
    const outcomeRanges: Record<string, number> = { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '10+': 0 }
    aeList.forEach(ae => {
      const n = ae.numOutcomeIndicators || 0
      if (n === 0) outcomeRanges['0']++
      else if (n <= 2) outcomeRanges['1-2']++
      else if (n <= 5) outcomeRanges['3-5']++
      else if (n <= 10) outcomeRanges['6-10']++
      else outcomeRanges['10+']++
    })

    // GPEDC overall compliance: all boolean fields
    const allBoolFields = Object.values(SECTION_FIELDS).flatMap(s => s.fields.map(f => f.key))
    const gpedcCompliant = aeList.filter(ae => {
      const score = allBoolFields.filter(k => toBool(ae[k])).length / allBoolFields.length
      return score >= 0.6
    }).length

    // Overall score across all fields
    const totalBoolChecks = total * allBoolFields.length
    const totalYes = allBoolFields.reduce((sum, k) => sum + count(k), 0)
    const overallScore = pct(totalYes, totalBoolChecks)

    // Radar data (one point per section)
    const radarData = Object.entries(SECTION_FIELDS).map(([key, section]) => ({
      section: section.label.replace(/^\d+\.\s*/, ''),
      value: sectionScores[key],
      fullMark: 100
    }))

    // Partner distribution
    const partnerCounts = new Map<string, number>()
    aeList.forEach(ae => {
      const pid = ae.implementingPartner || 'unassigned'
      partnerCounts.set(pid, (partnerCounts.get(pid) || 0) + 1)
    })

    return {
      total,
      overallScore,
      gpedcCompliant,
      complianceRate: pct(gpedcCompliant, total),
      sectionScores,
      fieldCounts,
      tiedAid: [
        { name: 'Untied', value: tiedCounts.untied, pct: pct(tiedCounts.untied, total) },
        { name: 'Partially Tied', value: tiedCounts.partially_tied, pct: pct(tiedCounts.partially_tied, total) },
        { name: 'Tied', value: tiedCounts.tied, pct: pct(tiedCounts.tied, total) },
      ],
      avgOutcome: Math.round(avgOutcome * 10) / 10,
      outcomeDistribution: Object.entries(outcomeRanges).map(([range, c]) => ({ range, count: c, pct: pct(c, total) })),
      radarData,
      partnerCounts,
    }
  }, [filteredActivities])


  // Per-chart filter state
  const [outcomeDisplayMode, setOutcomeDisplayMode] = useState<'count' | 'pct'>('count')
  const [partnerTopN, setPartnerTopN] = useState<number>(10)
  const [sectionPerfSort, setSectionPerfSort] = useState<'value' | 'section'>('value')
  const [allSectionsSort, setAllSectionsSort] = useState<'value' | 'section'>('section')
  const [tiedDisplay, setTiedDisplay] = useState<'donut' | 'pie'>('donut')
  const [radarThreshold, setRadarThreshold] = useState<'all' | 'below50' | 'below70'>('all')

  // Disaggregation state — applies to charts that support per-donor or per-org-type comparison
  type Disaggregate = 'none' | 'donor' | 'orgType'
  const [tiedDisaggregate, setTiedDisaggregate] = useState<Disaggregate>('none')
  const [outcomeDisaggregate, setOutcomeDisaggregate] = useState<Disaggregate>('none')
  const [sectionPerfDisaggregate, setSectionPerfDisaggregate] = useState<Disaggregate>('none')

  const groupKey = useCallback((activity: any, mode: Disaggregate): string => {
    const orgId = activity?.reporting_org_id
    if (!orgId) return 'Unassigned'
    if (mode === 'donor') return orgMap.get(orgId) || 'Unknown organisation'
    if (mode === 'orgType') return IATI_ORG_TYPE_LABELS[orgTypeMap.get(orgId) || ''] || 'Unknown'
    return 'All'
  }, [orgMap, orgTypeMap])

  const sortedRadarData = useMemo(() => {
    if (!metrics) return []
    const copy = [...metrics.radarData]
    if (sectionPerfSort === 'value') copy.sort((a, b) => b.value - a.value)
    return copy
  }, [metrics, sectionPerfSort])

  // Org-type options: only types actually represented by reporting orgs in the
  // current data, so the user can't pick a type that yields zero results.
  const orgTypeOptions = useMemo(() => {
    const codes = new Set<string>()
    rawActivities.forEach((a) => {
      const t = orgTypeMap.get(a.reporting_org_id || '')
      if (t) codes.add(t)
    })
    return Array.from(codes)
      .map((code) => ({ code, label: IATI_ORG_TYPE_LABELS[code] || `Type ${code}` }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [rawActivities, orgTypeMap])

  // The Development Partner picker (searchable combobox like the rest of the app).
  // We translate between '' (combobox cleared) and 'all' (filter token).
  const donorPicker = (
    <OrganizationCombobox
      organizations={reportingOrgs.map((r) => ({ id: r.id, name: r.name, acronym: r.acronym ?? undefined }))}
      value={selectedReportingOrg === 'all' ? '' : selectedReportingOrg}
      onValueChange={(v) => setSelectedReportingOrg(v ? v : 'all')}
      placeholder="All development partners"
      searchPlaceholder="Search by name or acronym..."
      className="h-9 w-[340px]"
    />
  )

  // The Sector picker — same SectorHierarchyFilter the Atlas uses, with counts.
  const sectorPicker = (
    <SectorHierarchyFilter
      selected={chartSectorSelection}
      onChange={setChartSectorSelection}
      open={chartSectorFilterOpen}
      onOpenChange={setChartSectorFilterOpen}
      activityCounts={sectorActivityCounts}
      showOnlyActiveSectors={chartSectorShowOnlyActive}
      onShowOnlyActiveSectorsChange={setChartSectorShowOnlyActive}
      className="w-[260px] h-9 text-helper"
    />
  )

  // Single shared dashboard-level filter set, rendered inside every chart's
  // ChartExpandButton controls. State is shared across charts so the filter
  // applied in one chart's expand dialog persists across the whole dashboard.
  const dashboardFilters = (
    <DashboardFilters
      donorPicker={donorPicker}
      sectorPicker={sectorPicker}
      orgType={chartOrgTypeFilter}
      onOrgTypeChange={setChartOrgTypeFilter}
      orgTypeOptions={orgTypeOptions}
    />
  )


  // Props for the detailed-analytics chart components. They self-fetch from
  // /api/aid-effectiveness/* routes; we pass through the active page-level
  // filters so the numbers stay in sync with the inline panels above.
  const detailedChartProps = useMemo(() => ({
    dateRange: effectiveDateRange ?? {
      from: new Date(2000, 0, 1),
      to: new Date(2099, 11, 31),
    },
    filters: {
      donor: 'all',
      sector: 'all',
      country: 'all',
      implementingPartner: selectedReportingOrg,
    },
    refreshKey: 0,
  }), [effectiveDateRange, selectedReportingOrg])

  if (loading || customYearsLoading) {
    return <MainLayout><AnalyticsSkeleton /></MainLayout>
  }

  return (
    <MainLayout>
      <DashboardFiltersContext.Provider value={dashboardFilters}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Aid Effectiveness Dashboard</h1>
              <p className="text-muted-foreground mt-1">GPEDC Compliance & Development Effectiveness Analytics</p>
            </div>
          </div>
        </div>


        {metrics.total === 0 && (
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-body text-muted-foreground">
            No activities match the current filters. Charts below render empty until you adjust your selection.
          </div>
        )}
        {(
          <>
            {/* KPI Cards — each uses a different crop of the GPEDC banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '0% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-bold text-white flex items-center gap-1">
                        Overall Score <HelpTooltip helpKey="overallScore" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.overallScore}%</p>
                    </div>
                    <Shield className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.overallScore} className="mt-3 bg-card/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-helper font-semibold text-white mt-1">{metrics.total} activities assessed</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '25% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-bold text-white flex items-center gap-1">
                        GPEDC Compliant <HelpTooltip helpKey="gpedcCompliant" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.complianceRate}%</p>
                    </div>
                    <CheckCircle2 className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.complianceRate} className="mt-3 bg-card/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-helper font-semibold text-white mt-1">{metrics.gpedcCompliant} of {metrics.total} (60%+ threshold)</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '50% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-bold text-white flex items-center gap-1">
                        Gov Ownership <HelpTooltip helpKey="govOwnership" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.sectionScores.ownership}%</p>
                    </div>
                    <Building2 className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.sectionScores.ownership} className="mt-3 bg-card/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-helper font-semibold text-white mt-1">GPEDC Indicator 1</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '75% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-bold text-white flex items-center gap-1">
                        Untied Aid <HelpTooltip helpKey="untiedAid" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.tiedAid[0].pct}%</p>
                    </div>
                    <Handshake className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.tiedAid[0].pct} className="mt-3 bg-card/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-helper font-semibold text-white mt-1">GPEDC Indicator 10</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '100% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-body font-bold text-white flex items-center gap-1">
                        Avg Outcomes <HelpTooltip helpKey="avgOutcomes" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.avgOutcome}</p>
                    </div>
                    <Target className="h-7 w-7 text-white/50" />
                  </div>
                  <p className="text-helper font-semibold text-white mt-4">Indicators per activity</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="ownership" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="ownership">Ownership & Systems</TabsTrigger>
                <TabsTrigger value="transparency">Transparency & Accountability</TabsTrigger>
                <TabsTrigger value="engagement">Engagement & Gender</TabsTrigger>
                <TabsTrigger value="compliance">GPEDC Compliance</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Analytics</TabsTrigger>
              </TabsList>

              {/* ===== Ownership & Systems Tab ===== */}
              <TabsContent value="ownership" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionDetail
                  title="Government Ownership & Strategic Alignment"
                  badge="GPEDC Indicator 1"
                  fields={metrics.fieldCounts.ownership}
                  total={metrics.total}
                  score={metrics.sectionScores.ownership}
                  helpKey="ownership"
                  description="Alignment with national priorities, government frameworks, and support for national institutions."
                />
                <SectionDetail
                  title="Use of Country Public Financial & Procurement Systems"
                  badge="GPEDC Indicator 5a"
                  fields={metrics.fieldCounts.countrySystems}
                  total={metrics.total}
                  score={metrics.sectionScores.countrySystems}
                  helpKey="countrySystems"
                  description="Whether funds flow through national treasury, budget, reporting, audit, and procurement systems."
                />
                <GovWhyNotSection activities={filteredActivities} />

                {/* Outcome indicators */}
                {(() => {
                  const dataKey = outcomeDisplayMode === 'count' ? 'count' : 'pct'
                  const OUTCOME_BUCKETS = ['0', '1-2', '3-5', '6-10', '10+'] as const
                  const OUTCOME_BUCKET_COLORS: Record<typeof OUTCOME_BUCKETS[number], string> = {
                    '0':    '#C25A10',
                    '1-2':  '#F8A872',
                    '3-5':  '#F37021',
                    '6-10': '#475569',
                    '10+':  '#0f172a',
                  }
                  // Disaggregated rows: one row per donor / org-type, segments = indicator-count buckets
                  const outcomeDisaggregated = (() => {
                    if (outcomeDisaggregate === 'none') return [] as Array<{ group: string; total: number } & Record<typeof OUTCOME_BUCKETS[number], number>>
                    const groups = new Map<string, Record<typeof OUTCOME_BUCKETS[number], number>>()
                    filteredActivities.forEach((a: any) => {
                      const key = groupKey(a, outcomeDisaggregate)
                      if (!groups.has(key)) groups.set(key, { '0': 0, '1-2': 0, '3-5': 0, '6-10': 0, '10+': 0 })
                      const n = a?.general_info?.aidEffectiveness?.numOutcomeIndicators || 0
                      const g = groups.get(key)!
                      if (n === 0) g['0']++
                      else if (n <= 2) g['1-2']++
                      else if (n <= 5) g['3-5']++
                      else if (n <= 10) g['6-10']++
                      else g['10+']++
                    })
                    return Array.from(groups.entries())
                      .map(([group, v]) => ({ group, ...v, total: v['0'] + v['1-2'] + v['3-5'] + v['6-10'] + v['10+'] }))
                      .filter((d) => d.total > 0)
                      .sort((a, b) => b.total - a.total)
                  })()
                  const outcomeChart = (height: number) => {
                    if (outcomeDisaggregate !== 'none' && outcomeDisaggregated.length > 0) {
                      return (
                        <ResponsiveContainer width="100%" height={height}>
                          <BarChart data={outcomeDisaggregated} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" fontSize={12} />
                            <YAxis type="category" dataKey="group" stroke="#64748b" fontSize={11} width={180} />
                            <Tooltip
                              cursor={{ fill: '#F3702115' }}
                              content={({ active, payload, label }: any) => {
                                if (!active || !payload?.length) return null
                                const row = payload[0].payload
                                return (
                                  <ChartTooltipCard
                                    title={label}
                                    subtitle={`${row.total} activities`}
                                    rows={OUTCOME_BUCKETS.map((b) => ({
                                      label: `${b} indicators`,
                                      value: row[b],
                                      color: OUTCOME_BUCKET_COLORS[b],
                                    }))}
                                  />
                                )
                              }}
                            />
                            <Legend />
                            {OUTCOME_BUCKETS.map((b, i) => (
                              <Bar
                                key={b}
                                dataKey={b}
                                name={`${b} indicators`}
                                stackId="o"
                                fill={OUTCOME_BUCKET_COLORS[b]}
                                radius={i === OUTCOME_BUCKETS.length - 1 ? [0, 4, 4, 0] : 0}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    }
                    return (
                      <ResponsiveContainer width="100%" height={height}>
                        <BarChart data={metrics.outcomeDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => outcomeDisplayMode === 'pct' ? `${v}%` : `${v}`} />
                          <Tooltip
                            cursor={{ fill: '#F3702115' }}
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null
                              const d = payload[0].payload
                              return (
                                <ChartTooltipCard
                                  title={`${d.range} indicators`}
                                  rows={[
                                    { label: 'Activities', value: d.count, color: '#F37021' },
                                    { label: 'Share', value: `${d.pct}%` },
                                  ]}
                                />
                              )
                            }}
                          />
                          <Bar dataKey={dataKey} fill="#F37021" radius={[4, 4, 0, 0]}>
                            {metrics.outcomeDistribution.map((_, i) => <Cell key={`o-${i}`} fill="#F37021" />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                  return (
                    <Card className="bg-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                              Outcome Indicators Distribution
                              <HelpTooltip helpKey="outcomeIndicators" />
                            </CardTitle>
                            <CardDescription>How many government-defined outcome indicators each activity tracks for results measurement.</CardDescription>
                          </div>
                          <ChartExpandButton
                            title="Outcome Indicators Distribution"
                            description="How many government-defined outcome indicators each activity tracks for results measurement."
                            interpretation="A government-defined outcome indicator is a measurable result that the country itself uses to track its national development goals (for example, 'maternal mortality rate' or 'primary completion rate' as defined in the country's own results framework). When a development partner adopts these indicators in an activity's logframe, it ties the activity directly to the country's own measurement of progress, rather than reporting against a parallel donor-defined metric. This chart distributes activities by how many such government-defined indicators each one carries, from zero to ten or more. Together, the picture tells you how seriously development partners in country are aligning their results monitoring with what the government itself is measuring: a heavy share of activities with zero indicators means most external assistance is reporting on its own terms, while a healthy spread across the middle bands means activities are wired into the country's national M&E system."
                            controls={
                              <>
                                {dashboardFilters}
                                <div className="flex flex-col gap-1">
                                  <Label className="text-helper text-muted-foreground">Group by</Label>
                                  <Select value={outcomeDisaggregate} onValueChange={(v) => setOutcomeDisaggregate(v as Disaggregate)}>
                                    <SelectTrigger className="h-9 w-[180px] text-helper">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <CodedSelectItem value="none" code="1">No disaggregation</CodedSelectItem>
                                      <CodedSelectItem value="donor" code="2">By development partner</CodedSelectItem>
                                      <CodedSelectItem value="orgType" code="3">By org type</CodedSelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {outcomeDisaggregate === 'none' && (
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-helper text-muted-foreground">Show as</Label>
                                    <Select value={outcomeDisplayMode} onValueChange={(v) => setOutcomeDisplayMode(v as 'count' | 'pct')}>
                                      <SelectTrigger className="h-9 w-[140px] text-helper">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <CodedSelectItem value="count" code="1">Count</CodedSelectItem>
                                        <CodedSelectItem value="pct" code="2">Percentage</CodedSelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </>
                            }
                            csv={() => outcomeDisaggregate !== 'none'
                              ? {
                                  filename: `outcome-indicators-by-${outcomeDisaggregate === 'donor' ? 'donor' : 'org-type'}.csv`,
                                  headers: [outcomeDisaggregate === 'donor' ? 'Donor' : 'Org Type', '0', '1-2', '3-5', '6-10', '10+', 'Total'],
                                  rows: outcomeDisaggregated.map((d) => [d.group, d['0'], d['1-2'], d['3-5'], d['6-10'], d['10+'], d.total]),
                                }
                              : {
                                  filename: 'outcome-indicators-distribution.csv',
                                  headers: ['Range', 'Activities', '%'],
                                  rows: metrics.outcomeDistribution.map((d) => [d.range, d.count, d.pct]),
                                }}
                            render={(h) => outcomeChart(h)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {outcomeChart(outcomeDisaggregate !== 'none' && outcomeDisaggregated.length > 0
                          ? Math.max(250, outcomeDisaggregated.length * 32 + 60)
                          : 250)}
                      </CardContent>
                    </Card>
                  )
                })()}
              </TabsContent>

              {/* ===== Transparency & Accountability Tab ===== */}
              <TabsContent value="transparency" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionDetail
                  title="Predictability & Aid Characteristics"
                  badge="GPEDC Indicators 5b, 6, 10"
                  fields={metrics.fieldCounts.predictability}
                  total={metrics.total}
                  score={metrics.sectionScores.predictability}
                  helpKey="predictability"
                  description="Whether annual budgets, forward plans, and multi-year financing agreements are shared with partners."
                />
                {(() => {
                  // Disaggregated rows for stacked-bar variant: one row per donor / org type.
                  const tiedDisaggregated = (() => {
                    if (tiedDisaggregate === 'none') return [] as Array<{ group: string; untied: number; partially_tied: number; tied: number; total: number }>
                    const groups = new Map<string, { untied: number; partially_tied: number; tied: number }>()
                    filteredActivities.forEach((a: any) => {
                      const key = groupKey(a, tiedDisaggregate)
                      if (!groups.has(key)) groups.set(key, { untied: 0, partially_tied: 0, tied: 0 })
                      const ts = a.general_info?.aidEffectiveness?.tiedStatus
                      const g = groups.get(key)!
                      if (ts === 'untied') g.untied++
                      else if (ts === 'partially_tied') g.partially_tied++
                      else if (ts === 'tied') g.tied++
                    })
                    return Array.from(groups.entries())
                      .map(([group, v]) => ({ group, ...v, total: v.untied + v.partially_tied + v.tied }))
                      .filter((d) => d.total > 0)
                      .sort((a, b) => b.total - a.total)
                  })()
                  const tiedChart = (height: number, inner: number, outer: number) => {
                    if (tiedDisaggregate !== 'none' && tiedDisaggregated.length > 0) {
                      return (
                        <ResponsiveContainer width="100%" height={height}>
                          <BarChart data={tiedDisaggregated} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" fontSize={12} />
                            <YAxis type="category" dataKey="group" stroke="#64748b" fontSize={11} width={180} />
                            <Tooltip
                              cursor={{ fill: '#F3702115' }}
                              content={({ active, payload, label }: any) => {
                                if (!active || !payload?.length) return null
                                const row = payload[0].payload
                                return (
                                  <ChartTooltipCard
                                    title={label}
                                    subtitle={`${row.total} activities`}
                                    rows={[
                                      { label: 'Untied', value: row.untied, color: '#F37021' },
                                      { label: 'Partially Tied', value: row.partially_tied, color: '#F8A872' },
                                      { label: 'Tied', value: row.tied, color: '#C25A10' },
                                    ]}
                                  />
                                )
                              }}
                            />
                            <Legend />
                            <Bar dataKey="untied" name="Untied" stackId="t" fill="#F37021" />
                            <Bar dataKey="partially_tied" name="Partially Tied" stackId="t" fill="#F8A872" />
                            <Bar dataKey="tied" name="Tied" stackId="t" fill="#C25A10" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    }
                    return (
                      <ResponsiveContainer width="100%" height={height}>
                        <PieChart>
                          <Pie data={metrics.tiedAid} cx="50%" cy="50%" innerRadius={tiedDisplay === 'pie' ? 0 : inner} outerRadius={outer} paddingAngle={2} dataKey="value" nameKey="name">
                            {metrics.tiedAid.map((_, i) => <Cell key={`t-${i}`} fill={['#F37021', '#F8A872', '#C25A10'][i]} />)}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null
                              const d = payload[0].payload
                              const tiedColor = d.name === 'Untied' ? '#F37021' : d.name === 'Partially Tied' ? '#F8A872' : '#C25A10'
                              return (
                                <ChartTooltipCard
                                  title={d.name}
                                  rows={[
                                    { label: 'Activities', value: d.value, color: tiedColor },
                                    { label: 'Share', value: `${d.pct}%` },
                                  ]}
                                />
                              )
                            }}
                          />
                          <Legend formatter={(_: any, entry: any) => `${entry?.payload?.name || ''} (${entry?.payload?.pct || 0}%)`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  }
                  return (
                    <Card className="bg-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                              Aid Tying Status
                              <HelpTooltip helpKey="tiedAid" />
                            </CardTitle>
                            <CardDescription>Aid tying status determines whether recipients can procure goods and services from any source.</CardDescription>
                          </div>
                          <ChartExpandButton
                            title="Aid Tying Status"
                            description="Aid tying status determines whether recipients can procure goods and services from any source."
                            interpretation="Aid tying is a condition placed on development assistance that requires the recipient to procure goods, services or works from the donor country (tied), from the donor country plus a defined group of others (partially tied), or from any source worldwide (untied). GPEDC Indicator 10 commits partners to untying their aid because tying inflates costs (donor-country suppliers face no competition), reduces value for money for the recipient, and bypasses local markets that would otherwise build domestic capacity. This chart shows the share of activities in country falling into each of those three categories. Together, the picture tells you how much of the external assistance flowing into the country is genuinely available to be spent through competitive local procurement, and how much is contractually pre-allocated back to donor-country firms before it ever reaches the country."
                            controls={
                              <>
                                {dashboardFilters}
                                <div className="flex flex-col gap-1">
                                  <Label className="text-helper text-muted-foreground">Group by</Label>
                                  <Select value={tiedDisaggregate} onValueChange={(v) => setTiedDisaggregate(v as Disaggregate)}>
                                    <SelectTrigger className="h-9 w-[180px] text-helper">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <CodedSelectItem value="none" code="1">No disaggregation</CodedSelectItem>
                                      <CodedSelectItem value="donor" code="2">By development partner</CodedSelectItem>
                                      <CodedSelectItem value="orgType" code="3">By org type</CodedSelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {tiedDisaggregate === 'none' && (
                                  <div className="flex flex-col gap-1">
                                    <Label className="text-helper text-muted-foreground">Chart style</Label>
                                    <Select value={tiedDisplay} onValueChange={(v) => setTiedDisplay(v as 'donut' | 'pie')}>
                                      <SelectTrigger className="h-9 w-[140px] text-helper">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <CodedSelectItem value="donut" code="1">Donut</CodedSelectItem>
                                        <CodedSelectItem value="pie" code="2">Pie</CodedSelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </>
                            }
                            csv={() => tiedDisaggregate !== 'none'
                              ? {
                                  filename: `aid-tying-by-${tiedDisaggregate === 'donor' ? 'donor' : 'org-type'}.csv`,
                                  headers: [tiedDisaggregate === 'donor' ? 'Donor' : 'Org Type', 'Untied', 'Partially Tied', 'Tied', 'Total'],
                                  rows: tiedDisaggregated.map((d) => [d.group, d.untied, d.partially_tied, d.tied, d.total]),
                                }
                              : {
                                  filename: 'aid-tying-status.csv',
                                  headers: ['Status', 'Activities', '%'],
                                  rows: metrics.tiedAid.map((d) => [d.name, d.value, d.pct]),
                                }}
                            render={(h) => tiedChart(h, Math.round(h * 0.18), Math.round(h * 0.32))}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {tiedChart(300, 70, 130)}
                      </CardContent>
                    </Card>
                  )
                })()}
                <SectionDetail
                  title="Transparency & Timely Reporting"
                  badge="GPEDC Indicator 4"
                  fields={metrics.fieldCounts.transparency}
                  total={metrics.total}
                  score={metrics.sectionScores.transparency}
                  helpKey="transparency"
                  description="Public availability of financial reports, evaluation results, and performance data."
                />
                <SectionDetail
                  title="Mutual Accountability"
                  badge="GPEDC Indicator 7"
                  fields={metrics.fieldCounts.accountability}
                  total={metrics.total}
                  score={metrics.sectionScores.accountability}
                  helpKey="accountability"
                  description="Joint reviews, mutual accountability frameworks, and documented corrective actions."
                />
              </TabsContent>

              {/* ===== Engagement & Gender Tab ===== */}
              <TabsContent value="engagement" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionDetail
                  title="Civil Society & Private Sector Engagement"
                  badge="GPEDC Indicators 2 & 3"
                  fields={metrics.fieldCounts.civilSociety}
                  total={metrics.total}
                  score={metrics.sectionScores.civilSociety}
                  helpKey="civilSociety"
                  description="Civil society consultation, CSO involvement in implementation, and public-private dialogue."
                />
                <SectionDetail
                  title="Gender Equality & Inclusion"
                  badge="GPEDC Indicator 8"
                  fields={metrics.fieldCounts.gender}
                  total={metrics.total}
                  score={metrics.sectionScores.gender}
                  helpKey="gender"
                  description="Integration of gender objectives, budget allocations, and disaggregated indicators into activities."
                />
              </TabsContent>

              {/* ===== GPEDC Compliance Tab ===== */}
              <TabsContent value="compliance" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full radar */}
                {(() => {
                  const filteredRadar = metrics.radarData.filter(d =>
                    radarThreshold === 'all' ? true :
                    radarThreshold === 'below50' ? d.value < 50 :
                    d.value < 70
                  )
                  const radarChart = (height: number) => (
                    <ResponsiveContainer width="100%" height={height}>
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={filteredRadar.length >= 3 ? filteredRadar : metrics.radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="section" tick={{ fontSize: 12, fill: '#475569' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}%`} />
                        <Radar name="Score %" dataKey="value" stroke="#C25A10" fill="#F37021" fillOpacity={0.3} strokeWidth={2} />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <ChartTooltipCard
                                title={d.section}
                                rows={[{ label: 'Score', value: `${d.value}%`, color: '#F37021' }]}
                              />
                            )
                          }}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )
                  return (
                    <Card className="bg-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                              GPEDC Section Radar
                              <HelpTooltip helpKey="complianceRadar" />
                            </CardTitle>
                            <CardDescription>Compliance across all 7 GPEDC indicator categories</CardDescription>
                          </div>
                          <ChartExpandButton
                            title="GPEDC Section Radar"
                            description="Compliance across all 7 GPEDC indicator categories"
                            interpretation="The Global Partnership for Effective Development Co-operation (GPEDC) organises its monitoring framework around seven principles that together define what effective development cooperation looks like in country. Each axis on this radar is one of those principles: Government Ownership (whether external assistance follows the country's own priorities and plans), Country Systems (whether it flows through the country's PFM, audit and procurement institutions), Predictability (whether the recipient government knows what's coming and when), Transparency (whether spending and results are visible to the public and parliament), Mutual Accountability (whether partners review each other's performance), Civil Society & Private Sector (whether non-government actors are genuinely included), and Gender Equality (whether activities advance equality outcomes in design and reporting). Together, the shape of the polygon tells you which of these principles the country's external assistance honours fully, which it honours partially, and which it largely doesn't honour at all, providing a single visual summary of where the country sits against the international effectiveness commitments."
                            controls={
                              <>
                                {dashboardFilters}
                                <div className="flex flex-col gap-1">
                                  <Label className="text-helper text-muted-foreground">Show</Label>
                                  <Select value={radarThreshold} onValueChange={(v) => setRadarThreshold(v as 'all' | 'below50' | 'below70')}>
                                    <SelectTrigger className="h-9 w-[160px] text-helper">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <CodedSelectItem value="all" code="1">All sections</CodedSelectItem>
                                      <CodedSelectItem value="below70" code="2">Focus: &lt; 70%</CodedSelectItem>
                                      <CodedSelectItem value="below50" code="3">Focus: &lt; 50%</CodedSelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            }
                            csv={() => ({
                              filename: 'gpedc-section-radar.csv',
                              headers: ['Section', 'Score %'],
                              rows: metrics.radarData.map((d) => [d.section, d.value]),
                            })}
                            render={(h) => radarChart(h)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>{radarChart(450)}</CardContent>
                    </Card>
                  )
                })()}

                {/* Section Performance Bars */}
                {(() => {
                  const sectionBars = (height: number) => (
                    <ResponsiveContainer width="100%" height={height}>
                      <BarChart data={sortedRadarData} margin={{ bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="section" stroke="#64748b" fontSize={10} angle={-25} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#64748b" fontSize={12} />
                        <Tooltip
                          cursor={{ fill: '#F3702115' }}
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <ChartTooltipCard
                                title={d.section}
                                rows={[{ label: 'Score', value: `${d.value}%`, color: '#F37021' }]}
                              />
                            )
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {sortedRadarData.map((_, i) => <Cell key={`s-${i}`} fill="#F37021" />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                  return (
                    <Card className="bg-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                              Section Performance
                              <HelpTooltip helpKey="sectionBars" />
                            </CardTitle>
                            <CardDescription>Average compliance rates across all 7 GPEDC sections for comparative analysis.</CardDescription>
                          </div>
                          <ChartExpandButton
                            title="Section Performance"
                            description="Average compliance rates across all 7 GPEDC sections for comparative analysis."
                            interpretation="This is a numeric companion to the radar: the same seven GPEDC principles laid out side-by-side for direct comparison. Each bar represents one principle: Government Ownership, Country Systems, Predictability, Transparency, Mutual Accountability, Civil Society & Private Sector, and Gender Equality. The percentage is the share of 'Yes' answers given across all the indicators that make up that principle, averaged across all activities in the portfolio, so it represents how broadly that principle is being honoured across the country's external assistance. Together, the bars tell you which of the seven effectiveness principles the country's portfolio is delivering on as a matter of routine, and which are being applied only partially or by exception."
                            controls={
                              <>
                                {dashboardFilters}
                                <div className="flex flex-col gap-1">
                                  <Label className="text-helper text-muted-foreground">Sort by</Label>
                                  <Select value={sectionPerfSort} onValueChange={(v) => setSectionPerfSort(v as 'value' | 'section')}>
                                    <SelectTrigger className="h-9 w-[150px] text-helper">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <CodedSelectItem value="value" code="1">Score</CodedSelectItem>
                                      <CodedSelectItem value="section" code="2">Section</CodedSelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            }
                            csv={() => ({
                              filename: 'section-performance.csv',
                              headers: ['Section', 'Score %'],
                              rows: sortedRadarData.map((d) => [d.section, d.value]),
                            })}
                            render={(h) => sectionBars(h)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>{sectionBars(300)}</CardContent>
                    </Card>
                  )
                })()}

                {/* All sections summary */}
                {(() => {
                  const renderBreakdown = () => (
                    <div className="space-y-3">
                      {Object.entries(SECTION_FIELDS)
                        .sort((a, b) => allSectionsSort === 'value'
                          ? metrics.sectionScores[b[0]] - metrics.sectionScores[a[0]]
                          : 0)
                        .map(([key, section]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="font-medium text-foreground">{section.label}</span>
                          <div className="flex items-center gap-3">
                            <Progress value={metrics.sectionScores[key]} className="w-32 bg-muted" style={{ '--progress-foreground': '#F37021' } as React.CSSProperties} />
                            <Badge className={
                              metrics.sectionScores[key] >= 70 ? "bg-[#F37021] text-white" :
                              metrics.sectionScores[key] >= 50 ? "bg-muted text-foreground" :
                              "bg-muted text-muted-foreground"
                            }>
                              {metrics.sectionScores[key]}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                  return (
                    <Card className="bg-card">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                              All Sections Breakdown
                              <HelpTooltip helpKey="allSections" />
                            </CardTitle>
                            <CardDescription>Progress and percentage ratings for each of the 7 GPEDC compliance sections.</CardDescription>
                          </div>
                          <ChartExpandButton
                            title="All Sections Breakdown"
                            description="Progress and percentage ratings for each of the 7 GPEDC compliance sections."
                            interpretation="This is the headline scoreboard of the country's aid effectiveness picture, with one row for each of the seven GPEDC principles (Government Ownership, Country Systems, Predictability, Transparency, Mutual Accountability, Civil Society & Private Sector, and Gender Equality), with the percentage representing how broadly each principle is being honoured across the portfolio. The percentage is the share of 'Yes' responses across every indicator inside that principle, across every activity. Together, the seven scores describe whether external assistance in country reflects the international development effectiveness commitments (the principles agreed under the Paris Declaration, Accra Agenda, Busan Partnership, and Global Partnership compacts) that countries and partners signed up to deliver."
                            controls={
                              <>
                                {dashboardFilters}
                                <div className="flex flex-col gap-1">
                                  <Label className="text-helper text-muted-foreground">Sort by</Label>
                                  <Select value={allSectionsSort} onValueChange={(v) => setAllSectionsSort(v as 'value' | 'section')}>
                                    <SelectTrigger className="h-9 w-[150px] text-helper">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <CodedSelectItem value="section" code="1">Section</CodedSelectItem>
                                      <CodedSelectItem value="value" code="2">Score</CodedSelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            }
                            csv={() => ({
                              filename: 'all-sections-breakdown.csv',
                              headers: ['Section', 'Score %'],
                              rows: Object.entries(SECTION_FIELDS).map(([key, section]) => [section.label, metrics.sectionScores[key]]),
                            })}
                            render={() => renderBreakdown()}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>{renderBreakdown()}</CardContent>
                    </Card>
                  )
                })()}

                {/* Implementing Partners */}
                <Card className="bg-card">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                          Implementing Partners
                          <HelpTooltip helpKey="partners" />
                        </CardTitle>
                        <CardDescription>Distribution of activities across implementing partners by volume.</CardDescription>
                      </div>
                      <ChartExpandButton
                        title="Implementing Partners"
                        description="Distribution of activities across implementing partners by volume."
                        interpretation="An implementing partner is the organisation contractually responsible for delivering an activity on the ground, distinct from the donor that funds it or the government that owns the broader programme. Implementing partners can be UN agencies, international or national NGOs, government ministries, private contractors, or research institutions, and they shape both how an activity is run and whose capacity is built in the process. This chart ranks the partners delivering activities in country by the number of activities each one carries. Together, the picture tells you who actually delivers the country's external assistance: whether delivery is concentrated in a handful of large international agencies, distributed across many smaller specialists, or anchored in national institutions, which in turn shapes the capacity, accountability and sustainability of the cooperation."
                        controls={
                          <>
                            {dashboardFilters}
                            <div className="flex flex-col gap-1">
                              <Label className="text-helper text-muted-foreground">Show</Label>
                              <Select value={String(partnerTopN)} onValueChange={(v) => setPartnerTopN(Number(v))}>
                                <SelectTrigger className="h-9 w-[120px] text-helper">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <CodedSelectItem value="5" code="1">Top 5</CodedSelectItem>
                                  <CodedSelectItem value="10" code="2">Top 10</CodedSelectItem>
                                  <CodedSelectItem value="20" code="3">Top 20</CodedSelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        }
                        csv={() => ({
                          filename: 'implementing-partners.csv',
                          headers: ['Partner', 'Activities', '%'],
                          rows: Array.from(metrics.partnerCounts.entries())
                            .map(([id, count]) => ({
                              name: id === 'unassigned' ? 'Unassigned' : (orgMap.get(id) || id),
                              count,
                              pct: metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0,
                            }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, partnerTopN)
                            .map((p) => [p.name, p.count, p.pct]),
                        })}
                        render={(h) => <PartnerChart partnerCounts={metrics.partnerCounts} orgMap={orgMap} total={metrics.total} height={h} topN={partnerTopN} />}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PartnerChart partnerCounts={metrics.partnerCounts} orgMap={orgMap} total={metrics.total} topN={partnerTopN} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== Detailed Analytics Tab ===== */}
              <TabsContent value="detailed" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TiedAidChart {...detailedChartProps} />
                <BudgetPlanningChart {...detailedChartProps} />
                <GovernmentSystemsChart {...detailedChartProps} />
                <DevelopmentIndicatorsChart {...detailedChartProps} />
                <div className="lg:col-span-2">
                  <GPEDCComplianceChart {...detailedChartProps} detailed />
                </div>
                <div className="lg:col-span-2">
                  <ImplementingPartnersChart {...detailedChartProps} />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      </DashboardFiltersContext.Provider>
    </MainLayout>
  )
}

// --- Reusable Section Detail Component ---

function SectionDetail({ title, badge, fields, total, score, helpKey, description }: {
  title: string
  badge: string
  fields: { label: string; yes: number; pct: number }[]
  total: number
  score: number
  helpKey?: string
  description?: string
}) {
  const extraControls = useContext(DashboardFiltersContext)
  const [sortBy, setSortBy] = useState<'pct' | 'label'>('pct')
  const sortedFields = useMemo(() => {
    const copy = [...fields]
    if (sortBy === 'pct') copy.sort((a, b) => b.pct - a.pct)
    else copy.sort((a, b) => a.label.localeCompare(b.label))
    return copy
  }, [fields, sortBy])
  // Auto-scale the axis to the data so the longest bar reaches the right edge
  // and the chart visually uses the full card width. We round up to the next
  // 10% step so axis ticks stay clean.
  const xAxisMax = useMemo(() => {
    const max = sortedFields.reduce((m, f) => Math.max(m, f.pct), 0)
    return Math.min(100, Math.max(20, Math.ceil(max / 10) * 10 + 5))
  }, [sortedFields])
  // Size the Y-axis to fit the longest label without leaving a wide empty band
  // when labels are short (e.g. Mutual Accountability) or clipping when they're
  // long (e.g. Government Ownership).
  const yAxisWidth = useMemo(() => {
    const longest = sortedFields.reduce((m, f) => Math.max(m, (f.label || '').length), 0)
    return Math.max(120, Math.min(290, Math.round(longest * 6.5) + 12))
  }, [sortedFields])
  const renderChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedFields} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, xAxisMax]} tickFormatter={(v: number) => `${v}%`} stroke="#64748b" fontSize={12} />
        <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} width={yAxisWidth} />
        <Tooltip
          cursor={{ fill: '#F3702115' }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <ChartTooltipCard
                title={d.label}
                rows={[
                  { label: 'Adoption', value: `${d.pct}%`, color: '#F37021' },
                  { label: 'Activities', value: `${d.yes} / ${total}` },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="pct" fill="#F37021" radius={[0, 4, 4, 0]}>
          {sortedFields.map((_, i) => <Cell key={`f-${i}`} fill="#F37021" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
            {title}
            {helpKey && <HelpTooltip helpKey={helpKey} />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-helper">{badge}</Badge>
            <Badge className={
              score >= 70 ? "bg-[#F37021] text-white" :
              score >= 50 ? "bg-muted text-foreground" :
              "bg-muted text-muted-foreground"
            }>{score}%</Badge>
            <ChartExpandButton
              title={title}
              description={description}
              interpretation={(helpKey && SECTION_INTERPRETATIONS[helpKey]) ||
                `Each row is one specific commitment that makes up the ${title} principle of GPEDC, with the bar showing the share of activities in the portfolio that meet it.`}
              controls={
                <>
                  {extraControls}
                  <div className="flex flex-col gap-1">
                    <Label className="text-helper text-muted-foreground">Sort by</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'pct' | 'label')}>
                      <SelectTrigger className="h-9 w-[150px] text-helper">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <CodedSelectItem value="pct" code="1">Adoption</CodedSelectItem>
                        <CodedSelectItem value="label" code="2">A–Z</CodedSelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              }
              csv={() => ({
                filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`,
                headers: ['Indicator', 'Yes', 'Total', 'Adoption %'],
                rows: sortedFields.map((f) => [f.label, f.yes, total, f.pct]),
              })}
              render={(h) => renderChart(h)}
            />
          </div>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {renderChart(Math.max(200, fields.length * 44))}
      </CardContent>
    </Card>
  )
}

// --- Partner Distribution Chart ---

function PartnerChart({ partnerCounts, orgMap, total, height, topN = 10 }: {
  partnerCounts: Map<string, number>; orgMap: Map<string, string>; total: number; height?: number; topN?: number
}) {
  const data = Array.from(partnerCounts.entries())
    .map(([id, count]) => ({
      name: id === 'unassigned' ? 'Unassigned' : (orgMap.get(id) || id.substring(0, 8)),
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)

  if (data.length === 0) return <p className="text-muted-foreground text-center py-8">No implementing partner data</p>

  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(250, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" stroke="#64748b" fontSize={12} />
        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={150} />
        <Tooltip
          cursor={{ fill: '#F3702115' }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <ChartTooltipCard
                title={d.name}
                rows={[
                  { label: 'Activities', value: d.count, color: '#F37021' },
                  { label: 'Share', value: `${d.pct}%` },
                ]}
              />
            )
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={`p-${i}`} fill="#F37021" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// --- Government "Why Not" Reasons ---

function GovWhyNotSection({ activities }: { activities: ActivityRow[] }) {
  const reasons = new Map<string, number>()
  activities.forEach(a => {
    const ae = a.general_info?.aidEffectiveness
    if (ae?.govSystemWhyNot) {
      reasons.set(ae.govSystemWhyNot, (reasons.get(ae.govSystemWhyNot) || 0) + 1)
    }
  })
  if (reasons.size === 0) return null

  const data = Array.from(reasons.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
          Reasons for Not Using Government Systems
          <HelpTooltip helpKey="govWhyNot" />
        </CardTitle>
        <CardDescription>Stated reasons when development partners choose not to use government public financial management systems.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map(item => (
            <div key={item.reason} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-body text-foreground">{item.reason}</span>
              <Badge variant="secondary" className="bg-muted text-foreground">{item.count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
