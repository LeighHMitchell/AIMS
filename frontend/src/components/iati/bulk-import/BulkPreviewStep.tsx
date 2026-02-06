'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  MapPin,
  Globe,
  Calendar,
  Wallet,
  User,
  FileText,
  ExternalLink,
} from 'lucide-react'
import type { ParsedActivity } from './types'
import { IATI_COUNTRIES } from '@/data/iati-countries'
import { useHomeCountry } from '@/contexts/SystemSettingsContext'

interface BulkPreviewStepProps {
  activities: ParsedActivity[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

type FilterStatus = 'all' | 'valid' | 'warnings' | 'errors'
type SortField = 'id' | 'title' | 'transactions' | 'budget' | 'status'

export default function BulkPreviewStep({
  activities,
  selectedIds,
  onSelectionChange,
}: BulkPreviewStepProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const homeCountry = useHomeCountry()

  const filteredActivities = useMemo(() => {
    let result = [...activities]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        a =>
          a.iatiIdentifier?.toLowerCase().includes(q) ||
          a.title?.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (filterStatus === 'valid') {
      result = result.filter(a => !a.validationIssues?.some(i => i.severity === 'error' || i.severity === 'warning'))
    } else if (filterStatus === 'warnings') {
      result = result.filter(a => a.validationIssues?.some(i => i.severity === 'warning'))
    } else if (filterStatus === 'errors') {
      result = result.filter(a => a.validationIssues?.some(i => i.severity === 'error'))
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'id') cmp = (a.iatiIdentifier || '').localeCompare(b.iatiIdentifier || '')
      if (sortField === 'title') cmp = (a.title || '').localeCompare(b.title || '')
      if (sortField === 'transactions') cmp = (a.transactions?.length || 0) - (b.transactions?.length || 0)
      if (sortField === 'budget') {
        const aBudget = (a.transactions || []).reduce((sum, t) => sum + (t.value || 0), 0)
        const bBudget = (b.transactions || []).reduce((sum, t) => sum + (t.value || 0), 0)
        cmp = aBudget - bBudget
      }
      if (sortField === 'status') {
        const aErr = a.validationIssues?.some(i => i.severity === 'error') ? 2 : a.validationIssues?.some(i => i.severity === 'warning') ? 1 : 0
        const bErr = b.validationIssues?.some(i => i.severity === 'error') ? 2 : b.validationIssues?.some(i => i.severity === 'warning') ? 1 : 0
        cmp = aErr - bErr
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [activities, searchQuery, filterStatus, sortField, sortAsc])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const selectAll = () => {
    const ids = new Set(filteredActivities.map(a => a.iatiIdentifier))
    onSelectionChange(ids)
  }

  const deselectAll = () => {
    onSelectionChange(new Set())
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const totalBudget = (a: ParsedActivity) => {
    return (a.transactions || []).reduce((sum, t) => sum + (t.value || 0), 0)
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by IATI ID or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'valid', 'warnings', 'errors'] as FilterStatus[]).map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : status === 'valid' ? 'Valid' : status === 'warnings' ? 'Warnings' : 'Errors'}
            </Button>
          ))}
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900">{selectedIds.size}</span> of{' '}
          <span className="font-semibold">{activities.length}</span> activities selected for import
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_200px_100px_120px_80px] gap-2 px-4 py-3 border-b bg-gray-50 text-xs font-medium text-gray-500 uppercase">
            <div />
            <button className="text-left hover:text-gray-700" onClick={() => toggleSort('id')}>
              Activity Title and IATI Identifier {sortField === 'id' && (sortAsc ? '↑' : '↓')}
            </button>
            <button className="text-left hover:text-gray-700" onClick={() => toggleSort('title')}>
              Planned Start/End Dates
            </button>
            <button className="text-right hover:text-gray-700" onClick={() => toggleSort('transactions')}>
              Transactions {sortField === 'transactions' && (sortAsc ? '↑' : '↓')}
            </button>
            <button className="text-right hover:text-gray-700 w-full" onClick={() => toggleSort('budget')}>
              Budget {sortField === 'budget' && (sortAsc ? '↑' : '↓')}
            </button>
            <button className="text-center hover:text-gray-700" onClick={() => toggleSort('status')}>
              Status {sortField === 'status' && (sortAsc ? '↑' : '↓')}
            </button>
          </div>

          {/* Table Body */}
          <ScrollArea className="h-[440px]">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No activities match your filters</div>
            ) : (
              filteredActivities.map((activity) => {
                const isExpanded = expandedRow === activity.iatiIdentifier
                const hasErrors = activity.validationIssues?.some(i => i.severity === 'error')
                const hasWarnings = activity.validationIssues?.some(i => i.severity === 'warning')

                return (
                  <div key={activity.iatiIdentifier} className="border-b last:border-b-0">
                    <div className="grid grid-cols-[40px_1fr_200px_100px_120px_80px] gap-2 px-4 py-3 items-center hover:bg-gray-50">
                      <Checkbox
                        checked={selectedIds.has(activity.iatiIdentifier)}
                        onCheckedChange={() => toggleSelection(activity.iatiIdentifier)}
                      />
                      <div
                        className="cursor-pointer min-w-0"
                        onClick={() => setExpandedRow(isExpanded ? null : activity.iatiIdentifier)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm">
                              {activity.title || 'Untitled'}
                              {' '}
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs text-gray-600 font-normal whitespace-nowrap">{activity.iatiIdentifier}</span>
                              {activity.matched && (
                                <span title="Exists in database" className="inline-flex ml-1.5 align-middle"><Database className="h-3 w-3 text-blue-500" /></span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const formatDate = (dateStr: string) => {
                            const d = new Date(dateStr)
                            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          }
                          return (
                            <>
                              {activity.planned_start_date && (
                                <span>{formatDate(activity.planned_start_date)}</span>
                              )}
                              {activity.planned_start_date && activity.planned_end_date && ' → '}
                              {activity.planned_end_date && (
                                <span>{formatDate(activity.planned_end_date)}</span>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      <div className="text-right text-sm">
                        {(activity.transactions || []).length}
                      </div>
                      <div className="text-right text-sm font-medium">
                        {totalBudget(activity) > 0
                          ? `$${totalBudget(activity).toLocaleString()}`
                          : '-'}
                      </div>
                      <div className="text-center">
                        {hasErrors ? (
                          <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        ) : hasWarnings ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Row Detail */}
                    {isExpanded && (
                      <div className="px-12 py-4 bg-gray-50 border-t text-sm">
                        {/* Description - full width */}
                        {activity.description && (
                          <div className="mb-4">
                            <span className="font-medium text-gray-700">Description</span>
                            <p className="text-gray-600 mt-1">{activity.description}</p>
                          </div>
                        )}

                        {/* 3 column grid */}
                        <div className="grid grid-cols-3 gap-6">
                          {/* Column 1: Dates, Status, Hierarchy */}
                          <div className="space-y-3">
                            {(activity.status || activity.activity_status) && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Status</span>
                                <p className="text-gray-600 mt-0.5">
                                  {(() => {
                                    const statusCode = activity.status || activity.activity_status
                                    const statusNames: Record<string, string> = {
                                      '1': 'Pipeline/Identification',
                                      '2': 'Implementation',
                                      '3': 'Finalisation',
                                      '4': 'Closed',
                                      '5': 'Cancelled',
                                      '6': 'Suspended',
                                    }
                                    return (
                                      <>
                                        <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 mr-1.5">{statusCode}</span>
                                        {statusNames[statusCode || ''] || statusCode}
                                      </>
                                    )
                                  })()}
                                </p>
                              </div>
                            )}

                            {activity.hierarchy != null && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Hierarchy Level</span>
                                <p className="text-gray-600 mt-0.5">
                                  {(() => {
                                    const hierarchyNames: Record<number, string> = {
                                      1: 'Parent',
                                      2: 'Sub-Activity',
                                    }
                                    return (
                                      <>
                                        <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 mr-1.5">{activity.hierarchy}</span>
                                        {hierarchyNames[activity.hierarchy] || `Level ${activity.hierarchy}`}
                                      </>
                                    )
                                  })()}
                                </p>
                              </div>
                            )}

                            {/* DAC/CRS Classification Fields */}
                            {(activity.collaborationType || activity.defaultAidType || activity.defaultFinanceType || activity.defaultFlowType || activity.defaultTiedStatus) && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Classification</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Type</th>
                                      <th className="font-medium py-1">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.collaborationType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Collaboration Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">{activity.collaborationType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '1': 'Bilateral', '2': 'Multilateral (inflows)', '3': 'Bilateral, core contributions', '4': 'Multilateral outflows', '6': 'Private sector outflows', '7': 'Bilateral, ex-post reporting', '8': 'Bilateral, triangular co-operation' }
                                            return names[activity.collaborationType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultAidType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Aid Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">{activity.defaultAidType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { 'A01': 'General budget support', 'A02': 'Sector budget support', 'B01': 'Core support to NGOs', 'B02': 'Core contributions to multilaterals', 'B03': 'Contributions to specific programmes', 'B04': 'Basket funds', 'C01': 'Project-type interventions', 'D01': 'Donor country personnel', 'D02': 'Other technical assistance', 'E01': 'Scholarships in donor country', 'E02': 'Imputed student costs', 'F01': 'Debt relief', 'G01': 'Administrative costs', 'H01': 'Development awareness', 'H02': 'Refugees in donor countries' }
                                            return names[activity.defaultAidType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultFinanceType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Finance Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">{activity.defaultFinanceType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '110': 'Standard grant', '111': 'Subsidies to national private investors', '210': 'Interest subsidy', '211': 'Interest subsidy to national private exporters', '310': 'Capital subscription on deposit basis', '311': 'Capital subscription on encashment basis', '410': 'Aid loan excluding debt reorganisation', '411': 'Investment-related loan to developing country', '412': 'Loan in donor country currency', '413': 'Loan with concession for interest', '414': 'Loan with concession for principal', '421': 'Standard loan', '422': 'Reimbursable grant', '423': 'Bonds', '424': 'Asset-backed securities', '425': 'Other debt securities', '431': 'Subordinated loan', '432': 'Preferred equity', '433': 'Other hybrid instruments', '451': 'Non-banks guaranteed export credits', '452': 'Non-banks non-guaranteed portions', '453': 'Bank export credits', '510': 'Common equity', '511': 'Acquisition of equity not part of joint venture', '512': 'Other acquisition of equity', '520': 'Shares in collective investment vehicles', '530': 'Reinvested earnings', '610': 'Debt forgiveness', '611': 'Debt conversion', '612': 'Debt rescheduling', '613': 'Debt buyback', '614': 'Other debt reduction', '615': 'Debt payment', '616': 'HIPC debt relief', '617': 'Multilateral debt relief', '618': 'Forgiveness of arrears' }
                                            return names[activity.defaultFinanceType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultFlowType && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Flow Type</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">{activity.defaultFlowType}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '10': 'ODA', '20': 'OOF', '21': 'Non-export credit OOF', '22': 'Officially supported export credits', '30': 'Private grants', '35': 'Private market', '36': 'Private FDI', '37': 'Other private flows at market terms', '40': 'Non flow', '50': 'Other flows' }
                                            return names[activity.defaultFlowType] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                    {activity.defaultTiedStatus && (
                                      <tr className="border-t border-gray-100">
                                        <td className="py-1 text-gray-500">Tied Status</td>
                                        <td className="py-1 text-gray-600">
                                          <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">{activity.defaultTiedStatus}</span>
                                          {' '}
                                          {(() => {
                                            const names: Record<string, string> = { '3': 'Partially tied', '4': 'Tied', '5': 'Untied' }
                                            return names[activity.defaultTiedStatus] || ''
                                          })()}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.capitalSpend != null && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Capital Spend</span>
                                <p className="text-gray-600 mt-0.5">
                                  <span className="font-semibold">{activity.capitalSpend}%</span>
                                </p>
                              </div>
                            )}

                            {activity.actual_start_date && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Actual Start
                                </span>
                                <p className="text-gray-600 mt-0.5">
                                  {new Date(activity.actual_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            )}

                            {activity.actual_end_date && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Actual End
                                </span>
                                <p className="text-gray-600 mt-0.5">
                                  {new Date(activity.actual_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            )}

                            {activity.recipientCountries && activity.recipientCountries.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Globe className="h-3 w-3" /> Recipient Countries
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Country</th>
                                      <th className="font-medium py-1 text-right">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...activity.recipientCountries]
                                      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
                                      .map((c, i) => {
                                        const countryName = IATI_COUNTRIES.find(ic => ic.code === c.code)?.name || c.code
                                        const isHomeCountry = c.code === homeCountry
                                        return (
                                          <tr key={i} className={`border-t border-gray-100 ${isHomeCountry ? 'font-semibold' : ''}`}>
                                            <td className={`py-1 ${isHomeCountry ? 'text-gray-900' : 'text-gray-600'}`}>
                                              <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 mr-1.5">{c.code}</span>
                                              {countryName}
                                            </td>
                                            <td className={`py-1 text-right ${isHomeCountry ? 'text-gray-900' : ''}`}>{c.percentage != null ? `${c.percentage}%` : '-'}</td>
                                          </tr>
                                        )
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.locations && activity.locations.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> Locations
                                </span>
                                <div className="mt-1 space-y-1">
                                  {activity.locations.slice(0, 3).map((loc, i) => (
                                    <p key={i} className="text-xs text-gray-600">
                                      {loc.name || 'Unnamed'}
                                      {loc.coordinates && (
                                        <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 ml-1.5">
                                          {loc.coordinates.latitude.toFixed(2)}, {loc.coordinates.longitude.toFixed(2)}
                                        </span>
                                      )}
                                    </p>
                                  ))}
                                  {activity.locations.length > 3 && (
                                    <p className="text-xs text-gray-500">+ {activity.locations.length - 3} more</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Column 2: Organizations, Sectors */}
                          <div className="space-y-3">
                            {activity.participatingOrgs && activity.participatingOrgs.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Organizations</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Role</th>
                                      <th className="font-medium py-1">Type</th>
                                      <th className="font-medium py-1">Name</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.participatingOrgs.map((org, i) => {
                                      const roleNames: Record<string, string> = {
                                        '1': 'Funding',
                                        '2': 'Accountable',
                                        '3': 'Extending',
                                        '4': 'Implementing',
                                      }
                                      const orgTypeNames: Record<string, string> = {
                                        '10': 'Government',
                                        '15': 'Other Public Sector',
                                        '21': 'International NGO',
                                        '22': 'National NGO',
                                        '23': 'Regional NGO',
                                        '30': 'Public Private Partnership',
                                        '40': 'Multilateral',
                                        '60': 'Foundation',
                                        '70': 'Private Sector',
                                        '80': 'Academic/Training/Research',
                                        '90': 'Other',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 mr-1.5">{org.role}</span>
                                            {roleNames[org.role] || org.role}
                                          </td>
                                          <td className="py-1 text-gray-600">
                                            {org.type ? (
                                              <>
                                                <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 mr-1">{org.type}</span>
                                                {orgTypeNames[org.type] || ''}
                                              </>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-gray-600">{org.name}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {activity.sectors && activity.sectors.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Sectors</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Sector</th>
                                      <th className="font-medium py-1 text-right">%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.sectors.map((s, i) => {
                                      const vocabNames: Record<string, string> = {
                                        '1': 'DAC 5',
                                        '2': 'DAC 3',
                                        '3': 'COFOG',
                                        '7': 'SDG Goal',
                                        '8': 'SDG Target',
                                        '9': 'SDG Indicator',
                                        '99': 'ORG',
                                      }
                                      const vocabLabel = s.vocabulary ? vocabNames[s.vocabulary] || `V${s.vocabulary}` : ''
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            {vocabLabel && (
                                              <>
                                                <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded font-mono text-[10px]">{vocabLabel}</span>
                                                {' '}
                                              </>
                                            )}
                                            <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600">{s.code}</span>
                                            {' '}
                                            {s.name || s.code}
                                          </td>
                                          <td className="py-1 text-right">{s.percentage != null ? `${s.percentage}%` : '-'}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Column 3: Transactions, Budgets */}
                          <div className="space-y-3">
                            {activity.transactions && activity.transactions.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Transactions</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Type</th>
                                      <th className="font-medium py-1 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.transactions.slice(0, 5).map((tx, i) => {
                                      const txTypeNames: Record<string, string> = {
                                        '1': 'Incoming Funds',
                                        '2': 'Outgoing Commitment',
                                        '3': 'Disbursement',
                                        '4': 'Expenditure',
                                        '5': 'Interest Payment',
                                        '6': 'Loan Repayment',
                                        '7': 'Reimbursement',
                                        '8': 'Purchase of Equity',
                                        '9': 'Sale of Equity',
                                        '10': 'Credit Guarantee',
                                        '11': 'Incoming Commitment',
                                        '12': 'Outgoing Pledge',
                                        '13': 'Incoming Pledge',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 mr-1.5">{tx.type}</span>
                                            {txTypeNames[tx.type] || tx.type}
                                          </td>
                                          <td className="py-1 text-right font-medium">{tx.currency} {tx.value?.toLocaleString()}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {activity.transactions.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.transactions.length - 5} more</p>
                                )}
                              </div>
                            )}

                            {activity.budgets && activity.budgets.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <Wallet className="h-3 w-3" /> Budgets
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Period</th>
                                      <th className="font-medium py-1 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.budgets.slice(0, 5).map((b, i) => (
                                      <tr key={i} className="border-t border-gray-100">
                                        <td className="py-1 text-gray-600">
                                          {b.periodStart && new Date(b.periodStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                          {b.periodStart && b.periodEnd && ' - '}
                                          {b.periodEnd && new Date(b.periodEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-1 text-right font-medium">{b.currency} {b.value?.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {activity.budgets.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.budgets.length - 5} more</p>
                                )}
                              </div>
                            )}

                            {activity.plannedDisbursements && activity.plannedDisbursements.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase">Planned Disbursements</span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Period</th>
                                      <th className="font-medium py-1 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.plannedDisbursements.slice(0, 5).map((pd, i) => {
                                      const pdTypeNames: Record<string, string> = {
                                        '1': 'Original',
                                        '2': 'Revised',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1 text-gray-600">
                                            {pd.type && (
                                              <span className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-600 mr-1.5" title={pdTypeNames[pd.type] || pd.type}>
                                                {pdTypeNames[pd.type] || pd.type}
                                              </span>
                                            )}
                                            {pd.periodStart && new Date(pd.periodStart).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                            {pd.periodStart && pd.periodEnd && ' - '}
                                            {pd.periodEnd && new Date(pd.periodEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                          </td>
                                          <td className="py-1 text-right font-medium">{pd.currency} {pd.value?.toLocaleString()}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {activity.plannedDisbursements.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.plannedDisbursements.length - 5} more</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contacts and Documents - 2 column grid below main grid */}
                        {((activity.contacts && activity.contacts.length > 0) || (activity.documents && activity.documents.length > 0)) && (
                          <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t">
                            {/* Contacts */}
                            {activity.contacts && activity.contacts.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <User className="h-3 w-3" /> Contacts
                                </span>
                                <div className="mt-1 space-y-2">
                                  {activity.contacts.slice(0, 3).map((contact, i) => {
                                    const contactTypeNames: Record<string, string> = {
                                      '1': 'General Enquiries',
                                      '2': 'Project Management',
                                      '3': 'Financial Management',
                                      '4': 'Communications',
                                    }
                                    return (
                                      <div key={i} className="text-xs bg-white border border-gray-100 rounded p-2">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            {contact.personName && (
                                              <p className="font-medium text-gray-900">{contact.personName}</p>
                                            )}
                                            {contact.jobTitle && (
                                              <p className="text-gray-500">{contact.jobTitle}</p>
                                            )}
                                            {contact.organisationName && (
                                              <p className="text-gray-600">{contact.organisationName}</p>
                                            )}
                                          </div>
                                          {contact.type && (
                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500">
                                              {contactTypeNames[contact.type] || `Type ${contact.type}`}
                                            </span>
                                          )}
                                        </div>
                                        <div className="mt-1 space-y-0.5 text-gray-600">
                                          {contact.email && (
                                            <p className="flex items-center gap-1">
                                              <span className="text-gray-400">Email:</span> {contact.email}
                                            </p>
                                          )}
                                          {contact.telephone && (
                                            <p className="flex items-center gap-1">
                                              <span className="text-gray-400">Tel:</span> {contact.telephone}
                                            </p>
                                          )}
                                          {contact.website && (
                                            <p className="flex items-center gap-1">
                                              <span className="text-gray-400">Web:</span>
                                              <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">
                                                {contact.website.replace(/^https?:\/\//, '')}
                                              </a>
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {activity.contacts.length > 3 && (
                                    <p className="text-xs text-gray-500">+ {activity.contacts.length - 3} more</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Documents */}
                            {activity.documents && activity.documents.length > 0 && (
                              <div>
                                <span className="font-medium text-gray-700 text-xs uppercase flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> Documents
                                </span>
                                <table className="mt-1 w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-gray-500">
                                      <th className="font-medium py-1">Title</th>
                                      <th className="font-medium py-1">Format</th>
                                      <th className="font-medium py-1 w-8"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activity.documents.slice(0, 5).map((doc, i) => {
                                      const docCategoryNames: Record<string, string> = {
                                        'A01': 'Pre/Post-Project Assessment',
                                        'A02': 'Objectives/Purposes',
                                        'A03': 'Intended Beneficiaries',
                                        'A04': 'Conditions',
                                        'A05': 'Budget',
                                        'A06': 'Summary Information',
                                        'A07': 'Review of Project Performance',
                                        'A08': 'Results/Outcomes',
                                        'A09': 'Memorandum of Understanding',
                                        'A10': 'Tender',
                                        'A11': 'Contract',
                                        'A12': 'Activity Web Page',
                                        'B01': 'Annual Report',
                                        'B02': 'Strategy Paper',
                                        'B03': 'Country Strategy Paper',
                                      }
                                      return (
                                        <tr key={i} className="border-t border-gray-100">
                                          <td className="py-1.5 text-gray-600">
                                            <div className="max-w-[200px]">
                                              <p className="truncate font-medium">{doc.title || 'Untitled'}</p>
                                              {doc.categoryCode && (
                                                <span className="text-[10px] text-gray-400">
                                                  {docCategoryNames[doc.categoryCode] || doc.categoryCode}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-1.5 text-gray-500">
                                            {doc.format && (
                                              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                                {doc.format.replace('application/', '').replace('text/', '').toUpperCase()}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-1.5">
                                            <a
                                              href={doc.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800"
                                              title="Open document"
                                            >
                                              <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {activity.documents.length > 5 && (
                                  <p className="text-xs text-gray-500 mt-1">+ {activity.documents.length - 5} more</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Validation Issues - full width below grid */}
                        {activity.validationIssues && activity.validationIssues.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <span className="font-medium text-gray-700 text-xs uppercase">Validation Issues</span>
                            <div className="mt-1 space-y-1">
                              {activity.validationIssues.map((issue, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  {issue.severity === 'error' ? (
                                    <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                                  ) : issue.severity === 'warning' ? (
                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                  )}
                                  <span>[{issue.field}] {issue.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
