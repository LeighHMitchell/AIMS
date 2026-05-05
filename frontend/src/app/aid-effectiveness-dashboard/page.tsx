"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Shield, Target, Building2, SlidersHorizontal, RefreshCw,
  CheckCircle2, Users, BarChart3, Globe, Handshake,
  Eye, Heart, Calendar, HelpCircle, ChevronDown, CalendarIcon
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { CustomYear, getCustomYearRange, getCustomYearLabel, sortCustomYearsCalendarFirst } from '@/types/custom-years'
import { SectorHierarchyFilter, SectorFilterSelection } from '@/components/maps/SectorHierarchyFilter'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

// Help tooltip descriptions for each chart
const CHART_HELP: Record<string, string> = {
  overallScore: 'The overall aid effectiveness score is the average percentage of "Yes" answers across all GPEDC boolean indicators. A higher score indicates stronger alignment with the Global Partnership for Effective Development Co-operation (GPEDC) principles.',
  gpedcCompliant: 'Activities scoring 60% or above on all GPEDC boolean indicators are considered "GPEDC Compliant." This threshold reflects the minimum level of alignment with internationally agreed development effectiveness standards.',
  govOwnership: 'Measures alignment with GPEDC Indicator 1 — the extent to which development co-operation is aligned with national priorities, uses government frameworks, and supports national institutions and capacity development.',
  untiedAid: 'Reflects GPEDC Indicator 10 — aid tying status. Untied aid allows recipient countries to procure goods and services from any source, improving value for money and local ownership.',
  avgOutcomes: 'The average number of government-defined outcome indicators per activity. More outcome indicators suggest stronger results measurement and alignment with national monitoring frameworks.',
  sectionRadar: 'A radar/spider chart showing compliance scores across all 7 GPEDC sections. Each axis represents a section; the shaded area shows the portfolio\'s current compliance profile. Larger area = better overall compliance.',
  tiedAid: 'Distribution of activities by aid tying status (GPEDC Indicator 10). Untied aid is preferred as it gives partner countries freedom to procure from any source, promoting local markets and competitive pricing.',
  sectionBars: 'Bar chart comparing average compliance rates across all 7 GPEDC sections. Identifies which dimensions of development effectiveness are strongest and which need improvement.',
  partners: 'Distribution of activities by implementing partner. Shows which organizations are responsible for delivery, important for understanding capacity and coordination.',
  ownership: 'Government Ownership & Strategic Alignment (GPEDC Indicator 1): Measures whether activities are approved by government, included in national plans, linked to results frameworks, implemented by national institutions, and support public sector capacity.',
  countrySystems: 'Use of Country Public Financial & Procurement Systems (GPEDC Indicator 5a): Tracks whether development funds flow through national treasury, use government budget execution, financial reporting, audit procedures, and procurement systems.',
  govWhyNot: 'When development partners do not use government systems, this chart shows the stated reasons. Understanding these barriers is key to the GPEDC agenda of strengthening and using country systems.',
  outcomeIndicators: 'Distribution of the number of government-defined outcome indicators per activity. Activities with more indicators typically have stronger results frameworks aligned with national M&E systems.',
  predictability: 'Predictability & Aid Characteristics (GPEDC Indicators 5b, 6, 10): Measures whether annual budgets and forward plans are shared, whether multi-year financing agreements exist, and aid tying status.',
  transparency: 'Transparency & Timely Reporting (GPEDC Indicator 4): Tracks whether annual financial reports, evaluation reports, and performance data are publicly available and regularly updated.',
  accountability: 'Mutual Accountability (GPEDC Indicator 7): Assesses whether joint annual reviews occur, mutual accountability frameworks are in place, and corrective actions are documented.',
  civilSociety: 'Civil Society & Private Sector Engagement (GPEDC Indicators 2 & 3): Measures consultation with civil society, CSO involvement in implementation, core funding to CSOs, and public-private dialogue.',
  gender: 'Gender Equality & Inclusion (GPEDC Indicator 8): Tracks whether gender objectives are integrated into activities, gender-specific budget allocations exist, and gender-disaggregated indicators are used.',
  complianceRadar: 'Full GPEDC compliance radar showing scores across all 7 indicator categories. This provides a comprehensive view of the portfolio\'s alignment with GPEDC monitoring indicators.',
  allSections: 'Breakdown of compliance scores for all 7 GPEDC sections with progress bars and percentage ratings. Sections scoring 70%+ are rated "Excellent", 50-69% "Good", and below 50% "Needs Improvement".',
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
      { key: 'linkedToGovFramework', label: 'Linked to Gov Results Framework' },
      { key: 'indicatorsFromGov', label: 'Indicators from Gov Frameworks' },
      { key: 'indicatorsViaGovData', label: 'Monitored via Gov M&E' },
      { key: 'implementedByNationalInstitution', label: 'Implemented by National Institution' },
      { key: 'govEntityAccountable', label: 'Gov Entity Accountable' },
      { key: 'supportsPublicSector', label: 'Supports Public Sector' },
      { key: 'capacityDevFromNationalPlan', label: 'Capacity Dev from National Plan' },
    ]
  },
  countrySystems: {
    label: '2. Country Systems',
    fields: [
      { key: 'fundsViaNationalTreasury', label: 'Funds via National Treasury' },
      { key: 'govBudgetSystem', label: 'Gov Budget Execution' },
      { key: 'govFinReporting', label: 'Gov Financial Reporting' },
      { key: 'finReportingIntegratedPFM', label: 'Integrated into PFM' },
      { key: 'govAudit', label: 'Gov Audit Procedures' },
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

  // Reporting org filter
  const [reportingOrgs, setReportingOrgs] = useState<ReportingOrg[]>([])
  const [selectedReportingOrg, setSelectedReportingOrg] = useState<string>('all')

  // Sector filter
  const [sectorSelection, setSectorSelection] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  })
  const [sectorActivityIds, setSectorActivityIds] = useState<Set<string> | null>(null)
  const [reportingOrgActivityIds, setReportingOrgActivityIds] = useState<Set<string> | null>(null)

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
  useEffect(() => {
    const fetchSectorActivityIds = async () => {
      const allCodes = [
        ...sectorSelection.sectorCategories,
        ...sectorSelection.sectors,
        ...sectorSelection.subSectors,
      ]
      if (allCodes.length === 0) {
        setSectorActivityIds(null)
        return
      }
      try {
        const { data } = await supabase.from('sectors').select('activity_id, code')
        if (data) {
          const matchingIds = new Set<string>()
          data.forEach((row: any) => {
            const code = row.code || ''
            // Match exact code, or prefix match for categories/groups
            const matches = allCodes.some(filterCode => code.startsWith(filterCode))
            if (matches) matchingIds.add(row.activity_id)
          })
          setSectorActivityIds(matchingIds)
        }
      } catch (err) {
        console.warn('Sector filter lookup error:', err)
      }
    }
    fetchSectorActivityIds()
  }, [sectorSelection])

  // Fetch reporting org activity IDs
  useEffect(() => {
    if (selectedReportingOrg === 'all') {
      setReportingOrgActivityIds(null)
      return
    }
    const fetchOrgActivityIds = async () => {
      try {
        const { data } = await supabase.from('activities').select('id').eq('reporting_org_id', selectedReportingOrg)
        setReportingOrgActivityIds(new Set((data || []).map((d: any) => d.id)))
      } catch (err) {
        console.warn('Reporting org filter error:', err)
        setReportingOrgActivityIds(null)
      }
    }
    fetchOrgActivityIds()
  }, [selectedReportingOrg])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: activities, error } = await supabase
        .from('activities')
        .select('id, title_narrative, general_info, planned_start_date, activity_status, reporting_org_id')
      if (error) throw error

      const withAE = (activities || []).filter((a: any) => a.general_info?.aidEffectiveness)
      setRawActivities(withAE)

      const { data: orgs } = await supabase.from('organizations').select('id, name, acronym, logo, organisation_type')
      const map = new Map<string, string>()
      const typeMap = new Map<string, string>()
      ;(orgs || []).forEach((o: any) => {
        map.set(o.id, o.acronym || o.name)
        if (o.organisation_type) typeMap.set(o.id, o.organisation_type)
      })
      setOrgMap(map)
      setOrgTypeMap(typeMap)

      // Build reporting orgs list from activities that have aid effectiveness data
      const reportingOrgIds = new Set<string>()
      withAE.forEach((a: any) => { if (a.reporting_org_id) reportingOrgIds.add(a.reporting_org_id) })
      const reportingOrgList: ReportingOrg[] = []
      reportingOrgIds.forEach(id => {
        const org = (orgs || []).find((o: any) => o.id === id)
        if (org) reportingOrgList.push({ id: org.id, name: org.name, acronym: org.acronym, logo: org.logo })
      })
      reportingOrgList.sort((a, b) => (a.acronym || a.name).localeCompare(b.acronym || b.name))
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
      // Year filter via date range
      if (effectiveDateRange && a.planned_start_date) {
        const d = new Date(a.planned_start_date)
        if (d < effectiveDateRange.from || d > effectiveDateRange.to) return false
      }
      if (reportingOrgActivityIds && !reportingOrgActivityIds.has(a.id)) return false
      if (sectorActivityIds && !sectorActivityIds.has(a.id)) return false
      return true
    })
  }, [rawActivities, effectiveDateRange, reportingOrgActivityIds, sectorActivityIds])

  // Compute all metrics
  const metrics = useMemo(() => {
    const total = filteredActivities.length
    if (total === 0) return null

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

  const handleRefresh = () => { fetchData(); toast.success('Dashboard refreshed') }

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
    if (mode === 'donor') return orgMap.get(orgId) || orgId.substring(0, 8)
    if (mode === 'orgType') return IATI_ORG_TYPE_LABELS[orgTypeMap.get(orgId) || ''] || 'Unknown'
    return 'All'
  }, [orgMap, orgTypeMap])

  const sortedRadarData = useMemo(() => {
    if (!metrics) return []
    const copy = [...metrics.radarData]
    if (sectionPerfSort === 'value') copy.sort((a, b) => b.value - a.value)
    return copy
  }, [metrics, sectionPerfSort])

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

  const hasSectorFilter = sectorSelection.sectorCategories.length > 0 ||
    sectorSelection.sectors.length > 0 ||
    sectorSelection.subSectors.length > 0

  if (loading || customYearsLoading) {
    return <MainLayout><AnalyticsSkeleton /></MainLayout>
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Aid Effectiveness Dashboard</h1>
              <p className="text-muted-foreground mt-1">GPEDC Compliance & Development Effectiveness Analytics</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 overflow-hidden relative bg-cover bg-center bg-no-repeat" style={{ backgroundImage: GPEDC_BG }}>
          <div className="absolute inset-0 bg-black/10" />
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-white" />
              <CardTitle className="text-lg text-white">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-start gap-4 flex-wrap">
              {/* Calendar Type + Year Range Selector */}
              {customYears.length > 0 && (
                <>
                  <div className="min-w-[180px]">
                    <label className="text-body font-medium text-white mb-2 block">Calendar</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1 bg-card">
                          {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {sortCustomYearsCalendarFirst(customYears).map(cy => (
                          <DropdownMenuItem
                            key={cy.id}
                            className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                            onClick={() => setCalendarType(cy.id)}
                          >
                            <span className="flex items-center gap-2">
                              {cy.shortName && (
                                <span className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                  {cy.shortName.trim()}
                                </span>
                              )}
                              {cy.name}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="min-w-[200px]">
                    <label className="text-body font-medium text-white mb-2 block">Year Range</label>
                    <div className="flex flex-col gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 gap-1 bg-card">
                            <CalendarIcon className="h-4 w-4" />
                            {selectedYears.length === 0
                              ? 'All Years'
                              : selectedYears.length === 1
                                ? getYearLabel(selectedYears[0])
                                : `${getYearLabel(Math.min(...selectedYears))} – ${getYearLabel(Math.max(...selectedYears))}`}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="p-3 w-auto">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-helper font-medium text-foreground">Select Year Range</span>
                          </div>
                          <button
                            onClick={() => setSelectedYears([])}
                            className={`w-full mb-2 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                              selectedYears.length === 0
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted border border-border'
                            }`}
                          >
                            All Years
                          </button>
                          <div className="grid grid-cols-3 gap-1">
                            {AVAILABLE_YEARS.map((year) => {
                              const isStartOrEnd = selectedYears.length > 0 &&
                                (year === Math.min(...selectedYears) || year === Math.max(...selectedYears))
                              const inRange = isYearInRange(year)
                              return (
                                <button
                                  key={year}
                                  onClick={(e) => handleYearClick(year, e.shiftKey)}
                                  className={`
                                    px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap
                                    ${isStartOrEnd
                                      ? 'bg-primary text-primary-foreground'
                                      : inRange
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }
                                  `}
                                >
                                  {getYearLabel(year)}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 text-center">
                            Click start year, then click end year
                          </p>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {effectiveDateRange && (
                        <span className="text-helper text-muted-foreground">
                          {format(effectiveDateRange.from, 'MMM d, yyyy')} – {format(effectiveDateRange.to, 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Reporting Organisation */}
              <div className="min-w-[320px]">
                <label className="text-body font-medium text-white mb-2 block">Reporting Organisation</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-card w-full justify-between">
                      {selectedReportingOrg === 'all' ? (
                        <span>All Organisations</span>
                      ) : (
                        <span className="flex items-center gap-2 truncate">
                          {(() => {
                            const org = reportingOrgs.find(o => o.id === selectedReportingOrg)
                            if (!org) return 'All Organisations'
                            return (
                              <>
                                <Avatar className="h-4 w-4 shrink-0">
                                  {org.logo ? <AvatarImage src={org.logo} alt={org.name} /> : null}
                                  <AvatarFallback className="text-[8px] bg-muted">{(org.acronym || org.name).substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="truncate">{org.name}{org.acronym ? ` (${org.acronym})` : ''}</span>
                                <span className="font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{org.id.substring(0, 8)}</span>
                              </>
                            )
                          })()}
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[420px] max-h-[300px] overflow-auto">
                    <DropdownMenuItem
                      className={selectedReportingOrg === 'all' ? 'bg-muted font-medium' : ''}
                      onClick={() => setSelectedReportingOrg('all')}
                    >
                      All Organisations
                    </DropdownMenuItem>
                    {reportingOrgs.map(org => (
                      <DropdownMenuItem
                        key={org.id}
                        className={selectedReportingOrg === org.id ? 'bg-muted font-medium' : ''}
                        onClick={() => setSelectedReportingOrg(org.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Avatar className="h-6 w-6 shrink-0">
                            {org.logo ? <AvatarImage src={org.logo} alt={org.name} /> : null}
                            <AvatarFallback className="text-[9px] bg-muted">{(org.acronym || org.name).substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-body truncate">{org.name}{org.acronym ? ` (${org.acronym})` : ''}</span>
                          <span className="font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0 ml-auto">{org.id.substring(0, 8)}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Sector Filter */}
              <div className="min-w-[200px]">
                <label className="text-body font-medium text-white mb-2 block">Sector</label>
                <SectorHierarchyFilter
                  selected={sectorSelection}
                  onChange={setSectorSelection}
                  className="bg-card"
                />
              </div>

              {/* Clear Filters */}
              {(selectedYears.length > 0 || selectedReportingOrg !== 'all' || hasSectorFilter) && (
                <div className="pt-7">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-white/70 hover:text-white hover:bg-card/10"
                    onClick={() => {
                      setSelectedYears([])
                      setSelectedReportingOrg('all')
                      setSectorSelection({ sectorCategories: [], sectors: [], subSectors: [] })
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {metrics ? (
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
                  const outcomeChart = (height: number) => (
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
                  return (
                    <Card className="bg-card border-border">
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
                            interpretation="Each bar shows how many activities track a given number of outcome indicators (0, 1–2, 3–5, 6–10, 10+). A healthy portfolio sits in the middle bands — too few suggests under-measurement of results, while many indicators in the top band can signal heavy reporting burden without sharper insight. Use this to spot under-monitored activities and rebalance toward focused, government-aligned indicator sets."
                            controls={
                              <Select value={outcomeDisplayMode} onValueChange={(v) => setOutcomeDisplayMode(v as 'count' | 'pct')}>
                                <SelectTrigger className="h-8 w-[140px] text-helper">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="count">Show: count</SelectItem>
                                  <SelectItem value="pct">Show: %</SelectItem>
                                </SelectContent>
                              </Select>
                            }
                            csv={() => ({
                              filename: 'outcome-indicators-distribution.csv',
                              headers: ['Range', 'Activities', '%'],
                              rows: metrics.outcomeDistribution.map((d) => [d.range, d.count, d.pct]),
                            })}
                            render={(h) => outcomeChart(h)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {outcomeChart(250)}
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
                    <Card className="bg-card border-border">
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
                            interpretation="Untied aid lets recipient countries procure goods and services from the most cost-effective source — boosting value for money, local market participation, and country ownership. Partially tied and tied aid restrict procurement to the donor country or a limited set of providers, which often raises costs and limits recipient choice. A higher untied share is a core GPEDC commitment (Indicator 10); the trend over time shows how well partners are honouring it."
                            controls={
                              <>
                                <Select value={tiedDisaggregate} onValueChange={(v) => setTiedDisaggregate(v as Disaggregate)}>
                                  <SelectTrigger className="h-8 w-[170px] text-helper">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No disaggregation</SelectItem>
                                    <SelectItem value="donor">By donor</SelectItem>
                                    <SelectItem value="orgType">By org type</SelectItem>
                                  </SelectContent>
                                </Select>
                                {tiedDisaggregate === 'none' && (
                                  <Select value={tiedDisplay} onValueChange={(v) => setTiedDisplay(v as 'donut' | 'pie')}>
                                    <SelectTrigger className="h-8 w-[120px] text-helper">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="donut">Donut</SelectItem>
                                      <SelectItem value="pie">Pie</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                    <Card className="bg-card border-border">
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
                            interpretation="The radar plots the average positive-response rate for each of the seven GPEDC sections (Ownership, Country Systems, Predictability, Transparency, Mutual Accountability, Civil Society, Gender). Sections closer to the outer ring are areas of strength; dents inward are weaknesses. Read the shape, not just any single axis — a balanced polygon means the portfolio is broadly aligned with effectiveness principles, while a spiky shape highlights specific principles that need attention."
                            controls={
                              <Select value={radarThreshold} onValueChange={(v) => setRadarThreshold(v as 'all' | 'below50' | 'below70')}>
                                <SelectTrigger className="h-8 w-[150px] text-helper">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All sections</SelectItem>
                                  <SelectItem value="below70">Focus: &lt; 70%</SelectItem>
                                  <SelectItem value="below50">Focus: &lt; 50%</SelectItem>
                                </SelectContent>
                              </Select>
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
                    <Card className="bg-card border-border">
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
                            interpretation="A side-by-side comparison of the same data shown on the radar. Use this to identify which GPEDC principle the portfolio is strongest and weakest on, prioritise capacity-building investments, and benchmark progress over time. Sections under 50% generally warrant policy or practice review; sections above 70% are areas where partners can share lessons learned."
                            controls={
                              <Select value={sectionPerfSort} onValueChange={(v) => setSectionPerfSort(v as 'value' | 'section')}>
                                <SelectTrigger className="h-8 w-[140px] text-helper">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="value">Sort: score</SelectItem>
                                  <SelectItem value="section">Sort: section</SelectItem>
                                </SelectContent>
                              </Select>
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
                    <Card className="bg-card border-border">
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
                            interpretation="A scoreboard view of every GPEDC section. Use this when you want to compare exact percentages side by side rather than read a chart's visual shape — particularly useful for reporting or executive summaries."
                            controls={
                              <Select value={allSectionsSort} onValueChange={(v) => setAllSectionsSort(v as 'value' | 'section')}>
                                <SelectTrigger className="h-8 w-[140px] text-helper">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="section">Sort: section</SelectItem>
                                  <SelectItem value="value">Sort: score</SelectItem>
                                </SelectContent>
                              </Select>
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
                <Card className="bg-card border-border">
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
                        interpretation="Shows which organisations are responsible for delivering activities. Concentration in a small number of partners can signal reliance on a few capable agencies; a long tail suggests broader engagement but also coordination overhead. Use this to assess the diversity of the partnership base and whether new or local partners should be brought in to strengthen country ownership."
                        controls={
                          <Select value={String(partnerTopN)} onValueChange={(v) => setPartnerTopN(Number(v))}>
                            <SelectTrigger className="h-8 w-[110px] text-helper">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">Top 5</SelectItem>
                              <SelectItem value="10">Top 10</SelectItem>
                              <SelectItem value="20">Top 20</SelectItem>
                            </SelectContent>
                          </Select>
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
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No Aid Effectiveness Data</h3>
              <p className="text-muted-foreground mt-1">No activities match the selected filters or have aid effectiveness data.</p>
            </CardContent>
          </Card>
        )}
      </div>
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
  const [sortBy, setSortBy] = useState<'pct' | 'label'>('pct')
  const sortedFields = useMemo(() => {
    const copy = [...fields]
    if (sortBy === 'pct') copy.sort((a, b) => b.pct - a.pct)
    else copy.sort((a, b) => a.label.localeCompare(b.label))
    return copy
  }, [fields, sortBy])
  const renderChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedFields} layout="vertical" margin={{ left: 20, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#64748b" fontSize={12} />
        <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} width={200} />
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
    <Card className="bg-card border-border">
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
              interpretation={`Each bar shows the share of activities that answered positively for the listed indicator within the "${title}" section of GPEDC. Higher bars are areas of strength; low bars highlight where partners or activities can improve. Combined, the section's average score is the headline number used in the radar and section-performance views.`}
              controls={
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'pct' | 'label')}>
                  <SelectTrigger className="h-8 w-[140px] text-helper">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pct">Sort: adoption</SelectItem>
                    <SelectItem value="label">Sort: A–Z</SelectItem>
                  </SelectContent>
                </Select>
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
    <Card className="bg-card border-border">
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
