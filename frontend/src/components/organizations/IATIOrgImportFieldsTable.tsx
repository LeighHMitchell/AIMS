"use client"

import React, { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, CheckCircle, X, Search, ChevronDown, ChevronRight, Copy, DollarSign, FileText, Building2, Globe, MapPin } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { IATI_COUNTRIES } from '@/data/iati-countries'

export interface OrgImportField {
  fieldName: string
  iatiPath: string
  currentValue: any
  importValue: any
  selected: boolean
  hasConflict: boolean
  category: 'identification' | 'total-budgets' | 'country-budgets' | 'region-budgets' | 'org-budgets' | 'expenditures' | 'documents'
  isNew?: boolean
  isArrayItem?: boolean
  itemIndex?: number
  itemData?: any
  isHomeCountry?: boolean // True if this is a budget for the AIMS home country
}

interface FieldSection {
  sectionName: string
  fields: OrgImportField[]
}

interface IATIOrgImportFieldsTableProps {
  fields: OrgImportField[]
  sections?: FieldSection[]
  onFieldToggle: (field: OrgImportField, checked: boolean) => void
  onSelectAll?: () => void
  onDeselectAll?: () => void
  xmlContent?: string
  homeCountryCode?: string
}

export function IATIOrgImportFieldsTable({
  fields,
  sections,
  onFieldToggle,
  onSelectAll,
  onDeselectAll,
  xmlContent,
  homeCountryCode
}: IATIOrgImportFieldsTableProps) {
  const allFields = sections ? sections.flatMap(s => s.fields) : fields
  const hasSections = sections && sections.length > 0
  const [searchQuery, setSearchQuery] = useState('')
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['identification', 'country-budgets']))
  const [copiedValues, setCopiedValues] = useState<Set<string>>(new Set())

  // Group fields by category
  const fieldsByCategory = useMemo(() => {
    const grouped: Record<string, OrgImportField[]> = {}
    allFields.forEach(field => {
      if (!grouped[field.category]) {
        grouped[field.category] = []
      }
      grouped[field.category].push(field)
    })
    return grouped
  }, [allFields])

  // Filter fields based on search and conflicts
  const filteredFields = useMemo(() => {
    let filtered = allFields

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(f =>
        f.fieldName.toLowerCase().includes(query) ||
        String(f.currentValue || '').toLowerCase().includes(query) ||
        String(f.importValue || '').toLowerCase().includes(query)
      )
    }

    if (showConflictsOnly) {
      filtered = filtered.filter(f => f.hasConflict)
    }

    return filtered
  }, [allFields, searchQuery, showConflictsOnly])

  // Format value for display
  const formatValue = (value: any, field: OrgImportField): string => {
    if (value === null || value === undefined || value === '') {
      return '(empty)'
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    if (typeof value === 'number') {
      return value.toLocaleString()
    }

    if (typeof value === 'object') {
      if (field.category.includes('budget') && value.value) {
        const currency = value.currency || 'USD'
        const period = value.periodStart && value.periodEnd
          ? `${value.periodStart} to ${value.periodEnd}`
          : ''
        // Format as number only (formatCurrency includes $ symbol, we add currency code separately)
        const formattedValue = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value.value)
        return `${currency} ${formattedValue}${period ? ` (${period})` : ''}`
      }
      return JSON.stringify(value, null, 2)
    }

    return String(value)
  }

  // Get status badge
  const getStatusBadge = (field: OrgImportField) => {
    if (field.isNew) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">NEW</Badge>
    }
    if (field.hasConflict) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">DIFF</Badge>
    }
    return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">SAME</Badge>
  }

  // Copy to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
    setCopiedValues(prev => new Set([...prev, label]))
    setTimeout(() => {
      setCopiedValues(prev => {
        const next = new Set(prev)
        next.delete(label)
        return next
      })
    }, 2000)
  }

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'identification':
        return <Building2 className="h-4 w-4" />
      case 'total-budgets':
      case 'country-budgets':
      case 'region-budgets':
      case 'org-budgets':
        return <DollarSign className="h-4 w-4" />
      case 'expenditures':
        return <DollarSign className="h-4 w-4" />
      case 'documents':
        return <FileText className="h-4 w-4" />
      default:
        return null
    }
  }

  // Get category display name
  const getCategoryDisplayName = (category: string): string => {
    const names: Record<string, string> = {
      'identification': 'Identification',
      'total-budgets': 'Total Budgets',
      'country-budgets': 'Recipient Country Budgets',
      'region-budgets': 'Recipient Region Budgets',
      'org-budgets': 'Recipient Organization Budgets',
      'expenditures': 'Total Expenditures',
      'documents': 'Document Links'
    }
    return names[category] || category
  }

  // Get country name from code
  const getCountryName = (code: string): string => {
    return IATI_COUNTRIES.find(c => c.code === code)?.name || code
  }

  const categoryOrder = ['identification', 'total-budgets', 'country-budgets', 'region-budgets', 'org-budgets', 'expenditures', 'documents']

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={showConflictsOnly}
            onCheckedChange={setShowConflictsOnly}
          />
          <label className="text-sm text-gray-600">Show conflicts only</label>
        </div>
        {onSelectAll && (
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
        )}
        {onDeselectAll && (
          <Button variant="outline" size="sm" onClick={onDeselectAll}>
            Deselect All
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>Import Value</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryOrder.map(category => {
              const categoryFields = fieldsByCategory[category] || []
              if (categoryFields.length === 0) return null

              const isExpanded = expandedCategories.has(category)
              const visibleFields = isExpanded
                ? categoryFields.filter(f => filteredFields.includes(f))
                : []

              return (
                <React.Fragment key={category}>
                  {/* Category Header */}
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={5} className="p-0">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            {getCategoryIcon(category)}
                            <span className="font-medium text-gray-900">
                              {getCategoryDisplayName(category)}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              {categoryFields.length}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {/* Fields in this category */}
                          {visibleFields.map((field, index) => (
                            <TableRow key={`${category}-${field.fieldName}-${index}`} className={field.isHomeCountry ? 'bg-blue-50' : ''}>
                              <TableCell className="w-12">
                                <input
                                  type="checkbox"
                                  checked={field.selected}
                                  onChange={(e) => onFieldToggle(field, e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {field.isHomeCountry && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                            Your Country
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Budget for your AIMS country ({homeCountryCode})</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  <span>{field.fieldName}</span>
                                  {field.iatiPath && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleCopy(field.iatiPath, 'IATI Path')}
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-mono text-xs">{field.iatiPath}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">
                                    {formatValue(field.currentValue, field)}
                                  </span>
                                  {field.currentValue && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleCopy(String(field.currentValue), 'Current Value')}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${field.isNew ? 'text-green-700 font-medium' : field.hasConflict ? 'text-yellow-700 font-medium' : 'text-gray-600'}`}>
                                    {formatValue(field.importValue, field)}
                                  </span>
                                  {field.importValue && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleCopy(String(field.importValue), 'Import Value')}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(field)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              )
            })}

            {filteredFields.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No fields match your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}



