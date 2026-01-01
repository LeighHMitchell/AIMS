"use client"

import React, { useState } from "react"
import { LucideIcon, Download, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { exportTableToCSV } from "@/lib/csv-export"
import { toast } from "sonner"

export interface ReportHeader {
  key: string
  label: string
}

export interface ReportCardProps {
  title: string
  description: string
  icon: LucideIcon
  apiEndpoint: string
  filename: string
  headers: ReportHeader[]
}

export function ReportCard({
  title,
  description,
  icon: Icon,
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
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm line-clamp-2">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        <Button
          onClick={handleDownload}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}



