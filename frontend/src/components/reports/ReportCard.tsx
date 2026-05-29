"use client"

import React, { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { exportTableToCSV } from '@/lib/exports'
import { toast } from "sonner"

export interface ReportHeader {
  key: string
  label: string
}

export interface ReportCardProps {
  title: string
  description: string
  apiEndpoint: string
  filename: string
  headers: ReportHeader[]
}

export function ReportCard({
  title,
  description,
  apiEndpoint,
  filename,
  headers,
}: ReportCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch(apiEndpoint)
      const result = await response.json()
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch report data')
      }
      
      const data = result.data || []
      
      if (data.length === 0) {
        toast.warning('No data available', {
          description: 'This report has no data to export.',
        })
        return
      }
      
      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]
      const fullFilename = `${filename}_${date}`
      
      exportTableToCSV(data, headers, fullFilename)
      
      toast.success('Report downloaded', {
        description: `${title} has been exported to CSV.`,
      })
    } catch (error) {
      console.error('Error downloading report:', error)
      toast.error('Download failed', {
        description: error instanceof Error ? error.message : 'An error occurred while generating the report.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-full hover:shadow-card-hover transition-shadow">
      <CardHeader className="pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="mt-1 text-body line-clamp-2">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0 mt-auto flex justify-end">
        <Button
          onClick={handleDownload}
          disabled={isLoading}
          variant="outline"
          size="icon"
          className="h-9 w-9"
          title="Download CSV"
          aria-label="Download CSV"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </CardContent>
    </Card>
  )
}



