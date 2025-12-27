"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Link as LinkIcon, AlertCircle, CheckCircle, Loader2, X, Download, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { parseIATIOrganization, validateIATIOrganizationXML } from '@/lib/iati-organization-parser'
import { IATIOrgImportFieldsTable, OrgImportField } from './IATIOrgImportFieldsTable'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { IATI_COUNTRIES } from '@/data/iati-countries'

interface IATIOrgImportTabProps {
  organizationId: string
  currentOrgData?: any
  onImportComplete?: () => void
}

type ImportMethod = 'file' | 'paste' | 'url'
type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete' | 'error'

export default function IATIOrgImportTab({ organizationId, currentOrgData, onImportComplete }: IATIOrgImportTabProps) {
  const [importMethod, setImportMethod] = useState<ImportMethod>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [xmlContent, setXmlContent] = useState<string>('')
  const [xmlUrl, setXmlUrl] = useState<string>('')
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [parsedOrg, setParsedOrg] = useState<any>(null)
  const [comparisonFields, setComparisonFields] = useState<OrgImportField[]>([])
  const [budgetCoverage, setBudgetCoverage] = useState<any>(null)
  const [importProgress, setImportProgress] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)
  
  const { settings } = useSystemSettings()
  const homeCountryCode = settings?.homeCountry || 'MM'
  const homeCountryName = IATI_COUNTRIES.find(c => c.code === homeCountryCode)?.name || homeCountryCode

  // File dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/xml': ['.xml'],
      'text/xml': ['.xml']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0])
        setImportError(null)
      }
    }
  })

  // Fetch current organization data
  const fetchCurrentOrgData = useCallback(async () => {
    if (!organizationId) return null

    try {
      const response = await fetch(`/api/organizations/${organizationId}`)
      if (!response.ok) throw new Error('Failed to fetch organization')
      return await response.json()
    } catch (error) {
      console.error('Error fetching organization:', error)
      return currentOrgData || null
    }
  }, [organizationId, currentOrgData])

  // Fetch current budgets - returns empty array if endpoint doesn't exist
  const fetchCurrentBudgets = useCallback(async () => {
    if (!organizationId) return []
    // Note: Budgets are managed in-memory via IATIBudgetManager
    // For import comparison, we'll show all imported budgets as "new"
    return []
  }, [organizationId])

  // Fetch current expenditures - returns empty array if endpoint doesn't exist
  const fetchCurrentExpenditures = useCallback(async () => {
    if (!organizationId) return []
    // Note: Expenditures are managed separately
    // For import comparison, we'll show all imported expenditures as "new"
    return []
  }, [organizationId])

  // Fetch current documents - returns empty array if endpoint doesn't exist
  const fetchCurrentDocuments = useCallback(async () => {
    if (!organizationId) return []
    // Note: Documents are managed in-memory via IATIDocumentManager
    // For import comparison, we'll show all imported documents as "new"
    return []
  }, [organizationId])

  // Analyze budget coverage
  const analyzeBudgetCoverage = useCallback((parsed: any) => {
    const homeCountryBudgets = parsed.recipientCountryBudgets?.filter((b: any) => 
      b.recipientCountry?.code === homeCountryCode
    ) || []

    const otherCountryCodes = new Set(
      parsed.recipientCountryBudgets
        ?.filter((b: any) => b.recipientCountry?.code !== homeCountryCode)
        .map((b: any) => b.recipientCountry?.code)
        .filter(Boolean) || []
    )

    return {
      homeCountryCode,
      homeCountryName,
      totalBudgets: {
        available: (parsed.totalBudgets?.length || 0) > 0,
        count: parsed.totalBudgets?.length || 0,
        totalValue: parsed.totalBudgets?.reduce((sum: number, b: any) => sum + (b.value || 0), 0) || 0
      },
      countryBudgets: {
        hasHomeCountryBudget: homeCountryBudgets.length > 0,
        homeCountryBudget: homeCountryBudgets[0] || null,
        otherCountries: Array.from(otherCountryCodes)
      },
      recipientOrgBudgetCount: parsed.recipientOrgBudgets?.length || 0,
      recipientRegionBudgetCount: parsed.recipientRegionBudgets?.length || 0,
      expenditureCount: parsed.totalExpenditures?.length || 0,
      documentCount: parsed.documentLinks?.length || 0
    }
  }, [homeCountryCode, homeCountryName])

  // Build comparison fields
  const buildComparisonFields = useCallback(async (parsed: any) => {
    const currentOrg = await fetchCurrentOrgData()
    const currentBudgets = await fetchCurrentBudgets()
    const currentExpenditures = await fetchCurrentExpenditures()
    const currentDocuments = await fetchCurrentDocuments()

    const fields: OrgImportField[] = []

    // Identification fields
    fields.push({
      fieldName: 'IATI Organization ID',
      iatiPath: 'organisation-identifier',
      currentValue: currentOrg?.iati_org_id || '',
      importValue: parsed.identifier || '',
      selected: false,
      hasConflict: currentOrg?.iati_org_id !== parsed.identifier,
      category: 'identification',
      isNew: !currentOrg?.iati_org_id
    })

    fields.push({
      fieldName: 'Organization Name',
      iatiPath: 'name/narrative',
      currentValue: currentOrg?.name || '',
      importValue: parsed.name || '',
      selected: false,
      hasConflict: currentOrg?.name !== parsed.name,
      category: 'identification',
      isNew: !currentOrg?.name
    })

    fields.push({
      fieldName: 'Reporting Org Reference',
      iatiPath: 'reporting-org/@ref',
      currentValue: currentOrg?.reporting_org_ref || '',
      importValue: parsed.reportingOrg?.ref || '',
      selected: false,
      hasConflict: currentOrg?.reporting_org_ref !== parsed.reportingOrg?.ref,
      category: 'identification',
      isNew: !currentOrg?.reporting_org_ref
    })

    fields.push({
      fieldName: 'Reporting Org Type',
      iatiPath: 'reporting-org/@type',
      currentValue: currentOrg?.reporting_org_type || '',
      importValue: parsed.reportingOrg?.type || '',
      selected: false,
      hasConflict: currentOrg?.reporting_org_type !== parsed.reportingOrg?.type,
      category: 'identification',
      isNew: !currentOrg?.reporting_org_type
    })

    fields.push({
      fieldName: 'Default Currency',
      iatiPath: '@default-currency',
      currentValue: currentOrg?.default_currency || '',
      importValue: parsed.defaultCurrency || '',
      selected: false,
      hasConflict: currentOrg?.default_currency !== parsed.defaultCurrency,
      category: 'identification',
      isNew: !currentOrg?.default_currency
    })

    fields.push({
      fieldName: 'Default Language',
      iatiPath: '@xml:lang',
      currentValue: currentOrg?.default_language || '',
      importValue: parsed.defaultLanguage || '',
      selected: false,
      hasConflict: currentOrg?.default_language !== parsed.defaultLanguage,
      category: 'identification',
      isNew: !currentOrg?.default_language
    })

    // Total budgets
    parsed.totalBudgets?.forEach((budget: any, index: number) => {
      const period = budget.periodStart && budget.periodEnd
        ? `${budget.periodStart} to ${budget.periodEnd}`
        : 'Period not specified'
      
      fields.push({
        fieldName: `Total Budget - ${period}`,
        iatiPath: `total-budget[${index}]`,
        currentValue: null, // Would need to match by period
        importValue: budget,
        selected: false,
        hasConflict: false,
        category: 'total-budgets',
        isNew: true,
        isArrayItem: true,
        itemIndex: index,
        itemData: budget
      })
    })

    // Country budgets
    parsed.recipientCountryBudgets?.forEach((budget: any, index: number) => {
      const countryCode = budget.recipientCountry?.code || 'Unknown'
      const countryName = IATI_COUNTRIES.find(c => c.code === countryCode)?.name || countryCode
      const period = budget.periodStart && budget.periodEnd
        ? `${budget.periodStart} to ${budget.periodEnd}`
        : 'Period not specified'
      
      fields.push({
        fieldName: `${countryName} Budget - ${period}`,
        iatiPath: `recipient-country-budget[${index}]`,
        currentValue: null,
        importValue: budget,
        selected: false,
        hasConflict: false,
        category: 'country-budgets',
        isNew: true,
        isArrayItem: true,
        itemIndex: index,
        itemData: budget,
        isHomeCountry: countryCode === homeCountryCode
      })
    })

    // Region budgets
    parsed.recipientRegionBudgets?.forEach((budget: any, index: number) => {
      const regionCode = budget.recipientRegion?.code || 'Unknown'
      const period = budget.periodStart && budget.periodEnd
        ? `${budget.periodStart} to ${budget.periodEnd}`
        : 'Period not specified'
      
      fields.push({
        fieldName: `Region ${regionCode} Budget - ${period}`,
        iatiPath: `recipient-region-budget[${index}]`,
        currentValue: null,
        importValue: budget,
        selected: false,
        hasConflict: false,
        category: 'region-budgets',
        isNew: true,
        isArrayItem: true,
        itemIndex: index,
        itemData: budget
      })
    })

    // Org budgets
    parsed.recipientOrgBudgets?.forEach((budget: any, index: number) => {
      const orgName = budget.recipientOrg?.name || budget.recipientOrg?.ref || 'Unknown'
      const period = budget.periodStart && budget.periodEnd
        ? `${budget.periodStart} to ${budget.periodEnd}`
        : 'Period not specified'
      
      fields.push({
        fieldName: `${orgName} Budget - ${period}`,
        iatiPath: `recipient-org-budget[${index}]`,
        currentValue: null,
        importValue: budget,
        selected: false,
        hasConflict: false,
        category: 'org-budgets',
        isNew: true,
        isArrayItem: true,
        itemIndex: index,
        itemData: budget
      })
    })

    // Expenditures
    parsed.totalExpenditures?.forEach((expenditure: any, index: number) => {
      const period = expenditure.periodStart && expenditure.periodEnd
        ? `${expenditure.periodStart} to ${expenditure.periodEnd}`
        : 'Period not specified'
      
      fields.push({
        fieldName: `Expenditure - ${period}`,
        iatiPath: `total-expenditure[${index}]`,
        currentValue: null,
        importValue: expenditure,
        selected: false,
        hasConflict: false,
        category: 'expenditures',
        isNew: true,
        isArrayItem: true,
        itemIndex: index,
        itemData: expenditure
      })
    })

    // Documents
    parsed.documentLinks?.forEach((doc: any, index: number) => {
      const title = doc.titles?.[0]?.narrative || doc.url
      
      fields.push({
        fieldName: `Document: ${title}`,
        iatiPath: `document-link[${index}]`,
        currentValue: null,
        importValue: doc,
        selected: false,
        hasConflict: false,
        category: 'documents',
        isNew: true,
        isArrayItem: true,
        itemIndex: index,
        itemData: doc
      })
    })

    return fields
  }, [organizationId, homeCountryCode, fetchCurrentOrgData, fetchCurrentBudgets, fetchCurrentExpenditures, fetchCurrentDocuments])

  // Parse XML
  const handleParse = async () => {
    let content = xmlContent

    if (importMethod === 'file' && selectedFile) {
      content = await selectedFile.text()
    } else if (importMethod === 'url' && xmlUrl) {
      try {
        setImportStatus('parsing')
        setImportProgress(10)
        const response = await fetch(xmlUrl)
        if (!response.ok) throw new Error(`Failed to fetch XML: ${response.statusText}`)
        content = await response.text()
      } catch (error) {
        setImportError(`Failed to fetch XML from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setImportStatus('error')
        return
      }
    }

    if (!content || !content.trim()) {
      setImportError('No XML content provided')
      return
    }

    setImportStatus('parsing')
    setImportProgress(30)
    setImportError(null)

    try {
      // Validate XML
      const validation = validateIATIOrganizationXML(content)
      if (!validation.isValid) {
        setImportError(`Invalid IATI XML: ${validation.errors.join(', ')}`)
        setImportStatus('error')
        return
      }

      setImportProgress(50)
      
      // Parse XML
      const parsed = parseIATIOrganization(content)
      setParsedOrg(parsed)

      // Analyze budget coverage
      const coverage = analyzeBudgetCoverage(parsed)
      setBudgetCoverage(coverage)

      setImportProgress(70)

      // Build comparison fields
      const fields = await buildComparisonFields(parsed)
      setComparisonFields(fields)

      setImportProgress(100)
      setImportStatus('preview')
      toast.success('XML parsed successfully')
    } catch (error) {
      console.error('Error parsing XML:', error)
      setImportError(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setImportStatus('error')
      setImportProgress(0)
    }
  }

  // Handle field toggle
  const handleFieldToggle = (field: OrgImportField, checked: boolean) => {
    setComparisonFields(prev => prev.map(f => 
      // Use iatiPath as unique identifier (more reliable than fieldName + itemIndex)
      f.iatiPath === field.iatiPath && 
      (f.itemIndex === field.itemIndex || (!f.itemIndex && !field.itemIndex))
        ? { ...f, selected: checked }
        : f
    ))
  }

  // Handle select all
  const handleSelectAll = () => {
    setComparisonFields(prev => prev.map(f => ({ ...f, selected: true })))
  }

  // Handle deselect all
  const handleDeselectAll = () => {
    setComparisonFields(prev => prev.map(f => ({ ...f, selected: false })))
  }

  // Handle import
  const handleImport = async () => {
    const selectedFields = comparisonFields.filter(f => f.selected)
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to import')
      return
    }

    setImportStatus('importing')
    setImportProgress(0)
    setImportError(null)

    try {
      // Build field selection map
      const fieldSelection: Record<string, boolean> = {}
      selectedFields.forEach(field => {
        fieldSelection[field.iatiPath] = true
      })

      setImportProgress(30)

      const response = await fetch(`/api/organizations/${organizationId}/import-iati-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: fieldSelection,
          iati_data: parsedOrg,
          selectedFields: selectedFields.map(f => ({
            iatiPath: f.iatiPath,
            category: f.category,
            itemIndex: f.itemIndex,
            itemData: f.itemData
          }))
        })
      })

      setImportProgress(70)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = await response.json()
      setImportProgress(100)
      setImportStatus('complete')
      toast.success(`Successfully imported ${result.updated_fields?.length || selectedFields.length} fields`)
      
      if (onImportComplete) {
        onImportComplete()
      }
    } catch (error) {
      console.error('Error importing:', error)
      setImportError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setImportStatus('error')
      setImportProgress(0)
    }
  }

  // Reset
  const handleReset = () => {
    setSelectedFile(null)
    setXmlContent('')
    setXmlUrl('')
    setParsedOrg(null)
    setComparisonFields([])
    setBudgetCoverage(null)
    setImportStatus('idle')
    setImportProgress(0)
    setImportError(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import IATI Organization XML</CardTitle>
          <CardDescription>
            Upload, paste, or fetch an IATI Organization XML file to import data into this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importStatus === 'idle' && (
            <Tabs value={importMethod} onValueChange={(v) => setImportMethod(v as ImportMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="paste">Paste XML</TabsTrigger>
                <TabsTrigger value="url">Fetch from URL</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Drag and drop an XML file here, or click to select</p>
                      <p className="text-sm text-gray-500">IATI Organization XML files only</p>
                    </div>
                  )}
                </div>
                {selectedFile && (
                  <Button onClick={handleParse} className="w-full">
                    Parse XML
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="paste" className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste XML Content</Label>
                  <Textarea
                    value={xmlContent}
                    onChange={(e) => setXmlContent(e.target.value)}
                    placeholder="Paste IATI Organization XML here..."
                    className="font-mono text-sm"
                    rows={10}
                  />
                </div>
                <Button onClick={handleParse} disabled={!xmlContent.trim()} className="w-full">
                  Parse XML
                </Button>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label>XML URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={xmlUrl}
                      onChange={(e) => setXmlUrl(e.target.value)}
                      placeholder="https://example.com/organization.xml"
                      className="flex-1"
                    />
                    <Button onClick={handleParse} disabled={!xmlUrl.trim()}>
                      Fetch & Parse
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {importStatus === 'parsing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span>Parsing XML...</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          {importError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {importStatus === 'preview' && budgetCoverage && (
            <div className="space-y-6">
              {/* Budget Coverage Summary */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Budget Coverage for {homeCountryName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      {budgetCoverage.countryBudgets.hasHomeCountryBudget ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-green-900">Country-Specific Budget Available</p>
                            <p className="text-sm text-green-700 mt-1">
                              This organization has published a budget specifically for {homeCountryName}.
                            </p>
                            {budgetCoverage.countryBudgets.homeCountryBudget && (
                              <p className="text-sm text-gray-600 mt-2">
                                Period: {budgetCoverage.countryBudgets.homeCountryBudget.periodStart} to {budgetCoverage.countryBudgets.homeCountryBudget.periodEnd}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-red-900">Country-Specific Budget Not Available</p>
                            <p className="text-sm text-red-700 mt-1">
                              This organization has not published a budget specifically for {homeCountryName}.
                            </p>
                            {budgetCoverage.countryBudgets.otherCountries.length > 0 && (
                              <p className="text-sm text-gray-600 mt-2">
                                Other countries with budgets: {budgetCoverage.countryBudgets.otherCountries.join(', ')}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Budgets</p>
                      <p className="font-medium">{budgetCoverage.totalBudgets.count}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Region Budgets</p>
                      <p className="font-medium">{budgetCoverage.recipientRegionBudgetCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Org Budgets</p>
                      <p className="font-medium">{budgetCoverage.recipientOrgBudgetCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Documents</p>
                      <p className="font-medium">{budgetCoverage.documentCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Table */}
              <IATIOrgImportFieldsTable
                fields={comparisonFields}
                onFieldToggle={handleFieldToggle}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                xmlContent={xmlContent}
                homeCountryCode={homeCountryCode}
              />

              {/* Import Actions */}
              <div className="flex gap-4">
                <Button onClick={handleImport} className="flex-1">
                  Import Selected ({comparisonFields.filter(f => f.selected).length})
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
              </div>
            </div>
          )}

          {importStatus === 'importing' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span>Importing selected fields...</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          {importStatus === 'complete' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Import completed successfully! You can now review the imported data in other tabs.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



