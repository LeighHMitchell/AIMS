"use client"

import React, { useEffect, useState } from "react"
import { MainLayout } from '@/components/layout/main-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from "recharts"
import { 
  ShieldCheck, 
  TrendingUp, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Trophy,
  Building2
} from "lucide-react"

// Types based on our SQL function return
interface ScoreDetail {
  label: string
  points: number
  max: number
}

interface ScoreCategory {
  score: number
  details: ScoreDetail[]
}

interface ScoreBreakdown {
  operational_planning: ScoreCategory
  finance: ScoreCategory
  attributes: ScoreCategory
  joining_up: ScoreCategory
  performance: ScoreCategory
  multiplier: number
}

interface ProjectScore {
  id: string
  title: string
  reporting_org_id?: string | null
  reporting_org_name?: string | null
  partner_name: string
  updated_at: string
  total_score: number
  breakdown: ScoreBreakdown
}

interface DonorRanking {
  org_id: string
  org_name: string
  project_count: number
  average_score: number
  projects_good_standing: number
  good_standing_percent: number
  rank: number
}

export default function TransparencyIndexPage() {
  const [projects, setProjects] = useState<ProjectScore[]>([])
  const [donors, setDonors] = useState<DonorRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDonors, setIsLoadingDonors] = useState(true)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [donorError, setDonorError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScores() {
      try {
        const response = await fetch('/api/transparency-scores')
        const result = await response.json()
        
        if (result.data) {
          setProjects(result.data)
        } else if (result.error) {
          console.error("Error fetching transparency scores:", result.error)
        }
      } catch (error) {
        console.error("Error fetching transparency scores:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchScores()
  }, [])

  useEffect(() => {
    async function fetchDonorRankings() {
      try {
        const response = await fetch('/api/transparency-scores/donors')
        const result = await response.json()
        
        console.log('[Transparency Index] Donor rankings response:', result)
        
        if (result.data) {
          console.log('[Transparency Index] Donors loaded:', result.data.length)
          setDonors(result.data)
          setDonorError(null)
        } else if (result.error) {
          console.error("Error fetching donor rankings:", result.error)
          setDonorError(result.error)
        } else if (result.message) {
          console.warn("Donor rankings message:", result.message)
          setDonorError(result.message)
        }
      } catch (error) {
        console.error("Error fetching donor rankings:", error)
        setDonorError(error instanceof Error ? error.message : 'Failed to fetch donor rankings')
      } finally {
        setIsLoadingDonors(false)
      }
    }
    fetchDonorRankings()
  }, [])

  // Analytics
  const averageScore = projects.length 
    ? (projects.reduce((acc, curr) => acc + curr.total_score, 0) / projects.length).toFixed(1) 
    : "0.0"
    
  const goodStandingCount = projects.filter(p => p.total_score >= 80).length
  const goodStandingPercent = projects.length 
    ? ((goodStandingCount / projects.length) * 100).toFixed(1) 
    : "0.0"

  // Chart Data Preparation
  const scoreRanges = [
    { name: '0-39 (Poor)', range: [0, 39], count: 0, color: '#ef4444' },
    { name: '40-79 (Fair)', range: [40, 79], count: 0, color: '#eab308' },
    { name: '80-100 (Good)', range: [80, 100], count: 0, color: '#22c55e' },
  ]

  projects.forEach(p => {
    if (p.total_score < 40) scoreRanges[0].count++
    else if (p.total_score < 80) scoreRanges[1].count++
    else scoreRanges[2].count++
  })

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  const toggleExpand = (id: string) => {
    setExpandedProject(expandedProject === id ? null : id)
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 text-center">Loading transparency scores...</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          Country-Level Transparency Index
        </h1>
        <p className="text-gray-600 mt-2">
          Automated assessment of data quality based on the 2026 Aid Transparency Index methodology.
        </p>
      </header>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="projects">All Projects</TabsTrigger>
          <TabsTrigger value="donors">Donor Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{averageScore} / 100</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Projects Assessed</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">In "Good" Standing</p>
              <p className="text-2xl font-bold text-gray-900">{goodStandingPercent}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-6">Score Distribution</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreRanges}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {scoreRanges.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-700">Project Assessments</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {projects.map((project) => (
            <div key={project.id} className="group">
              {/* Project Row */}
              <div 
                onClick={() => toggleExpand(project.id)}
                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{project.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>{project.partner_name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(project.total_score)}`}>
                    {project.total_score}
                  </div>
                  {expandedProject === project.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Drill-down Details */}
              {expandedProject === project.id && (
                <div className="px-4 pb-4 pt-0 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border-t border-gray-100">
                    
                    {/* Multiplier Badge */}
                    <div className="lg:col-span-5 mb-2 flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">Timeliness Multiplier:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        project.breakdown.multiplier === 1.0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        x{project.breakdown.multiplier}
                      </span>
                      <span className="text-xs text-gray-500">
                        (Based on last update date)
                      </span>
                    </div>

                    <ScoreCardSection title="Operational Planning" data={project.breakdown.operational_planning} />
                    <ScoreCardSection title="Finance & Budgets" data={project.breakdown.finance} />
                    <ScoreCardSection title="Attributes" data={project.breakdown.attributes} />
                    <ScoreCardSection title="Joining-Up" data={project.breakdown.joining_up} />
                    <ScoreCardSection title="Performance" data={project.breakdown.performance} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="donors" className="space-y-8">
          {/* Donor Rankings Header */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-600" />
                <h2 className="text-2xl font-bold text-gray-900">Data Completeness Leaderboard</h2>
              </div>
              {donors.length > 0 && (
                <div className="text-sm text-gray-600">
                  {donors.length} organization{donors.length !== 1 ? 's' : ''} ranked
                </div>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              Organizations ranked by average transparency score of their reported activities. 
              Higher scores indicate better data completeness and quality.
            </p>
          </div>

          {/* Top Donors Chart */}
          {!isLoadingDonors && !donorError && donors.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-6">Top 10 Donors by Average Score</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={donors.slice(0, 10).map(d => ({
                      name: d.org_name.length > 30 ? d.org_name.substring(0, 30) + '...' : d.org_name,
                      fullName: d.org_name,
                      score: d.average_score,
                      projects: d.project_count
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis 
                      type="number" 
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      width={140}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-gray-900 mb-2">{data.fullName}</p>
                              <p className="text-sm text-gray-600">Average Score: <span className="font-bold">{data.score}</span></p>
                              <p className="text-sm text-gray-600">Projects: <span className="font-bold">{data.projects}</span></p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {donors.slice(0, 10).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.average_score >= 80 ? '#22c55e' : 
                            entry.average_score >= 40 ? '#eab308' : 
                            '#ef4444'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Donor Rankings Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-700">Complete Rankings</h3>
            </div>
            
            {isLoadingDonors ? (
              <div className="p-8 text-center text-gray-500">Loading donor rankings...</div>
            ) : donorError ? (
              <div className="p-8 text-center">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium mb-2">Unable to load donor rankings</p>
                  <p className="text-sm text-yellow-700">{donorError}</p>
                  <p className="text-xs text-yellow-600 mt-2">
                    Make sure the database migrations have been run and that activities have reporting_org_id set.
                  </p>
                </div>
              </div>
            ) : donors.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">No donor data available</p>
                <p className="text-sm mt-1">Organizations will appear here once they have activities with transparency scores.</p>
                <p className="text-xs mt-2 text-gray-400">
                  Tip: Activities need a reporting_org_id to appear in donor rankings.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-4">Organization</div>
                  <div className="col-span-2 text-center">Projects</div>
                  <div className="col-span-2 text-center">Avg Score</div>
                  <div className="col-span-2 text-center">Good Standing</div>
                  <div className="col-span-1 text-center">%</div>
                </div>
                {donors.map((donor) => (
                  <div key={donor.org_id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="col-span-1 flex items-center">
                      <span className={`text-lg font-bold ${
                        donor.rank === 1 ? 'text-yellow-600' : 
                        donor.rank <= 3 ? 'text-gray-700' : 
                        'text-gray-400'
                      }`}>
                        #{donor.rank}
                      </span>
                    </div>
                    <div className="col-span-4 flex items-center">
                      <Building2 className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{donor.org_name}</span>
                    </div>
                    <div className="col-span-2 text-center flex items-center justify-center">
                      <span className="text-gray-700">{donor.project_count}</span>
                    </div>
                    <div className="col-span-2 text-center flex items-center justify-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(donor.average_score)}`}>
                        {donor.average_score.toFixed(1)}
                      </span>
                    </div>
                    <div className="col-span-2 text-center flex items-center justify-center">
                      <span className="text-gray-700">{donor.projects_good_standing} / {donor.project_count}</span>
                    </div>
                    <div className="col-span-1 text-center flex items-center justify-center">
                      <span className="text-sm text-gray-600">{donor.good_standing_percent.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </MainLayout>
  )
}

function ScoreCardSection({ title, data }: { title: string, data: ScoreCategory }) {
  return (
    <div className="bg-white p-3 rounded border border-gray-200 text-sm">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
        <span className="font-semibold text-gray-800">{title}</span>
        <span className="font-bold text-blue-600">{data.score} pts</span>
      </div>
      <ul className="space-y-1.5">
        {data.details.map((detail, idx) => (
          <li key={idx} className="flex justify-between items-start text-xs">
            <span className={`${detail.points > 0 ? 'text-gray-600' : 'text-red-500'}`}>
              {detail.label}
            </span>
            <span className="font-medium text-gray-400">
              {detail.points}/{detail.max}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

