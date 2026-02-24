"use client"

import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History, Calendar, CheckCircle2, Rocket, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import releases from '@/data/releases.json'

interface Release {
  version: string
  date: string
  narrativeSummary?: string
  changes: string[]
}

export default function BuildHistoryPage() {
  const releaseList: Release[] = releases.releases

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageLimit, setPageLimit] = useState<number>(5)

  const totalReleases = releaseList.length
  const totalPages = Math.ceil(totalReleases / pageLimit)
  const startIndex = (currentPage - 1) * pageLimit
  const endIndex = Math.min(startIndex + pageLimit, totalReleases)
  const paginatedReleases = releaseList.slice(startIndex, endIndex)

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit)
    setCurrentPage(1)
  }

  // Format date nicely
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <History className="h-8 w-8 text-gray-600" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">Build History</h1>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <HelpCircle className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs p-3">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">About Build History</p>
                          <p className="text-xs text-muted-foreground">
                            This page shows all production releases of æther Myanmar. Each release includes bug fixes, new features, and improvements. You can also hover over the version badge in the sidebar to see the latest changes at a glance.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  A timeline of all releases and updates to æther Myanmar
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Current: v{releases.currentVersion}
            </Badge>
          </div>
        </div>

        <div className="p-6">
          {/* This release — non-technical narrative (latest push) */}
          {releaseList.length > 0 && releaseList[0].narrativeSummary && (
            <Card className="mb-6 border-primary/30 bg-primary/[0.04] shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <Rocket className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-foreground">
                      What&apos;s in this release (v{releaseList[0].version})
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {releaseList[0].narrativeSummary}
                    </p>
                    <p className="text-xs text-muted-foreground/60 pt-1">
                      Released {formatDate(releaseList[0].date)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Release entries */}
            <div className="space-y-6">
              {paginatedReleases.map((release, index) => {
                const globalIndex = startIndex + index
                const isLatest = globalIndex === 0
                const isFirst = globalIndex === releaseList.length - 1

                return (
                  <div key={release.version} className="relative pl-12">
                    {/* Timeline dot */}
                    <div 
                      className={`absolute left-0 top-6 w-10 h-10 rounded-full flex items-center justify-center ${
                        isLatest 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                      }`}
                    >
                      {isLatest ? (
                        <Rocket className="h-5 w-5" />
                      ) : isFirst ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </div>

                    {/* Release card */}
                    <Card className={`overflow-hidden ${isLatest ? 'border-primary/50 shadow-md' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg font-semibold">
                              <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                                v{release.version}
                              </span>
                            </CardTitle>
                            {isLatest && (
                              <Badge style={{ backgroundColor: '#3C6255', color: 'white' }} className="hover:opacity-90">
                                Latest
                              </Badge>
                            )}
                            {isFirst && !isLatest && (
                              <Badge variant="secondary">
                                Initial Release
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(release.date)}</span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground">Changes in this release:</h4>
                          <ul className="space-y-2">
                            {release.changes.map((change, changeIndex) => {
                              const isHeader = /^<b>.*<\/b>$/.test(change)
                              return (
                                <li
                                  key={changeIndex}
                                  className={`flex items-start gap-3 text-sm ${isHeader ? 'text-foreground font-medium mt-3 first:mt-0' : 'text-muted-foreground'}`}
                                >
                                  {!isHeader && <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                                  <span dangerouslySetInnerHTML={{ __html: change }} />
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>

            {/* End of timeline marker (only show on last page) */}
            {currentPage === totalPages && (
              <div className="relative pl-12 pt-6">
                <div className="absolute left-0 top-6 w-10 h-10 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-xs font-medium">...</span>
                </div>
                <p className="text-sm text-muted-foreground pt-2 pl-2">
                  End of release history
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalReleases > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {endIndex} of {totalReleases} releases
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-slate-200 text-slate-900" : ""}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Releases per page:</label>
                  <Select
                    value={pageLimit.toString()}
                    onValueChange={(value) => handlePageLimitChange(Number(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  )
}
