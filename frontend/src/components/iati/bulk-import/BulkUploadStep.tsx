'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileCode, Upload, AlertCircle, AlertTriangle, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { XMLParser } from 'fast-xml-parser'
import { useUser } from '@/hooks/useUser'
import type { BulkImportMeta } from './types'

interface BulkUploadStepProps {
  onFileReady: (file: File, meta: BulkImportMeta) => void
  currentFile: File | null
  currentMeta: BulkImportMeta | null
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function extractQuickMeta(xmlText: string): {
  iatiVersion: string
  reportingOrgRef: string
  reportingOrgName: string
  activityCount: number
} {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    allowBooleanAttributes: true,
    parseAttributeValue: false,
    parseTagValue: true,
    trimValues: true,
  })

  const doc = parser.parse(xmlText)
  const root = doc['iati-activities']
  let iatiVersion = ''
  let reportingOrgRef = ''
  let reportingOrgName = ''
  let activityCount = 0

  if (root) {
    iatiVersion = root.version || ''
    const activities = root['iati-activity']
    if (Array.isArray(activities)) {
      activityCount = activities.length
      const first = activities[0]
      const repOrg = first?.['reporting-org']
      if (repOrg) {
        reportingOrgRef = repOrg.ref || ''
        if (repOrg.narrative) {
          if (typeof repOrg.narrative === 'string') {
            reportingOrgName = repOrg.narrative
          } else if (Array.isArray(repOrg.narrative)) {
            reportingOrgName = repOrg.narrative[0]?.['#text'] || repOrg.narrative[0] || ''
          } else if (repOrg.narrative['#text']) {
            reportingOrgName = repOrg.narrative['#text']
          }
        }
      }
    } else if (activities) {
      activityCount = 1
      const repOrg = activities['reporting-org']
      if (repOrg) {
        reportingOrgRef = repOrg.ref || ''
        if (repOrg.narrative) {
          if (typeof repOrg.narrative === 'string') {
            reportingOrgName = repOrg.narrative
          } else if (Array.isArray(repOrg.narrative)) {
            reportingOrgName = repOrg.narrative[0]?.['#text'] || repOrg.narrative[0] || ''
          } else if (repOrg.narrative['#text']) {
            reportingOrgName = repOrg.narrative['#text']
          }
        }
      }
    }
  }

  return { iatiVersion, reportingOrgRef, reportingOrgName: String(reportingOrgName), activityCount }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BulkUploadStep({ onFileReady, currentFile, currentMeta }: BulkUploadStepProps) {
  const [processing, setProcessing] = useState(false)
  const { user } = useUser()

  // Check if the file's reporting-org matches the user's organisation
  const userOrgIatiId = user?.organization?.iati_org_id
  const orgMismatch = currentMeta?.reportingOrgRef && userOrgIatiId
    ? currentMeta.reportingOrgRef.toLowerCase() !== userOrgIatiId.toLowerCase()
    : false

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const xmlFile = acceptedFiles[0]
    if (!xmlFile) return

    if (!xmlFile.name.endsWith('.xml')) {
      toast.error('Please upload a valid XML file')
      return
    }

    if (xmlFile.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB.')
      return
    }

    setProcessing(true)
    try {
      const [fileHash, xmlText] = await Promise.all([
        computeSHA256(xmlFile),
        xmlFile.text(),
      ])

      const quickMeta = extractQuickMeta(xmlText)

      if (quickMeta.activityCount === 0) {
        toast.error('No IATI activities found in this file')
        return
      }

      const meta: BulkImportMeta = {
        sourceMode: 'xml_upload',
        fileName: xmlFile.name,
        fileSize: xmlFile.size,
        fileHash,
        iatiVersion: quickMeta.iatiVersion,
        reportingOrgRef: quickMeta.reportingOrgRef,
        reportingOrgName: quickMeta.reportingOrgName,
        activityCount: quickMeta.activityCount,
      }

      onFileReady(xmlFile, meta)
    } catch (error) {
      console.error('File processing error:', error)
      toast.error('Failed to process XML file')
    } finally {
      setProcessing(false)
    }
  }, [onFileReady])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
    },
    maxFiles: 1,
    disabled: processing,
  })

  return (
    <div className="space-y-6">
      {currentFile && currentMeta ? (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{currentMeta.fileName}</h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700">Ready</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">File Size:</span>{' '}
                      <span className="font-medium">{formatFileSize(currentMeta.fileSize ?? 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">IATI Version:</span>{' '}
                      <span className="font-medium">{currentMeta.iatiVersion || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reporting Org:</span>{' '}
                      <span className="font-medium">{currentMeta.reportingOrgName || currentMeta.reportingOrgRef || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Activities:</span>{' '}
                      <span className="font-medium text-blue-600">{currentMeta.activityCount}</span>
                    </div>
                  </div>
                  {currentMeta.fileHash && (
                    <p className="text-xs text-gray-400 font-mono">SHA-256: {currentMeta.fileHash.substring(0, 16)}...</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => onFileReady(null as any, null as any)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Choose a different file
                </button>
              </div>
            </CardContent>
          </Card>

          {orgMismatch && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Organisation mismatch:</strong> This file&apos;s reporting organisation
                ({currentMeta?.reportingOrgRef}) does not match your organisation&apos;s IATI identifier
                ({userOrgIatiId}). Activities from other organisations will be rejected during validation.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-200
            ${processing ? 'opacity-50 cursor-wait' : ''}
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <input {...getInputProps()} />
          {processing ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-lg font-medium text-gray-700">Processing file...</p>
              <p className="text-sm text-gray-500 mt-2">Extracting metadata and computing file hash</p>
            </>
          ) : isDragActive ? (
            <>
              <Upload className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <p className="text-lg font-medium text-blue-600">Drop your IATI XML file here</p>
            </>
          ) : (
            <>
              <FileCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700">
                Drop your IATI XML file here
              </p>
              <p className="text-sm text-gray-500 mt-2">or click to select file</p>
              <p className="text-xs text-gray-400 mt-4">Supports IATI 2.03 format, max 50MB</p>
            </>
          )}
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          The bulk import process will guide you through:
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Upload your IATI XML file</li>
            <li>Validate all activities against IATI standards</li>
            <li>Preview and select activities to import</li>
            <li>Configure import rules (create vs update)</li>
            <li>Execute the import with progress tracking</li>
            <li>Review results and access imported activities</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  )
}
