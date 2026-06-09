"use client"

import { RequiredDot } from "@/components/ui/required-dot";
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
  getSortIcon,
  sortableHeaderClasses,
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
import { useConfirmDialog } from '@/hooks/use-confirm-dialog'
import { useSystemSettings } from '@/contexts/SystemSettingsContext'
import { Plus, Pencil, Trash2, AlertCircle, Info, Loader2, BarChart3, Table as TableIcon, HelpCircle, ChevronDown, X, RefreshCw, MapPin } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed'
import { cn } from '@/lib/utils'
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
import { formatCurrencyPrecise } from '@/lib/format'

interface OrganizationFundingEnvelopeTabProps {
  organizationId: string
  readOnly?: boolean
}

export default function OrganizationFundingEnvelopeTab({
  organizationId,
  readOnly = false
}: OrganizationFundingEnvelopeTabProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const { settings } = useSystemSettings()
  // The AIMS deployment country — every funding envelope is an annual budget
  // for this country (IATI recipient-country-budget).
  const deploymentCountryName = settings?.homeCountryData?.name || settings?.homeCountry || 'this country'
  const [envelopes, setEnvelopes] = useState<OrganizationFundingEnvelope[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingEnvelope, setEditingEnvelope] = useState<OrganizationFundingEnvelope | null>(null)
  // Raw string for the amount input so in-progress decimals (e.g. "12.0") aren't
  // stripped while typing; reformatted with thousands separators on blur.
  const [amountInput, setAmountInput] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [modalExchangeRateManual, setModalExchangeRateManual] = useState(false)
  const [modalExchangeRate, setModalExchangeRate] = useState<number | null>(null)
  const [isLoadingModalRate, setIsLoadingModalRate] = useState(false)
  const [modalRateError, setModalRateError] = useState<string | null>(null)
  
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
          className="ml-1 text-muted-foreground hover:text-muted-foreground focus:outline-none"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-helper leading-relaxed">
        {FIELD_HELP_TEXTS[helpKey]}
      </TooltipContent>
    </Tooltip>
  )

  // Open modal for add/edit
  const openModal = (envelope?: OrganizationFundingEnvelope) => {
    if (envelope) {
      setEditingEnvelope({ ...envelope })
      setAmountInput(envelope.amount ? formatNumberWithCommas(envelope.amount) : '')
    } else {
      setAmountInput('')
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
        status: 'indicative',
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

    if (!editingEnvelope.amount || editingEnvelope.amount <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }

    if (!editingEnvelope.currency) {
      errors.currency = 'Currency is required'
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

      // Send the rate shown in the modal (auto-fetched or manually entered) so
      // the saved USD value matches the preview. For USD, or when no rate is
      // available, the server falls back to its own conversion.
      const payload = {
        ...editingEnvelope,
        exchange_rate_used:
          editingEnvelope.currency !== 'USD' && modalExchangeRate && modalExchangeRate > 0
            ? modalExchangeRate
            : null
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    if (!(await confirm({ title: 'Delete funding envelope?', description: 'This action cannot be undone.', confirmLabel: 'Delete', cancelLabel: 'Cancel' }))) {
      return
    }

    try {
      setDeleteLoading(envelopeId)
      const response = await fetch(
        `/api/organizations/${organizationId}/funding-envelopes?envelopeId=${envelopeId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to delete funding envelope')
      }

      setEnvelopes(prev => prev.filter(e => e.id !== envelopeId))
      toast('Funding envelope deleted')
    } catch (error: any) {
      console.error('[Funding Envelope Tab] Error deleting:', error)
      toast.error(error?.message || 'Failed to delete funding envelope')
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
  // Fetch exchange rate for modal
  const fetchModalExchangeRate = useCallback(async () => {
    if (!editingEnvelope) return
    const currency = editingEnvelope.currency
    if (!currency) return

    if (currency === 'USD') {
      setModalExchangeRate(1)
      setModalRateError(null)
      return
    }

    // Mirror the server's conversion-date logic: value_date when set, else
    // Jan 1 of year_start. This keeps the modal preview equal to the stored value.
    const conversionDate = editingEnvelope.value_date
      ? new Date(editingEnvelope.value_date)
      : new Date(editingEnvelope.year_start, 0, 1)

    setIsLoadingModalRate(true)
    setModalRateError(null)
    try {
      const result = await fixedCurrencyConverter.convertToUSD(1, currency, conversionDate)
      if (result.success && result.exchange_rate) {
        setModalExchangeRate(result.exchange_rate)
        setModalRateError(null)
      } else {
        setModalRateError(result.error || 'Failed to fetch exchange rate')
        setModalExchangeRate(null)
      }
    } catch (err) {
      console.error('[FundingEnvelope] Error fetching exchange rate:', err)
      setModalRateError('Failed to fetch exchange rate')
      setModalExchangeRate(null)
    } finally {
      setIsLoadingModalRate(false)
    }
  }, [editingEnvelope?.currency, editingEnvelope?.value_date, editingEnvelope?.year_start])

  // Calculated USD value
  const modalCalculatedUsdValue = editingEnvelope?.amount && modalExchangeRate
    ? Math.round(editingEnvelope.amount * modalExchangeRate * 100) / 100
    : null

  // Auto-fetch exchange rate when currency or date changes (only if not manual)
  useEffect(() => {
    if (!modalExchangeRateManual && editingEnvelope?.currency) {
      if (editingEnvelope.currency === 'USD') {
        setModalExchangeRate(1)
        setModalRateError(null)
      } else {
        // Fetch using value_date when set, else the Jan-1 fallback (matches server)
        fetchModalExchangeRate()
      }
    }
  }, [editingEnvelope?.currency, editingEnvelope?.value_date, editingEnvelope?.year_start, modalExchangeRateManual, fetchModalExchangeRate])

  // Reset exchange rate state when modal opens
  useEffect(() => {
    if (showModal && editingEnvelope) {
      setModalExchangeRateManual(false)
      setModalExchangeRate(null)
      setModalRateError(null)
    }
  }, [showModal, editingEnvelope?.id])

  const formatCurrency = (amount: number | null | undefined, currency: string = 'USD') => {
    if (amount === null || amount === undefined) return 'N/A'
    return formatCurrencyPrecise(amount, currency)
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

  // Sortable columns. Default: by Period, most recent first.
  type EnvelopeSortField = 'category' | 'period' | 'amount' | 'valueDate' | 'usd' | 'status'
  const [sortField, setSortField] = useState<EnvelopeSortField>('period')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: EnvelopeSortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      // Period and amount feel most useful descending first; text columns ascending.
      setSortDirection(field === 'period' || field === 'amount' || field === 'usd' ? 'desc' : 'asc')
    }
  }

  // Return a comparable value for a given column.
  const getSortValue = (envelope: OrganizationFundingEnvelope, field: EnvelopeSortField): number | string => {
    switch (field) {
      case 'category': {
        const order = { past: 0, current: 1, future: 2 }
        return order[getTemporalCategory(envelope, currentYear)]
      }
      case 'period':
        return envelope.year_end || envelope.year_start
      case 'amount':
        return envelope.amount_usd ?? envelope.amount ?? 0
      case 'usd':
        return envelope.amount_usd ?? 0
      case 'valueDate':
        return envelope.value_date ? new Date(envelope.value_date).getTime() : 0
      case 'status':
        return ENVELOPE_STATUSES.find(s => s.value === envelope.status)?.label || envelope.status || ''
      default:
        return 0
    }
  }

  const sortedEnvelopes = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...envelopes].sort((a, b) => {
      const av = getSortValue(a, sortField)
      const bv = getSortValue(b, sortField)
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv))
      }
      if (cmp !== 0) return dir * cmp
      // Stable tie-break: most recent period first.
      return (b.year_end || b.year_start) - (a.year_end || a.year_start)
    })
  }, [envelopes, currentYear, sortField, sortDirection])

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
                  <CardTitle className="text-lg">Annual Country Budgets</CardTitle>
                  <p className="text-body text-muted-foreground mt-1">
                    Record annual organisation-level budgets for {deploymentCountryName}
                  </p>
                </div>
                {!readOnly && (
                  <Button onClick={() => openModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2 py-2">
                  <div className="flex gap-3 px-3 py-2 border-b border-border">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3 px-3 py-3">
                      {[...Array(5)].map((_, j) => (
                        <Skeleton key={j} className="h-4 flex-1" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : sortedEnvelopes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-body mb-2">No funding envelope entries yet.</p>
                  {!readOnly && (
                    <p className="text-body">Click &quot;Add Entry&quot; to add a funding declaration.</p>
                  )}
                </div>
              ) : (
                <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className={sortableHeaderClasses} onClick={() => handleSort('category')}>
                            <div className="flex items-center gap-1">Category {getSortIcon('category', sortField, sortDirection)}</div>
                          </TableHead>
                          <TableHead className={sortableHeaderClasses} onClick={() => handleSort('period')}>
                            <div className="flex items-center gap-1">Period {getSortIcon('period', sortField, sortDirection)}</div>
                          </TableHead>
                          <TableHead className={sortableHeaderClasses} onClick={() => handleSort('amount')}>
                            <div className="flex items-center gap-1">Amount {getSortIcon('amount', sortField, sortDirection)}</div>
                          </TableHead>
                          <TableHead className={sortableHeaderClasses} onClick={() => handleSort('valueDate')}>
                            <div className="flex items-center gap-1">Value Date {getSortIcon('valueDate', sortField, sortDirection)}</div>
                          </TableHead>
                          <TableHead className={sortableHeaderClasses} onClick={() => handleSort('usd')}>
                            <div className="flex items-center gap-1">USD Value {getSortIcon('usd', sortField, sortDirection)}</div>
                          </TableHead>
                          <TableHead className={sortableHeaderClasses} onClick={() => handleSort('status')}>
                            <div className="flex items-center gap-1">Status {getSortIcon('status', sortField, sortDirection)}</div>
                          </TableHead>
                          {!readOnly && <TableHead className="w-[100px] sticky right-0 z-20 bg-surface-muted text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedEnvelopes.map((envelope) => {
                          const category = getTemporalCategoryLabel(envelope)
                          return (
                            <TableRow key={envelope.id} className="group">
                              <TableCell>
                                {category}
                              </TableCell>
                              <TableCell>
                                {formatYearRange(envelope)}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatCurrency(envelope.amount, envelope.currency)}
                                </div>
                              </TableCell>
                              <TableCell className="text-body">
                                {envelope.value_date ? (
                                  new Date(envelope.value_date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {envelope.amount_usd ? (
                                  <div className="font-medium">
                                    {formatCurrency(envelope.amount_usd, 'USD')}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {ENVELOPE_STATUSES.find(s => s.value === envelope.status)?.label || envelope.status}
                              </TableCell>
                              {!readOnly && (
                                <TableCell className="sticky right-0 z-10 bg-card">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openModal(envelope)}
                                      disabled={deleteLoading === envelope.id}
                                      className="h-8 w-8 hover:bg-muted"
                                      title="Edit envelope"
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => envelope.id && handleDelete(envelope.id)}
                                      disabled={deleteLoading === envelope.id}
                                      className="h-8 w-8 hover:bg-destructive/10 text-destructive hover:text-destructive"
                                      title="Delete envelope"
                                    >
                                      {deleteLoading === envelope.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
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
                {/* Country context — every envelope is an annual budget for the
                    AIMS deployment country (IATI recipient-country-budget). */}
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-body text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>Annual budget for <span className="font-medium text-foreground">{deploymentCountryName}</span></span>
                </div>

                {/* Year Type */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label>Year Type <RequiredDot /></Label>
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

                {/* Budget Year — annual budgets only (single year/period) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Budget Year <RequiredDot /></Label>
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
                      <p className="text-body text-destructive">{fieldErrors.year_start}</p>
                    )}
                  </div>
                </div>

                {/* Amount, Currency, and Value Date Row */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Amount <RequiredDot /></Label>
                      <HelpIcon helpKey="amount" />
                    </div>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => {
                        // Allow digits and a single decimal point while typing
                        const cleaned = e.target.value.replace(/[^0-9.]/g, '')
                        const parts = cleaned.split('.')
                        const normalized = parts.length > 2
                          ? `${parts[0]}.${parts.slice(1).join('')}`
                          : cleaned
                        setAmountInput(normalized)
                        updateField('amount', parseFloat(normalized) || 0)
                      }}
                      onBlur={() => {
                        setAmountInput(editingEnvelope.amount ? formatNumberWithCommas(editingEnvelope.amount) : '')
                      }}
                      placeholder="0"
                    />
                    {fieldErrors.amount && (
                      <p className="text-body text-destructive">{fieldErrors.amount}</p>
                    )}
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Currency <RequiredDot /></Label>
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
                      <p className="text-body text-destructive">{fieldErrors.currency}</p>
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

                {/* Exchange Rate & USD Value */}
                {editingEnvelope.currency && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between min-h-[24px]">
                        <Label className="flex items-center gap-1.5 text-body font-medium">
                          Exchange Rate
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-body">The exchange rate used to convert the funding envelope value to USD. Automatically fetched from historical rates based on the value date. Toggle the switch to enter a manual rate instead.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        {editingEnvelope.currency !== 'USD' && (
                          <div className="flex items-center gap-2">
                            <Label htmlFor="envelope_exchange_rate_mode" className="text-helper text-muted-foreground cursor-pointer">
                              {modalExchangeRateManual ? 'Manual' : 'Auto'}
                            </Label>
                            <Switch
                              id="envelope_exchange_rate_mode"
                              checked={!modalExchangeRateManual}
                              onCheckedChange={(checked) => {
                                setModalExchangeRateManual(!checked)
                                if (checked) {
                                  fetchModalExchangeRate()
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.000001"
                          value={modalExchangeRate || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            setModalExchangeRate(isNaN(value) ? null : value)
                          }}
                          disabled={!modalExchangeRateManual || isLoadingModalRate || editingEnvelope.currency === 'USD'}
                          className={cn(
                            (!modalExchangeRateManual || editingEnvelope.currency === 'USD') && 'bg-muted cursor-not-allowed'
                          )}
                          placeholder={isLoadingModalRate ? 'Loading...' : 'Enter rate'}
                        />
                        {isLoadingModalRate && (
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {!isLoadingModalRate && !modalExchangeRateManual && editingEnvelope.currency !== 'USD' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 p-0"
                            onClick={fetchModalExchangeRate}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                        {modalExchangeRate != null && editingEnvelope.currency !== 'USD' && !isLoadingModalRate && (
                          <span className="absolute right-10 top-2.5 text-helper text-muted-foreground select-all cursor-text">
                            1 {editingEnvelope.currency} = {modalExchangeRate.toFixed(6)} USD
                          </span>
                        )}
                      </div>
                      {modalRateError && (
                        <p className="text-helper text-destructive">{modalRateError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center min-h-[24px]">
                        <Label className="flex items-center gap-1.5 text-body font-medium">
                          USD Value
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-body">The funding envelope value converted to US Dollars using the exchange rate shown. This is calculated automatically from the original value and exchange rate.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                      </div>
                      <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center text-body">
                        {modalCalculatedUsdValue !== null ? (
                          <>$ {modalCalculatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status — IATI recipient-country-budget @status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Status <RequiredDot /></Label>
                      <HelpIcon helpKey="status" />
                    </div>
                    <Select
                      value={editingEnvelope.status}
                      onValueChange={(value: 'indicative' | 'committed') => updateField('status', value)}
                    >
                      <SelectTrigger className="h-auto min-h-[40px]">
                        <span className="text-left py-1">
                          <span className="block">{selectedStatus?.label}</span>
                          <span className="block text-helper text-muted-foreground">{selectedStatus?.description}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {ENVELOPE_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value} className="py-2">
                            <div className="text-left">
                              <div className="font-medium">{status.label}</div>
                              <div className="text-helper text-muted-foreground">{status.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.status && (
                      <p className="text-body text-destructive">{fieldErrors.status}</p>
                    )}
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
      <ConfirmDialog />
    </div>
  )
}




