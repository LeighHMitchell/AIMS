"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, AlertCircle, Info, Loader2, BarChart3, Table as TableIcon, HelpCircle, ChevronDown, X } from 'lucide-react'
import { toast } from 'sonner'
import OrganizationFundingVisualization from './OrganizationFundingVisualization'
import {
  OrganizationFundingEnvelope,
  FLOW_DIRECTIONS,
  ORGANIZATION_ROLES,
  FUNDING_TYPE_FLAGS,
  ENVELOPE_STATUSES,
  CONFIDENCE_LEVELS,
  YEAR_TYPES,
  FISCAL_YEAR_START_MONTHS,
  FIELD_HELP_TEXTS,
  getTemporalCategory,
  FundingTypeFlag,
  YearType
} from '@/types/organization-funding-envelope'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getAllCurrenciesWithPinned, type Currency } from '@/data/currencies'

interface OrganizationFundingEnvelopeTabProps {
  organizationId: string
  readOnly?: boolean
}

export default function OrganizationFundingEnvelopeTab({
  organizationId,
  readOnly = false
}: OrganizationFundingEnvelopeTabProps) {
  const [envelopes, setEnvelopes] = useState<OrganizationFundingEnvelope[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingEnvelope, setEditingEnvelope] = useState<OrganizationFundingEnvelope | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  const currencies = useMemo(() => getAllCurrenciesWithPinned(), [])
  const currentYear = new Date().getFullYear()

  // Fetch envelopes
  const fetchEnvelopes = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/organizations/${organizationId}/funding-envelopes`)
      if (!response.ok) {
        throw new Error('Failed to fetch funding envelopes')
      }
      const data = await response.json()
      setEnvelopes(data || [])
    } catch (error) {
      console.error('[Funding Envelope Tab] Error fetching:', error)
      toast.error('Failed to load funding envelopes')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (organizationId) {
      fetchEnvelopes()
    }
  }, [organizationId, fetchEnvelopes])

  // Categorize envelopes by temporal status
  const categorizedEnvelopes = useMemo(() => {
    const past: OrganizationFundingEnvelope[] = []
    const current: OrganizationFundingEnvelope[] = []
    const future: OrganizationFundingEnvelope[] = []

    envelopes.forEach(envelope => {
      const category = getTemporalCategory(envelope, currentYear)
      if (category === 'past') {
        past.push(envelope)
      } else if (category === 'current') {
        current.push(envelope)
      } else {
        future.push(envelope)
      }
    })

    // Sort each category by year (descending)
    const sortByYear = (a: OrganizationFundingEnvelope, b: OrganizationFundingEnvelope) => {
      const aEnd = a.year_end || a.year_start
      const bEnd = b.year_end || b.year_start
      return bEnd - aEnd
    }

    return {
      past: past.sort(sortByYear),
      current: current.sort(sortByYear),
      future: future.sort(sortByYear)
    }
  }, [envelopes, currentYear])

  // Calculate section subtotals
  const calculateSubtotal = (categoryEnvelopes: OrganizationFundingEnvelope[]) => {
    return categoryEnvelopes.reduce((sum, env) => {
      // Use USD amount if available, otherwise use original amount
      const amount = env.amount_usd || env.amount
      return sum + (amount || 0)
    }, 0)
  }

  // Format number with commas for display
  const formatNumberWithCommas = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(num)
  }

  // Parse formatted number back to raw number
  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0
  }

  // Help icon component - uses tabIndex={-1} to prevent focus-triggered tooltips
  const HelpIcon = ({ helpKey }: { helpKey: keyof typeof FIELD_HELP_TEXTS }) => (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
        {FIELD_HELP_TEXTS[helpKey]}
      </TooltipContent>
    </Tooltip>
  )

  // Open modal for add/edit
  const openModal = (envelope?: OrganizationFundingEnvelope) => {
    if (envelope) {
      setEditingEnvelope({ ...envelope })
    } else {
      setEditingEnvelope({
        organization_id: organizationId,
        period_type: 'single_year',
        year_type: 'calendar',
        year_start: currentYear,
        year_end: null,
        fiscal_year_start_month: null,
        amount: 0,
        currency: 'USD',
        value_date: null,
        flow_direction: 'incoming',
        organization_role: 'original_funder',
        funding_type_flags: [],
        status: 'indicative',
        confidence_level: null,
        notes: null
      })
    }
    setFieldErrors({})
    setShowModal(true)
  }

  // Close modal
  const closeModal = () => {
    setShowModal(false)
    setEditingEnvelope(null)
    setFieldErrors({})
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!editingEnvelope) return false

    if (!editingEnvelope.year_start || editingEnvelope.year_start < 1990 || editingEnvelope.year_start > 2100) {
      errors.year_start = 'Valid year (1990-2100) is required'
    }

    if (editingEnvelope.period_type === 'multi_year') {
      if (!editingEnvelope.year_end || editingEnvelope.year_end < editingEnvelope.year_start) {
        errors.year_end = 'End year must be >= start year'
      }
    }

    if (!editingEnvelope.amount || editingEnvelope.amount <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }

    if (!editingEnvelope.currency) {
      errors.currency = 'Currency is required'
    }

    if (!editingEnvelope.organization_role) {
      errors.organization_role = 'Organisation role is required'
    }

    if (!editingEnvelope.status) {
      errors.status = 'Status is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save envelope
  const handleSave = async () => {
    if (!editingEnvelope || !validateForm()) {
      toast.error('Please fix the errors before saving')
      return
    }

    try {
      setSaving(true)
      const isNew = !editingEnvelope.id
      const url = `/api/organizations/${organizationId}/funding-envelopes`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEnvelope)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save funding envelope')
      }

      const saved = await response.json()
      
      if (isNew) {
        setEnvelopes(prev => [...prev, saved])
        toast.success('Funding envelope added')
      } else {
        setEnvelopes(prev => prev.map(e => e.id === saved.id ? saved : e))
        toast.success('Funding envelope updated')
      }

      closeModal()
    } catch (error: any) {
      console.error('[Funding Envelope Tab] Error saving:', error)
      toast.error(error.message || 'Failed to save funding envelope')
    } finally {
      setSaving(false)
    }
  }

  // Delete envelope
  const handleDelete = async (envelopeId: string) => {
    if (!confirm('Are you sure you want to delete this funding envelope?')) {
      return
    }

    try {
      setDeleteLoading(envelopeId)
      const response = await fetch(
        `/api/organizations/${organizationId}/funding-envelopes?envelopeId=${envelopeId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete funding envelope')
      }

      setEnvelopes(prev => prev.filter(e => e.id !== envelopeId))
      toast.success('Funding envelope deleted')
    } catch (error) {
      console.error('[Funding Envelope Tab] Error deleting:', error)
      toast.error('Failed to delete funding envelope')
    } finally {
      setDeleteLoading(null)
    }
  }

  // Update field
  const updateField = (field: string, value: any) => {
    setEditingEnvelope(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [field]: value
      }
    })

    // Clear error for this field
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Toggle funding type flag with mutual exclusivity for budget status
  const toggleFundingTypeFlag = (flag: FundingTypeFlag) => {
    if (!editingEnvelope) return

    const currentFlags = editingEnvelope.funding_type_flags || []
    
    // If removing the flag, just remove it
    if (currentFlags.includes(flag)) {
      updateField('funding_type_flags', currentFlags.filter(f => f !== flag))
      return
    }
    
    // Adding a new flag - handle mutual exclusivity for budget status flags
    const budgetStatusFlags: FundingTypeFlag[] = ['on_budget', 'off_budget', 'unknown']
    let newFlags = [...currentFlags]
    
    // If selecting a budget status flag, remove other budget status flags
    if (budgetStatusFlags.includes(flag)) {
      newFlags = newFlags.filter(f => !budgetStatusFlags.includes(f))
    }
    
    newFlags.push(flag)
    updateField('funding_type_flags', newFlags)
  }

  // Format currency
  const formatCurrency = (amount: number | null | undefined, currency: string = 'USD') => {
    if (amount === null || amount === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format currency compact (e.g., $56.5m, $53.2k)
  const formatCurrencyCompact = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A'
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(1)}b`
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}m`
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(1)}k`
    }
    return `$${amount}`
  }

  // Format year range
  const formatYearRange = (envelope: OrganizationFundingEnvelope) => {
    if (envelope.period_type === 'single_year') {
      return envelope.year_start.toString()
    }
    return `${envelope.year_start} - ${envelope.year_end}`
  }

  // Get temporal category label for an envelope
  const getTemporalCategoryLabel = (envelope: OrganizationFundingEnvelope): string => {
    const category = getTemporalCategory(envelope, currentYear)
    if (category === 'past') return 'Past'
    if (category === 'current') return 'Current'
    return 'Future'
  }

  // Sort all envelopes by year (descending) then by category
  const sortedEnvelopes = useMemo(() => {
    return [...envelopes].sort((a, b) => {
      const aEnd = a.year_end || a.year_start
      const bEnd = b.year_end || b.year_start
      if (bEnd !== aEnd) {
        return bEnd - aEnd
      }
      // If same year, sort by category: Past, Current, Future
      const aCat = getTemporalCategory(a, currentYear)
      const bCat = getTemporalCategory(b, currentYear)
      const order = { past: 0, current: 1, future: 2 }
      return order[aCat] - order[bCat]
    })
  }, [envelopes, currentYear])

  return (
    <div className="space-y-6">
      {/* Non-dismissable info banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Figures in this section represent indicative organisation-level funding from the perspective of this organisation. 
          They are intended for planning and coordination only and must not be aggregated across organisations or treated as national totals.
        </AlertDescription>
      </Alert>

      {/* Sub-tabs for Data Entry and Data View */}
      <Tabs defaultValue="data-entry" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="data-entry">
            <TableIcon className="h-4 w-4 mr-2" />
            Data Entry
          </TabsTrigger>
          <TabsTrigger value="data-view">
            <BarChart3 className="h-4 w-4 mr-2" />
            Data View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data-entry" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Funding Envelopes</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Record past, current, and future organisation-level funding declarations
                  </p>
                </div>
                {!readOnly && (
                  <Button
                    onClick={() => {
                      const newEnvelope: OrganizationFundingEnvelope = {
                        organization_id: organizationId,
                        period_type: 'single_year',
                        year_type: 'calendar',
                        year_start: currentYear,
                        year_end: null,
                        fiscal_year_start_month: null,
                        amount: 0,
                        currency: 'USD',
                        value_date: null,
                        flow_direction: 'incoming',
                        organization_role: 'original_funder',
                        funding_type_flags: [],
                        status: 'indicative',
                        confidence_level: null,
                        notes: null
                      }
                      openModal(newEnvelope)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Hero Cards for Totals */}
              {sortedEnvelopes.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Past</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrencyCompact(calculateSubtotal(categorizedEnvelopes.past))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Current</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrencyCompact(calculateSubtotal(categorizedEnvelopes.current))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Future</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrencyCompact(calculateSubtotal(categorizedEnvelopes.future))}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-blue-600 uppercase tracking-wide">All (indicative)</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {formatCurrencyCompact(
                        calculateSubtotal(categorizedEnvelopes.past) +
                        calculateSubtotal(categorizedEnvelopes.current) +
                        calculateSubtotal(categorizedEnvelopes.future)
                      )}
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : sortedEnvelopes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm mb-2">No funding envelope entries yet.</p>
                  {!readOnly && (
                    <p className="text-sm">Click &quot;Add Entry&quot; to add a funding declaration.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Value Date</TableHead>
                          <TableHead>USD Value</TableHead>
                          <TableHead>Flow</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Funding Types</TableHead>
                          {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedEnvelopes.map((envelope) => {
                          const category = getTemporalCategoryLabel(envelope)
                          return (
                            <TableRow key={envelope.id}>
                              <TableCell>
                                {category}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatYearRange(envelope)}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatCurrency(envelope.amount, envelope.currency)}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {envelope.value_date ? (
                                  new Date(envelope.value_date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {envelope.amount_usd ? (
                                  <div className="font-medium">
                                    {formatCurrency(envelope.amount_usd, 'USD')}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {FLOW_DIRECTIONS.find(f => f.value === envelope.flow_direction)?.label || envelope.flow_direction}
                              </TableCell>
                              <TableCell>
                                {ORGANIZATION_ROLES.find(r => r.value === envelope.organization_role)?.label || envelope.organization_role}
                              </TableCell>
                              <TableCell>
                                {ENVELOPE_STATUSES.find(s => s.value === envelope.status)?.label || envelope.status}
                              </TableCell>
                              <TableCell>
                                {envelope.funding_type_flags && envelope.funding_type_flags.length > 0 ? (
                                  envelope.funding_type_flags
                                    .map(flag => FUNDING_TYPE_FLAGS.find(f => f.value === flag)?.label || flag)
                                    .join(', ')
                                ) : (
                                  <span className="text-gray-400">None</span>
                                )}
                              </TableCell>
                              {!readOnly && (
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openModal(envelope)}
                                      disabled={deleteLoading === envelope.id}
                                    >
                                      <Pencil className="h-4 w-4 text-slate-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => envelope.id && handleDelete(envelope.id)}
                                      disabled={deleteLoading === envelope.id}
                                    >
                                      {deleteLoading === envelope.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-view" className="mt-6">
          <OrganizationFundingVisualization 
            envelopes={envelopes}
          />
        </TabsContent>
      </Tabs>

      {/* Edit/Add Modal */}
      <Dialog open={showModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <TooltipProvider delayDuration={300}>
          <DialogHeader>
            <DialogTitle>
              {editingEnvelope?.id ? 'Edit Funding Envelope' : 'Add Funding Envelope'}
            </DialogTitle>
            <DialogDescription>
              Record indicative organisation-level funding declaration. This data is for planning purposes only.
            </DialogDescription>
          </DialogHeader>

          {editingEnvelope && (() => {
            // Generate year options for dropdown
            const currentYear = new Date().getFullYear()
            const yearOptions = Array.from({ length: 111 }, (_, i) => currentYear - 20 + i) // 20 years ago to 90 years in future

            // Get selected currency details for display
            const selectedCurrency = currencies.find(c => c.code === editingEnvelope.currency)

            // Get selected role details for display
            const selectedRole = ORGANIZATION_ROLES.find(r => r.value === editingEnvelope.organization_role)

            // Get selected status details for display
            const selectedStatus = ENVELOPE_STATUSES.find(s => s.value === editingEnvelope.status)

            // Get fiscal year period label
            const getFiscalYearLabel = (year: number, startMonth: number | null | undefined) => {
              if (!startMonth || startMonth === 1) return year.toString()
              const monthInfo = FISCAL_YEAR_START_MONTHS.find(m => m.value === startMonth)
              return `FY${year} (${monthInfo?.period || ''})`
            }

            return (
              <div className="space-y-4 py-4">
                {/* Period Type and Year Type Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Period Type */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Period Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <HelpIcon helpKey="period_type" />
                    </div>
                    <Select
                      value={editingEnvelope.period_type}
                      onValueChange={(value: 'single_year' | 'multi_year') => {
                        updateField('period_type', value)
                        if (value === 'single_year') {
                          updateField('year_end', null)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_year">Single Year</SelectItem>
                        <SelectItem value="multi_year">Multi-Year Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Year Type */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Year Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <HelpIcon helpKey="year_type" />
                    </div>
                    <Select
                      value={editingEnvelope.year_type || 'calendar'}
                      onValueChange={(value: YearType) => {
                        updateField('year_type', value)
                        if (value === 'calendar') {
                          updateField('fiscal_year_start_month', null)
                        } else if (!editingEnvelope.fiscal_year_start_month) {
                          updateField('fiscal_year_start_month', 4) // Default to April
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fiscal Year Start Month (only when fiscal year is selected) */}
                {editingEnvelope.year_type === 'fiscal' && (
                  <div className="space-y-2">
                    <Label>Fiscal Year Starts In</Label>
                    <Select
                      value={editingEnvelope.fiscal_year_start_month?.toString() || '4'}
                      onValueChange={(value) => updateField('fiscal_year_start_month', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FISCAL_YEAR_START_MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label} ({month.period})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Year Selection Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Year Start */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>{editingEnvelope.period_type === 'multi_year' ? <>Start Year <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></> : <>Year <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></>}</Label>
                      <HelpIcon helpKey="year_start" />
                    </div>
                    <Select
                      value={editingEnvelope.year_start?.toString() || ''}
                      onValueChange={(value) => updateField('year_start', parseInt(value) || 0)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {editingEnvelope.year_type === 'fiscal'
                              ? getFiscalYearLabel(year, editingEnvelope.fiscal_year_start_month)
                              : year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.year_start && (
                      <p className="text-sm text-red-600">{fieldErrors.year_start}</p>
                    )}
                  </div>

                  {/* Year End (only for multi-year) */}
                  {editingEnvelope.period_type === 'multi_year' ? (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Label>End Year <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                        <HelpIcon helpKey="year_end" />
                      </div>
                      <Select
                        value={editingEnvelope.year_end?.toString() || ''}
                        onValueChange={(value) => updateField('year_end', parseInt(value) || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {yearOptions
                            .filter(year => year >= (editingEnvelope.year_start || 1990))
                            .map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {editingEnvelope.year_type === 'fiscal'
                                  ? getFiscalYearLabel(year, editingEnvelope.fiscal_year_start_month)
                                  : year}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.year_end && (
                        <p className="text-sm text-red-600">{fieldErrors.year_end}</p>
                      )}
                    </div>
                  ) : (
                    <div></div>
                  )}
                </div>

                {/* Amount, Currency, and Value Date Row */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Amount <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <HelpIcon helpKey="amount" />
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={editingEnvelope.amount ? formatNumberWithCommas(editingEnvelope.amount) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                        updateField('amount', parseFloat(rawValue) || 0)
                      }}
                      placeholder="0"
                    />
                    {fieldErrors.amount && (
                      <p className="text-sm text-red-600">{fieldErrors.amount}</p>
                    )}
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Currency <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <HelpIcon helpKey="currency" />
                    </div>
                    <Select
                      value={editingEnvelope.currency}
                      onValueChange={(value) => updateField('currency', value)}
                    >
                      <SelectTrigger className="w-full">
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                            {editingEnvelope.currency}
                          </span>
                          <span className="truncate">{selectedCurrency?.name || ''}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                                {currency.code}
                              </span>
                              <span>{currency.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.currency && (
                      <p className="text-sm text-red-600">{fieldErrors.currency}</p>
                    )}
                  </div>

                  {/* Value Date */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Value Date</Label>
                      <HelpIcon helpKey="value_date" />
                    </div>
                    <Input
                      type="date"
                      value={editingEnvelope.value_date || ''}
                      onChange={(e) => updateField('value_date', e.target.value || null)}
                    />
                  </div>
                </div>

                {/* Flow Direction and Organisation Role Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Flow Direction */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Flow Direction <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <HelpIcon helpKey="flow_direction" />
                    </div>
                    <Select
                      value={editingEnvelope.flow_direction}
                      onValueChange={(value: 'incoming' | 'outgoing') => updateField('flow_direction', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FLOW_DIRECTIONS.map((dir) => (
                          <SelectItem key={dir.value} value={dir.value}>
                            {dir.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Organisation Role */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Organisation Role <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <HelpIcon helpKey="organization_role" />
                    </div>
                    <Select
                      value={editingEnvelope.organization_role}
                      onValueChange={(value: 'original_funder' | 'fund_manager' | 'implementer') =>
                        updateField('organization_role', value)
                      }
                    >
                      <SelectTrigger className="h-auto min-h-[40px]">
                        <span className="text-left py-1">
                          <span className="block">{selectedRole?.label}</span>
                          <span className="block text-xs text-gray-500">{selectedRole?.description}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {ORGANIZATION_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value} className="py-2">
                            <div className="text-left">
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-gray-500">{role.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.organization_role && (
                      <p className="text-sm text-red-600">{fieldErrors.organization_role}</p>
                    )}
                  </div>
                </div>

                {/* Status and Confidence Level Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Status <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
                      <HelpIcon helpKey="status" />
                    </div>
                    <Select
                      value={editingEnvelope.status}
                      onValueChange={(value: 'actual' | 'current' | 'indicative') => updateField('status', value)}
                    >
                      <SelectTrigger className="h-auto min-h-[40px]">
                        <span className="text-left py-1">
                          <span className="block">{selectedStatus?.label}</span>
                          <span className="block text-xs text-gray-500">{selectedStatus?.description}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {ENVELOPE_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value} className="py-2">
                            <div className="text-left">
                              <div className="font-medium">{status.label}</div>
                              <div className="text-xs text-gray-500">{status.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.status && (
                      <p className="text-sm text-red-600">{fieldErrors.status}</p>
                    )}
                  </div>

                  {/* Confidence Level */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Confidence Level</Label>
                      <HelpIcon helpKey="confidence_level" />
                    </div>
                    <Select
                      value={editingEnvelope.confidence_level || 'none'}
                      onValueChange={(value: string) => updateField('confidence_level', value === 'none' ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select confidence level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {CONFIDENCE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Funding Type Flags - Full Width Dropdown */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label>Funding Type Flags</Label>
                    <HelpIcon helpKey="funding_type_flags" />
                  </div>
                  <div className="relative">
                    <Select
                      value="_multiselect_placeholder"
                      onValueChange={(value) => {
                        if (value !== '_multiselect_placeholder') {
                          toggleFundingTypeFlag(value as FundingTypeFlag)
                        }
                      }}
                    >
                      <SelectTrigger className="h-auto min-h-[40px] py-2">
                        <div className="flex flex-wrap gap-1 items-center w-full">
                          {editingEnvelope.funding_type_flags && editingEnvelope.funding_type_flags.length > 0 ? (
                            editingEnvelope.funding_type_flags.map(flag => (
                              <Badge
                                key={flag}
                                variant="secondary"
                                className="flex items-center gap-1 pr-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFundingTypeFlag(flag)
                                }}
                              >
                                {FUNDING_TYPE_FLAGS.find(f => f.value === flag)?.label || flag}
                                <X className="h-3 w-3 hover:bg-gray-300 rounded-full cursor-pointer" />
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-500">Select funding types...</span>
                          )}
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {FUNDING_TYPE_FLAGS.map((flag) => {
                          const isSelected = editingEnvelope.funding_type_flags?.includes(flag.value as FundingTypeFlag)
                          return (
                            <SelectItem
                              key={flag.value}
                              value={flag.value}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                  {isSelected && <span className="text-white text-xs">✓</span>}
                                </div>
                                <span>{flag.label}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes - Full Width */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label>Notes</Label>
                    <HelpIcon helpKey="notes" />
                  </div>
                  <Textarea
                    value={editingEnvelope.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value || null)}
                    placeholder="Assumptions, caveats, or explanatory context..."
                    rows={3}
                  />
                </div>
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
          </TooltipProvider>
        </DialogContent>
      </Dialog>
    </div>
  )
}




