"use client"

import React, { useState, useEffect, useMemo } from 'react'
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
import { CustomYear, getCustomYearRange, getCustomYearLabel } from '@/types/custom-years'
import { SectorHierarchyFilter, SectorFilterSelection } from '@/components/maps/SectorHierarchyFilter'
import { format } from 'date-fns'

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

const toBool = (val: any): boolean => val === true
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
  govWhyNot: 'When donors do not use government systems, this chart shows the stated reasons. Understanding these barriers is key to the GPEDC agenda of strengthening and using country systems.',
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
          <HelpCircle className={`h-4 w-4 cursor-help shrink-0 ${className || 'text-slate-400 hover:text-slate-600'}`} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
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

      const { data: orgs } = await supabase.from('organizations').select('id, name, acronym, logo')
      const map = new Map<string, string>()
      ;(orgs || []).forEach((o: any) => map.set(o.id, o.acronym || o.name))
      setOrgMap(map)

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
            <Shield className="h-8 w-8 text-[#F37021]" />
            <div>
              <h1 className="text-3xl font-bold text-[#F37021]">Aid Effectiveness Dashboard</h1>
              <p className="text-slate-600">GPEDC Compliance & Development Effectiveness Analytics</p>
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
                    <label className="text-sm font-medium text-white mb-2 block">Calendar</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1 bg-white">
                          {customYears.find(cy => cy.id === calendarType)?.name || 'Select calendar'}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {customYears.map(cy => (
                          <DropdownMenuItem
                            key={cy.id}
                            className={calendarType === cy.id ? 'bg-slate-100 font-medium' : ''}
                            onClick={() => setCalendarType(cy.id)}
                          >
                            {cy.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="min-w-[200px]">
                    <label className="text-sm font-medium text-white mb-2 block">Year Range</label>
                    <div className="flex flex-col gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 gap-1 bg-white">
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
                            <span className="text-xs font-medium text-slate-700">Select Year Range</span>
                          </div>
                          <button
                            onClick={() => setSelectedYears([])}
                            className={`w-full mb-2 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                              selectedYears.length === 0
                                ? 'bg-primary text-primary-foreground'
                                : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }
                                  `}
                                >
                                  {getYearLabel(year)}
                                </button>
                              )
                            })}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 text-center">
                            Click start year, then click end year
                          </p>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {effectiveDateRange && (
                        <span className="text-xs text-slate-500">
                          {format(effectiveDateRange.from, 'MMM d, yyyy')} – {format(effectiveDateRange.to, 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Reporting Organisation */}
              <div className="min-w-[320px]">
                <label className="text-sm font-medium text-white mb-2 block">Reporting Organisation</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-white w-full justify-between">
                      {selectedReportingOrg === 'all' ? (
                        <span>All Organisations</span>
                      ) : (
                        <span className="flex items-center gap-2 truncate">
                          {(() => {
                            const org = reportingOrgs.find(o => o.id === selectedReportingOrg)
                            if (!org) return 'All Organisations'
                            return (
                              <>
                                <Avatar className="h-5 w-5 shrink-0">
                                  {org.logo ? <AvatarImage src={org.logo} alt={org.name} /> : null}
                                  <AvatarFallback className="text-[8px] bg-slate-200">{(org.acronym || org.name).substring(0, 2).toUpperCase()}</AvatarFallback>
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
                      className={selectedReportingOrg === 'all' ? 'bg-slate-100 font-medium' : ''}
                      onClick={() => setSelectedReportingOrg('all')}
                    >
                      All Organisations
                    </DropdownMenuItem>
                    {reportingOrgs.map(org => (
                      <DropdownMenuItem
                        key={org.id}
                        className={selectedReportingOrg === org.id ? 'bg-slate-100 font-medium' : ''}
                        onClick={() => setSelectedReportingOrg(org.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Avatar className="h-6 w-6 shrink-0">
                            {org.logo ? <AvatarImage src={org.logo} alt={org.name} /> : null}
                            <AvatarFallback className="text-[9px] bg-slate-200">{(org.acronym || org.name).substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{org.name}{org.acronym ? ` (${org.acronym})` : ''}</span>
                          <span className="font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0 ml-auto">{org.id.substring(0, 8)}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Sector Filter */}
              <div className="min-w-[200px]">
                <label className="text-sm font-medium text-white mb-2 block">Sector</label>
                <SectorHierarchyFilter
                  selected={sectorSelection}
                  onChange={setSectorSelection}
                  className="bg-white"
                />
              </div>

              {/* Clear Filters */}
              {(selectedYears.length > 0 || selectedReportingOrg !== 'all' || hasSectorFilter) && (
                <div className="pt-7">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-white/70 hover:text-white hover:bg-white/10"
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
                      <p className="text-sm font-bold text-white flex items-center gap-1">
                        Overall Score <HelpTooltip helpKey="overallScore" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.overallScore}%</p>
                    </div>
                    <Shield className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.overallScore} className="mt-3 bg-white/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-xs font-semibold text-white mt-1">{metrics.total} activities assessed</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '25% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-1">
                        GPEDC Compliant <HelpTooltip helpKey="gpedcCompliant" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.complianceRate}%</p>
                    </div>
                    <CheckCircle2 className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.complianceRate} className="mt-3 bg-white/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-xs font-semibold text-white mt-1">{metrics.gpedcCompliant} of {metrics.total} (60%+ threshold)</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '50% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-1">
                        Gov Ownership <HelpTooltip helpKey="govOwnership" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.sectionScores.ownership}%</p>
                    </div>
                    <Building2 className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.sectionScores.ownership} className="mt-3 bg-white/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-xs font-semibold text-white mt-1">GPEDC Indicator 1</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '75% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-1">
                        Untied Aid <HelpTooltip helpKey="untiedAid" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.tiedAid[0].pct}%</p>
                    </div>
                    <Handshake className="h-7 w-7 text-white/50" />
                  </div>
                  <Progress value={metrics.tiedAid[0].pct} className="mt-3 bg-white/30" style={{ '--progress-foreground': '#ffffff' } as React.CSSProperties} />
                  <p className="text-xs font-semibold text-white mt-1">GPEDC Indicator 10</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden relative bg-no-repeat" style={{ backgroundImage: GPEDC_BG, backgroundSize: '300%', backgroundPosition: '100% 50%' }}>
                <div className="absolute inset-0 bg-black/10" />
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-1">
                        Avg Outcomes <HelpTooltip helpKey="avgOutcomes" className="text-white/60 hover:text-white" />
                      </p>
                      <p className="text-3xl font-bold text-white">{metrics.avgOutcome}</p>
                    </div>
                    <Target className="h-7 w-7 text-white/50" />
                  </div>
                  <p className="text-xs font-semibold text-white mt-4">Indicators per activity</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="ownership" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="ownership">Ownership & Systems</TabsTrigger>
                <TabsTrigger value="transparency">Transparency & Accountability</TabsTrigger>
                <TabsTrigger value="engagement">Engagement & Gender</TabsTrigger>
                <TabsTrigger value="compliance">GPEDC Compliance</TabsTrigger>
              </TabsList>

              {/* ===== Ownership & Systems Tab ===== */}
              <TabsContent value="ownership" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionDetail
                  title="Government Ownership & Strategic Alignment"
                  icon={<Building2 className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 1"
                  fields={metrics.fieldCounts.ownership}
                  total={metrics.total}
                  score={metrics.sectionScores.ownership}
                  helpKey="ownership"
                />
                <SectionDetail
                  title="Use of Country Public Financial & Procurement Systems"
                  icon={<Globe className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 5a"
                  fields={metrics.fieldCounts.countrySystems}
                  total={metrics.total}
                  score={metrics.sectionScores.countrySystems}
                  helpKey="countrySystems"
                />
                <GovWhyNotSection activities={filteredActivities} />

                {/* Outcome indicators */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      <Target className="h-5 w-5 text-slate-500" />
                      Outcome Indicators Distribution
                      <HelpTooltip helpKey="outcomeIndicators" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={metrics.outcomeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip formatter={(v: any, _: any, props: any) => [`${v} activities (${props.payload.pct}%)`, 'Count']} />
                        <Bar dataKey="count" fill="#F37021" radius={[4, 4, 0, 0]}>
                          {metrics.outcomeDistribution.map((_, i) => <Cell key={`o-${i}`} fill="#F37021" />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== Transparency & Accountability Tab ===== */}
              <TabsContent value="transparency" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionDetail
                  title="Predictability & Aid Characteristics"
                  icon={<Calendar className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicators 5b, 6, 10"
                  fields={metrics.fieldCounts.predictability}
                  total={metrics.total}
                  score={metrics.sectionScores.predictability}
                  helpKey="predictability"
                />
                {/* Tied Aid Pie */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-slate-500" />
                      Aid Tying Status
                      <HelpTooltip helpKey="tiedAid" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={metrics.tiedAid} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={2} dataKey="value" nameKey="name">
                          {metrics.tiedAid.map((_, i) => <Cell key={`t-${i}`} fill="#F37021" />)}
                        </Pie>
                        <Tooltip formatter={(v: any, _: any, props: any) => [`${v} activities (${props.payload.pct}%)`, props.payload.name]} />
                        <Legend formatter={(_: any, entry: any) => `${entry?.payload?.name || ''} (${entry?.payload?.pct || 0}%)`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <SectionDetail
                  title="Transparency & Timely Reporting"
                  icon={<Eye className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 4"
                  fields={metrics.fieldCounts.transparency}
                  total={metrics.total}
                  score={metrics.sectionScores.transparency}
                  helpKey="transparency"
                />
                <SectionDetail
                  title="Mutual Accountability"
                  icon={<Handshake className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 7"
                  fields={metrics.fieldCounts.accountability}
                  total={metrics.total}
                  score={metrics.sectionScores.accountability}
                  helpKey="accountability"
                />
              </TabsContent>

              {/* ===== Engagement & Gender Tab ===== */}
              <TabsContent value="engagement" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionDetail
                  title="Civil Society & Private Sector Engagement"
                  icon={<Users className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicators 2 & 3"
                  fields={metrics.fieldCounts.civilSociety}
                  total={metrics.total}
                  score={metrics.sectionScores.civilSociety}
                  helpKey="civilSociety"
                />
                <SectionDetail
                  title="Gender Equality & Inclusion"
                  icon={<Heart className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 8"
                  fields={metrics.fieldCounts.gender}
                  total={metrics.total}
                  score={metrics.sectionScores.gender}
                  helpKey="gender"
                />
              </TabsContent>

              {/* ===== GPEDC Compliance Tab ===== */}
              <TabsContent value="compliance" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full radar */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      GPEDC Section Radar
                      <HelpTooltip helpKey="complianceRadar" />
                    </CardTitle>
                    <CardDescription>Compliance across all 7 GPEDC indicator categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={450}>
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics.radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="section" tick={{ fontSize: 12, fill: '#475569' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}%`} />
                        <Radar name="Score %" dataKey="value" stroke="#C25A10" fill="#F37021" fillOpacity={0.3} strokeWidth={2} />
                        <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Section Performance Bars */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-slate-500" />
                      Section Performance
                      <HelpTooltip helpKey="sectionBars" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={metrics.radarData} margin={{ bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="section" stroke="#64748b" fontSize={10} angle={-25} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#64748b" fontSize={12} />
                        <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {metrics.radarData.map((_, i) => <Cell key={`s-${i}`} fill="#F37021" />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* All sections summary */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      All Sections Breakdown
                      <HelpTooltip helpKey="allSections" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(SECTION_FIELDS).map(([key, section]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-800">{section.label}</span>
                          <div className="flex items-center gap-3">
                            <Progress value={metrics.sectionScores[key]} className="w-32 bg-slate-200" style={{ '--progress-foreground': '#F37021' } as React.CSSProperties} />
                            <Badge className={
                              metrics.sectionScores[key] >= 70 ? "bg-[#F37021] text-white" :
                              metrics.sectionScores[key] >= 50 ? "bg-slate-200 text-slate-800" :
                              "bg-slate-100 text-slate-500"
                            }>
                              {metrics.sectionScores[key]}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Implementing Partners */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      <Users className="h-5 w-5 text-slate-500" />
                      Implementing Partners
                      <HelpTooltip helpKey="partners" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PartnerChart partnerCounts={metrics.partnerCounts} orgMap={orgMap} total={metrics.total} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="bg-white border-slate-200">
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700">No Aid Effectiveness Data</h3>
              <p className="text-slate-500 mt-1">No activities match the selected filters or have aid effectiveness data.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

// --- Reusable Section Detail Component ---

function SectionDetail({ title, icon, badge, fields, total, score, helpKey }: {
  title: string
  icon: React.ReactNode
  badge: string
  fields: { label: string; yes: number; pct: number }[]
  total: number
  score: number
  helpKey?: string
}) {
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
            {icon}
            {title}
            {helpKey && <HelpTooltip helpKey={helpKey} />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{badge}</Badge>
            <Badge className={
              score >= 70 ? "bg-[#F37021] text-white" :
              score >= 50 ? "bg-slate-200 text-slate-800" :
              "bg-slate-100 text-slate-500"
            }>{score}%</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, fields.length * 44)}>
          <BarChart data={fields} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#64748b" fontSize={12} />
            <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} width={200} />
            <Tooltip formatter={(v: any, _: any, props: any) => [`${v}% (${props.payload.yes}/${total})`, 'Adoption']} />
            <Bar dataKey="pct" fill="#F37021" radius={[0, 4, 4, 0]}>
              {fields.map((_, i) => <Cell key={`f-${i}`} fill="#F37021" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// --- Partner Distribution Chart ---

function PartnerChart({ partnerCounts, orgMap, total }: {
  partnerCounts: Map<string, number>; orgMap: Map<string, string>; total: number
}) {
  const data = Array.from(partnerCounts.entries())
    .map(([id, count]) => ({
      name: id === 'unassigned' ? 'Unassigned' : (orgMap.get(id) || id.substring(0, 8)),
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  if (data.length === 0) return <p className="text-slate-500 text-center py-8">No implementing partner data</p>

  return (
    <ResponsiveContainer width="100%" height={Math.max(250, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" stroke="#64748b" fontSize={12} />
        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={150} />
        <Tooltip formatter={(v: any, _: any, props: any) => [`${v} activities (${props.payload.pct}%)`, 'Count']} />
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
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
          Reasons for Not Using Government Systems
          <HelpTooltip helpKey="govWhyNot" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map(item => (
            <div key={item.reason} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700">{item.reason}</span>
              <Badge variant="secondary" className="bg-slate-200 text-slate-700">{item.count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
