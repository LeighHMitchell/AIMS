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
import { Plus, Edit2, Trash2, AlertCircle, Info, Loader2, BarChart3, Table as TableIcon } from 'lucide-react'
import { toast } from 'sonner'
import OrganizationFundingVisualization from './OrganizationFundingVisualization'
import {
  OrganizationFundingEnvelope,
  FLOW_DIRECTIONS,
  ORGANIZATION_ROLES,
  FUNDING_TYPE_FLAGS,
  ENVELOPE_STATUSES,
  CONFIDENCE_LEVELS,
  getTemporalCategory,
  FundingTypeFlag
} from '@/types/organization-funding-envelope'
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

  // Open modal for add/edit
  const openModal = (envelope?: OrganizationFundingEnvelope) => {
    if (envelope) {
      setEditingEnvelope({ ...envelope })
    } else {
      setEditingEnvelope({
        organization_id: organizationId,
        period_type: 'single_year',
        year_start: currentYear,
        year_end: null,
        amount: 0,
        currency: 'USD',
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
    if (!editingEnvelope) return

    setEditingEnvelope({
      ...editingEnvelope,
      [field]: value
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

  // Toggle funding type flag
  const toggleFundingTypeFlag = (flag: FundingTypeFlag) => {
    if (!editingEnvelope) return

    const currentFlags = editingEnvelope.funding_type_flags || []
    const newFlags = currentFlags.includes(flag)
      ? currentFlags.filter(f => f !== flag)
      : [...currentFlags, flag]

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
                        year_start: currentYear,
                        year_end: null,
                        amount: 0,
                        currency: 'USD',
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : sortedEnvelopes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm mb-2">No funding envelope entries yet.</p>
                  {!readOnly && (
                    <p className="text-sm">Click "Add Entry" to add a funding declaration.</p>
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
                                <Badge 
                                  variant={
                                    category === 'Past' ? 'default' :
                                    category === 'Current' ? 'secondary' : 'outline'
                                  }
                                >
                                  {category}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatYearRange(envelope)}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatCurrency(envelope.amount, envelope.currency)}
                                </div>
                                {envelope.amount_usd && envelope.currency !== 'USD' && (
                                  <div className="text-xs text-gray-500">
                                    ≈ {formatCurrency(envelope.amount_usd, 'USD')}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {FLOW_DIRECTIONS.find(f => f.value === envelope.flow_direction)?.label || envelope.flow_direction}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {ORGANIZATION_ROLES.find(r => r.value === envelope.organization_role)?.label || envelope.organization_role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  envelope.status === 'actual' ? 'default' :
                                  envelope.status === 'current' ? 'secondary' : 'outline'
                                }>
                                  {ENVELOPE_STATUSES.find(s => s.value === envelope.status)?.label || envelope.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {envelope.funding_type_flags && envelope.funding_type_flags.length > 0 ? (
                                    envelope.funding_type_flags.map(flag => (
                                      <Badge key={flag} variant="outline" className="text-xs">
                                        {FUNDING_TYPE_FLAGS.find(f => f.value === flag)?.label || flag}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-400">None</span>
                                  )}
                                </div>
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
                                      <Edit2 className="h-4 w-4" />
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
                                        <Trash2 className="h-4 w-4" />
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
                  {sortedEnvelopes.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Past Total: </span>
                          <span className="font-semibold">
                            {formatCurrency(calculateSubtotal(categorizedEnvelopes.past), 'USD')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Current Total: </span>
                          <span className="font-semibold">
                            {formatCurrency(calculateSubtotal(categorizedEnvelopes.current), 'USD')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Future Total: </span>
                          <span className="font-semibold">
                            {formatCurrency(calculateSubtotal(categorizedEnvelopes.future), 'USD')}
                          </span>
                        </div>
                        <div className="text-right md:text-left">
                          <span className="text-gray-600">All (indicative): </span>
                          <span className="font-semibold">
                            {formatCurrency(
                              calculateSubtotal(categorizedEnvelopes.past) +
                              calculateSubtotal(categorizedEnvelopes.current) +
                              calculateSubtotal(categorizedEnvelopes.future),
                              'USD'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
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
            
            return (
              <div className="space-y-4 py-4">
                {/* Period Type - Full Width */}
                <div className="space-y-2">
                  <Label>Period Type *</Label>
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

                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Year Start */}
                  <div className="space-y-2">
                    <Label>Start Year *</Label>
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
                            {year}
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
                      <Label>End Year *</Label>
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
                                {year}
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

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingEnvelope.amount || ''}
                      onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                    {fieldErrors.amount && (
                      <p className="text-sm text-red-600">{fieldErrors.amount}</p>
                    )}
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label>Currency *</Label>
                    <Select
                      value={editingEnvelope.currency}
                      onValueChange={(value) => updateField('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.currency && (
                      <p className="text-sm text-red-600">{fieldErrors.currency}</p>
                    )}
                  </div>

                  {/* Flow Direction */}
                  <div className="space-y-2">
                    <Label>Flow Direction *</Label>
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
                    <Label>Organisation Role *</Label>
                    <Select
                      value={editingEnvelope.organization_role}
                      onValueChange={(value: 'original_funder' | 'fund_manager' | 'implementer') => 
                        updateField('organization_role', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORGANIZATION_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div>
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

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select
                      value={editingEnvelope.status}
                      onValueChange={(value: 'actual' | 'current' | 'indicative') => updateField('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENVELOPE_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div>
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
                    <Label>Confidence Level (Optional)</Label>
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

                {/* Funding Type Flags - Full Width */}
                <div className="space-y-2">
                  <Label>Funding Type Flags</Label>
                  <div className="space-y-2 border rounded-md p-3">
                    {FUNDING_TYPE_FLAGS.map((flag) => (
                      <div key={flag.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`flag-${flag.value}`}
                          checked={editingEnvelope.funding_type_flags?.includes(flag.value as FundingTypeFlag) || false}
                          onCheckedChange={() => toggleFundingTypeFlag(flag.value as FundingTypeFlag)}
                        />
                        <Label
                          htmlFor={`flag-${flag.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {flag.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes - Full Width */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
