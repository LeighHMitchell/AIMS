"use client"

import React from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, Calendar, CheckCircle2, Rocket } from 'lucide-react'
import releases from '@/data/releases.json'

interface Release {
  version: string
  date: string
  changes: string[]
}

export default function BuildHistoryPage() {
  const releaseList: Release[] = releases.releases

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
                <h1 className="text-2xl font-bold text-gray-900">Build History</h1>
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
          {/* Timeline */}
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Release entries */}
            <div className="space-y-6">
              {releaseList.map((release, index) => {
                const isLatest = index === 0
                const isFirst = index === releaseList.length - 1

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
                            {release.changes.map((change, changeIndex) => (
                              <li 
                                key={changeIndex}
                                className="flex items-start gap-3 text-sm text-muted-foreground"
                              >
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                <span>{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>

            {/* End of timeline marker */}
            <div className="relative pl-12 pt-6">
              <div className="absolute left-0 top-6 w-10 h-10 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-gray-400 text-xs font-medium">...</span>
              </div>
              <p className="text-sm text-muted-foreground pt-2 pl-2">
                End of release history
              </p>
            </div>
          </div>

          {/* Help section */}
          <Card className="mt-8 bg-muted/30 border-muted">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <History className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">About Build History</h3>
                  <p className="text-sm text-muted-foreground">
                    This page shows all production releases of æther Myanmar. Each release includes 
                    bug fixes, new features, and improvements. You can also hover over the version 
                    badge in the sidebar to see the latest changes at a glance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
