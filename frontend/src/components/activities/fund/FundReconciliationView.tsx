"use client"

import React, { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-fetch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react"
import Link from "next/link"

interface ReconciliationChild {
  childId: string
  childTitle: string
  matches: { fundTransaction: any; childTransaction: any; status: string }[]
  unmatchedFund: any[]
  unmatchedChild: any[]
  mismatches: { fundTransaction: any; childTransaction: any; status: string; discrepancy: number }[]
  fundTotal: number
  childTotal: number
  discrepancy: number
}

interface ReconciliationData {
  children: ReconciliationChild[]
  summary: {
    totalMatched: number
    totalDiscrepancy: number
    percentReconciled: number
    matchedCount: number
    unmatchedFundCount: number
    unmatchedChildCount: number
    mismatchCount: number
  }
}

interface FundReconciliationViewProps {
  activityId: string
}

export function FundReconciliationView({ activityId }: FundReconciliationViewProps) {
  const [data, setData] = useState<ReconciliationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChild, setExpandedChild] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/activities/${activityId}/fund-reconciliation`)
        if (!res.ok) {
          const err = await res.json()
          setError(err.error || 'Failed to load reconciliation data')
          return
        }
        setData(await res.json())
      } catch (e: any) {
        setError(e.message || 'Failed to load reconciliation data')
      } finally {
        setLoading(false)
      }
    }
    if (activityId) load()
  }, [activityId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-8 text-muted-foreground"><p>{error}</p></div>
  }

  if (!data || data.children.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No transactions to reconcile</p>
        <p className="text-sm mt-1">Reconciliation compares fund-side outgoing transactions with child-side incoming transactions. Link child activities and record transactions to begin.</p>
      </div>
    )
  }

  const { summary } = data

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-gray-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{summary.matchedCount}</p>
            <p className="text-xs text-muted-foreground">Matched</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-gray-400 mb-1" />
            <p className="text-2xl font-bold text-foreground">{summary.mismatchCount}</p>
            <p className="text-xs text-muted-foreground">Amount Mismatches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-gray-400 mb-1" />
            <p className="text-2xl font-bold text-foreground">{summary.unmatchedFundCount + summary.unmatchedChildCount}</p>
            <p className="text-xs text-muted-foreground">Unmatched</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <HelpCircle className="h-5 w-5 mx-auto text-gray-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{summary.percentReconciled}%</p>
            <p className="text-xs text-muted-foreground">Reconciled</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-child reconciliation */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="font-semibold">Child Activity</TableHead>
              <TableHead className="text-right font-semibold">Fund Side</TableHead>
              <TableHead className="text-right font-semibold">Child Side</TableHead>
              <TableHead className="text-right font-semibold">Discrepancy</TableHead>
              <TableHead className="text-center font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.children.map(child => {
              const isExpanded = expandedChild === child.childId
              const hasIssues = child.unmatchedFund.length > 0 || child.unmatchedChild.length > 0 || child.mismatches.length > 0
              const discrepancyColor = Math.abs(child.discrepancy) < 0.01 ? 'text-muted-foreground' : 'text-foreground font-semibold'

              return (
                <React.Fragment key={child.childId}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedChild(isExpanded ? null : child.childId)}
                  >
                    <TableCell>
                      <Link
                        href={`/activities/${child.childId}`}
                        className="text-foreground hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {child.childTitle}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">${child.fundTotal.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${child.childTotal.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-medium ${discrepancyColor}`}>
                      {Math.abs(child.discrepancy) < 0.01 ? '-' : `$${child.discrepancy.toLocaleString()}`}
                    </TableCell>
                    <TableCell className="text-center">
                      {!hasIssues ? (
                        <Badge className="bg-gray-100 text-gray-700 text-xs">Reconciled</Badge>
                      ) : (
                        <Badge className="bg-gray-200 text-gray-700 text-xs">
                          {child.matches.length} matched, {child.unmatchedFund.length + child.unmatchedChild.length + child.mismatches.length} issues
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted p-4">
                        <div className="space-y-3">
                          {/* Matches */}
                          {child.matches.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Matched Transactions ({child.matches.length})
                              </p>
                              {child.matches.map((m, i) => (
                                <div key={i} className="text-xs text-muted-foreground ml-4">
                                  ${m.fundTransaction.amount.toLocaleString()} on {m.fundTransaction.date || 'no date'}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Mismatches */}
                          {child.mismatches.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Amount Mismatches ({child.mismatches.length})
                              </p>
                              {child.mismatches.map((m, i) => (
                                <div key={i} className="text-xs text-muted-foreground ml-4">
                                  Fund: ${m.fundTransaction.amount.toLocaleString()} vs Child: ${m.childTransaction.amount.toLocaleString()}
                                  {' '}(diff: ${Math.abs(m.discrepancy).toLocaleString()})
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Unmatched fund-side */}
                          {child.unmatchedFund.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Unmatched Fund-Side ({child.unmatchedFund.length})
                              </p>
                              {child.unmatchedFund.map((t: any, i: number) => (
                                <div key={i} className="text-xs text-muted-foreground ml-4">
                                  ${t.amount.toLocaleString()} on {t.date || 'no date'} — no matching receipt on child
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Unmatched child-side */}
                          {child.unmatchedChild.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Unmatched Child-Side ({child.unmatchedChild.length})
                              </p>
                              {child.unmatchedChild.map((t: any, i: number) => (
                                <div key={i} className="text-xs text-muted-foreground ml-4">
                                  ${t.amount.toLocaleString()} on {t.date || 'no date'} — no matching disbursement on fund
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
