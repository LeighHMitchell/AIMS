"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AnalyticsSkeleton } from '@/components/ui/skeleton-loader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield, Target, Building2, SlidersHorizontal, RefreshCw,
  CheckCircle2, Users, BarChart3, Globe, Handshake,
  Eye, Heart, Calendar
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'

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
}

// --- Constants ---

const AVAILABLE_YEARS = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)
const SLATE_PALETTE = ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1']

// --- Helpers ---

const toBool = (val: any): boolean => val === true
const pct = (count: number, total: number): number =>
  total === 0 ? 0 : Math.round((count / total) * 100)

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

// --- Main Component ---

export default function AidEffectivenessDashboard() {
  const [loading, setLoading] = useState(true)
  const [rawActivities, setRawActivities] = useState<ActivityRow[]>([])
  const [orgMap, setOrgMap] = useState<Map<string, string>>(new Map())
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [filters, setFilters] = useState({
    donor: 'all',
    sector: 'all',
    country: 'all',
    implementingPartner: 'all'
  })

  const [donors, setDonors] = useState<Array<{ id: string; name: string }>>([])
  const [sectors, setSectors] = useState<Array<{ code: string; name: string }>>([])
  const [countries, setCountries] = useState<Array<{ code: string; name: string }>>([])
  const [partnerOptions, setPartnerOptions] = useState<Array<{ id: string; name: string }>>([])

  const [donorActivityIds, setDonorActivityIds] = useState<Set<string> | null>(null)
  const [sectorActivityIds, setSectorActivityIds] = useState<Set<string> | null>(null)
  const [countryActivityIds, setCountryActivityIds] = useState<Set<string> | null>(null)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchFilterLookups() }, [filters.donor, filters.sector, filters.country])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: activities, error } = await supabase
        .from('activities')
        .select('id, title_narrative, general_info, planned_start_date, activity_status')
      if (error) throw error

      const withAE = (activities || []).filter((a: any) => a.general_info?.aidEffectiveness)
      setRawActivities(withAE)

      const { data: orgs } = await supabase.from('organizations').select('id, name, acronym')
      const map = new Map<string, string>()
      ;(orgs || []).forEach((o: any) => map.set(o.id, o.acronym || o.name))
      setOrgMap(map)

      const [donorRes, sectorRes, countryRes] = await Promise.all([
        supabase.from('organizations').select('id, name, acronym').eq('type', 'donor').order('name'),
        supabase.from('sectors').select('code, name').order('name'),
        supabase.from('countries').select('code, name').order('name')
      ])

      setDonors((donorRes.data || []).map((d: any) => ({ id: d.id, name: d.acronym || d.name })))

      const sectorMap = new Map<string, string>()
      ;(sectorRes.data || []).forEach((s: any) => { if (!sectorMap.has(s.code)) sectorMap.set(s.code, s.name) })
      setSectors(Array.from(sectorMap.entries()).map(([code, name]) => ({ code, name })))
      setCountries(countryRes.data || [])

      const partnerIds = new Set<string>()
      withAE.forEach((a: any) => { const pid = a.general_info?.aidEffectiveness?.implementingPartner; if (pid) partnerIds.add(pid) })
      const partnerOpts: Array<{ id: string; name: string }> = []
      partnerIds.forEach(id => { const name = map.get(id); if (name) partnerOpts.push({ id, name }) })
      partnerOpts.sort((a, b) => a.name.localeCompare(b.name))
      setPartnerOptions(partnerOpts)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchFilterLookups = async () => {
    try {
      if (filters.donor !== 'all') {
        const { data } = await supabase.from('participating_orgs').select('activity_id').eq('org_id', filters.donor)
        setDonorActivityIds(new Set((data || []).map((d: any) => d.activity_id)))
      } else { setDonorActivityIds(null) }
      if (filters.sector !== 'all') {
        const { data } = await supabase.from('sectors').select('activity_id').eq('code', filters.sector)
        setSectorActivityIds(new Set((data || []).map((d: any) => d.activity_id)))
      } else { setSectorActivityIds(null) }
      if (filters.country !== 'all') {
        const { data } = await supabase.from('recipient_countries').select('activity_id').eq('code', filters.country)
        setCountryActivityIds(new Set((data || []).map((d: any) => d.activity_id)))
      } else { setCountryActivityIds(null) }
    } catch (error) { console.warn('Filter lookup error:', error) }
  }

  const filteredActivities = useMemo(() => {
    return rawActivities.filter(a => {
      const ae = a.general_info?.aidEffectiveness as AidEffectivenessData
      if (!ae) return false
      if (selectedYear !== 'all' && a.planned_start_date) {
        if (new Date(a.planned_start_date).getFullYear() !== parseInt(selectedYear)) return false
      }
      if (filters.implementingPartner !== 'all' && ae.implementingPartner !== filters.implementingPartner) return false
      if (donorActivityIds && !donorActivityIds.has(a.id)) return false
      if (sectorActivityIds && !sectorActivityIds.has(a.id)) return false
      if (countryActivityIds && !countryActivityIds.has(a.id)) return false
      return true
    })
  }, [rawActivities, selectedYear, filters, donorActivityIds, sectorActivityIds, countryActivityIds])

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

  if (loading) {
    return <MainLayout><AnalyticsSkeleton /></MainLayout>
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-slate-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Aid Effectiveness Dashboard</h1>
              <p className="text-slate-600">GPEDC Compliance & Development Effectiveness Analytics</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-lg">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue placeholder="All Years" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {AVAILABLE_YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Donor</label>
                <Select value={filters.donor} onValueChange={v => setFilters(p => ({ ...p, donor: v }))}>
                  <SelectTrigger><SelectValue placeholder="All Donors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Donors</SelectItem>
                    {donors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Sector</label>
                <Select value={filters.sector} onValueChange={v => setFilters(p => ({ ...p, sector: v }))}>
                  <SelectTrigger><SelectValue placeholder="All Sectors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {sectors.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Country</label>
                <Select value={filters.country} onValueChange={v => setFilters(p => ({ ...p, country: v }))}>
                  <SelectTrigger><SelectValue placeholder="All Countries" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Partner</label>
                <Select value={filters.implementingPartner} onValueChange={v => setFilters(p => ({ ...p, implementingPartner: v }))}>
                  <SelectTrigger><SelectValue placeholder="All Partners" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Partners</SelectItem>
                    {partnerOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {metrics ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Overall Score</p>
                      <p className="text-3xl font-bold text-slate-900">{metrics.overallScore}%</p>
                    </div>
                    <Shield className="h-7 w-7 text-slate-400" />
                  </div>
                  <Progress value={metrics.overallScore} className="mt-3 bg-slate-200 [&>div]:bg-slate-700" />
                  <p className="text-xs text-slate-500 mt-1">{metrics.total} activities assessed</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">GPEDC Compliant</p>
                      <p className="text-3xl font-bold text-slate-900">{metrics.complianceRate}%</p>
                    </div>
                    <CheckCircle2 className="h-7 w-7 text-slate-400" />
                  </div>
                  <Progress value={metrics.complianceRate} className="mt-3 bg-slate-200 [&>div]:bg-slate-700" />
                  <p className="text-xs text-slate-500 mt-1">{metrics.gpedcCompliant} of {metrics.total} (60%+ threshold)</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Gov Ownership</p>
                      <p className="text-3xl font-bold text-slate-900">{metrics.sectionScores.ownership}%</p>
                    </div>
                    <Building2 className="h-7 w-7 text-slate-400" />
                  </div>
                  <Progress value={metrics.sectionScores.ownership} className="mt-3 bg-slate-200 [&>div]:bg-slate-700" />
                  <p className="text-xs text-slate-500 mt-1">GPEDC Indicator 1</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Untied Aid</p>
                      <p className="text-3xl font-bold text-slate-900">{metrics.tiedAid[0].pct}%</p>
                    </div>
                    <Handshake className="h-7 w-7 text-slate-400" />
                  </div>
                  <Progress value={metrics.tiedAid[0].pct} className="mt-3 bg-slate-200 [&>div]:bg-slate-700" />
                  <p className="text-xs text-slate-500 mt-1">GPEDC Indicator 10</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Avg Outcomes</p>
                      <p className="text-3xl font-bold text-slate-900">{metrics.avgOutcome}</p>
                    </div>
                    <Target className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 mt-4">Indicators per activity</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ownership">Ownership & Systems</TabsTrigger>
                <TabsTrigger value="transparency">Transparency & Accountability</TabsTrigger>
                <TabsTrigger value="engagement">Engagement & Gender</TabsTrigger>
                <TabsTrigger value="compliance">GPEDC Compliance</TabsTrigger>
              </TabsList>

              {/* ===== Overview Tab ===== */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Section Scores Radar */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-slate-500" />
                        GPEDC Section Scores
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={380}>
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={metrics.radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="section" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Radar name="Score %" dataKey="value" stroke="#334155" fill="#334155" fillOpacity={0.3} />
                          <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Tied Aid Pie */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-slate-500" />
                        Aid Tying Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={380}>
                        <PieChart>
                          <Pie data={metrics.tiedAid} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={2} dataKey="value" nameKey="name">
                            {metrics.tiedAid.map((_, i) => <Cell key={`t-${i}`} fill={SLATE_PALETTE[i * 2]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any, _: any, props: any) => [`${v} activities (${props.payload.pct}%)`, props.payload.name]} />
                          <Legend formatter={(_: any, entry: any) => `${entry?.payload?.name || ''} (${entry?.payload?.pct || 0}%)`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Section Score Bars */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-slate-500" />
                      Section Performance
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
                          {metrics.radarData.map((_, i) => <Cell key={`s-${i}`} fill={SLATE_PALETTE[i % SLATE_PALETTE.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Implementing Partners */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      <Users className="h-5 w-5 text-slate-500" />
                      Implementing Partners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PartnerChart partnerCounts={metrics.partnerCounts} orgMap={orgMap} total={metrics.total} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== Ownership & Systems Tab ===== */}
              <TabsContent value="ownership" className="space-y-6">
                <SectionDetail
                  title="Government Ownership & Strategic Alignment"
                  icon={<Building2 className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 1"
                  fields={metrics.fieldCounts.ownership}
                  total={metrics.total}
                  score={metrics.sectionScores.ownership}
                />
                <SectionDetail
                  title="Use of Country Public Financial & Procurement Systems"
                  icon={<Globe className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 5a"
                  fields={metrics.fieldCounts.countrySystems}
                  total={metrics.total}
                  score={metrics.sectionScores.countrySystems}
                />
                <GovWhyNotSection activities={filteredActivities} />

                {/* Outcome indicators */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
                      <Target className="h-5 w-5 text-slate-500" />
                      Outcome Indicators Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={metrics.outcomeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip formatter={(v: any, _: any, props: any) => [`${v} activities (${props.payload.pct}%)`, 'Count']} />
                        <Bar dataKey="count" fill="#475569" radius={[4, 4, 0, 0]}>
                          {metrics.outcomeDistribution.map((_, i) => <Cell key={`o-${i}`} fill={SLATE_PALETTE[i + 1]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== Transparency & Accountability Tab ===== */}
              <TabsContent value="transparency" className="space-y-6">
                <SectionDetail
                  title="Predictability & Aid Characteristics"
                  icon={<Calendar className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicators 5b, 6, 10"
                  fields={metrics.fieldCounts.predictability}
                  total={metrics.total}
                  score={metrics.sectionScores.predictability}
                />
                <SectionDetail
                  title="Transparency & Timely Reporting"
                  icon={<Eye className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 4"
                  fields={metrics.fieldCounts.transparency}
                  total={metrics.total}
                  score={metrics.sectionScores.transparency}
                />
                <SectionDetail
                  title="Mutual Accountability"
                  icon={<Handshake className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 7"
                  fields={metrics.fieldCounts.accountability}
                  total={metrics.total}
                  score={metrics.sectionScores.accountability}
                />
              </TabsContent>

              {/* ===== Engagement & Gender Tab ===== */}
              <TabsContent value="engagement" className="space-y-6">
                <SectionDetail
                  title="Civil Society & Private Sector Engagement"
                  icon={<Users className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicators 2 & 3"
                  fields={metrics.fieldCounts.civilSociety}
                  total={metrics.total}
                  score={metrics.sectionScores.civilSociety}
                />
                <SectionDetail
                  title="Gender Equality & Inclusion"
                  icon={<Heart className="h-5 w-5 text-slate-500" />}
                  badge="GPEDC Indicator 8"
                  fields={metrics.fieldCounts.gender}
                  total={metrics.total}
                  score={metrics.sectionScores.gender}
                />
              </TabsContent>

              {/* ===== GPEDC Compliance Tab ===== */}
              <TabsContent value="compliance" className="space-y-6">
                {/* Full radar */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700">GPEDC Section Radar</CardTitle>
                    <CardDescription>Compliance across all 7 GPEDC indicator categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={450}>
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics.radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="section" tick={{ fontSize: 12, fill: '#475569' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}%`} />
                        <Radar name="Score %" dataKey="value" stroke="#1e293b" fill="#334155" fillOpacity={0.3} strokeWidth={2} />
                        <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* All sections summary */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-700">All Sections Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(SECTION_FIELDS).map(([key, section]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-800">{section.label}</span>
                          <div className="flex items-center gap-3">
                            <Progress value={metrics.sectionScores[key]} className="w-32 bg-slate-200 [&>div]:bg-slate-700" />
                            <Badge className={
                              metrics.sectionScores[key] >= 70 ? "bg-slate-800 text-white" :
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

function SectionDetail({ title, icon, badge, fields, total, score }: {
  title: string
  icon: React.ReactNode
  badge: string
  fields: { label: string; yes: number; pct: number }[]
  total: number
  score: number
}) {
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-slate-700 flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{badge}</Badge>
            <Badge className={
              score >= 70 ? "bg-slate-800 text-white" :
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
            <Bar dataKey="pct" fill="#334155" radius={[0, 4, 4, 0]}>
              {fields.map((_, i) => <Cell key={`f-${i}`} fill={SLATE_PALETTE[i % SLATE_PALETTE.length]} />)}
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
          {data.map((_, i) => <Cell key={`p-${i}`} fill={SLATE_PALETTE[i % SLATE_PALETTE.length]} />)}
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
        <CardTitle className="text-lg font-medium text-slate-700">Reasons for Not Using Government Systems</CardTitle>
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
