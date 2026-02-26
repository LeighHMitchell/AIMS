"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  TrendingDown,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Pencil,
  FileText,
  Users,
  Trash2,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import {
  SEE_STATUS_LABELS,
  SEE_TRANSFER_MODE_LABELS,
  formatCurrency,
} from "@/lib/project-bank-utils"
import type { SEETransfer, SEETransferStatus } from "@/types/project-bank"

const STATUS_BADGE_VARIANT: Record<SEETransferStatus, string> = {
  draft: 'gray',
  assessment: 'blue',
  valuation: 'amber',
  restructuring: 'purple',
  tender: 'teal',
  transferred: 'success',
  cancelled: 'destructive',
}

const STATUS_ORDER: SEETransferStatus[] = ['draft', 'assessment', 'valuation', 'restructuring', 'tender', 'transferred']

export default function TransferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [transfer, setTransfer] = useState<SEETransfer | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchTransfer() {
      try {
        const res = await apiFetch(`/api/see-transfers/${id}`)
        if (res.ok) {
          setTransfer(await res.json())
        }
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchTransfer()
  }, [id])

  const handleAdvanceStatus = async () => {
    setAdvancing(true)
    try {
      const res = await apiFetch(`/api/see-transfers/${id}/advance-status`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setTransfer(prev => prev ? { ...prev, ...updated } : prev)
      }
    } catch {
      // handle error
    } finally {
      setAdvancing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/see-transfers/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/project-bank/transfers')
      }
    } catch {
      // handle error
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    )
  }

  if (!transfer) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Transfer not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/project-bank/transfers')}>
            Back to Transfers
          </Button>
        </div>
      </MainLayout>
    )
  }

  const canAdvance = transfer.status !== 'transferred' && transfer.status !== 'cancelled'
  const currentIdx = STATUS_ORDER.indexOf(transfer.status)
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null

  return (
    <MainLayout>
      <div className="w-full max-w-[1200px]">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => router.push('/project-bank/transfers')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> All Transfers
          </Button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-7 w-7 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{transfer.see_name}</h1>
                  <Badge variant={STATUS_BADGE_VARIANT[transfer.status] as any}>
                    {SEE_STATUS_LABELS[transfer.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {transfer.transfer_code}
                  {transfer.see_ministry && ` · ${transfer.see_ministry}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/project-bank/transfers/${id}/assessment`)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Assessment
              </Button>
              {canAdvance && nextStatus && (
                <Button size="sm" onClick={handleAdvanceStatus} disabled={advancing}>
                  {advancing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Advance to {SEE_STATUS_LABELS[nextStatus]}
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status Pipeline */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              {STATUS_ORDER.map((status, idx) => {
                const isActive = status === transfer.status
                const isPast = idx < currentIdx
                return (
                  <div key={status} className="flex items-center flex-1">
                    <div
                      className={`flex-1 text-center py-2 px-2 rounded text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isPast
                          ? 'bg-muted text-foreground'
                          : 'bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {SEE_STATUS_LABELS[status]}
                    </div>
                    {idx < STATUS_ORDER.length - 1 && (
                      <ArrowRight className={`h-3.5 w-3.5 mx-0.5 shrink-0 ${isPast ? 'text-foreground' : 'text-muted-foreground/30'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enterprise Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enterprise Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sector</span>
                    <p className="font-medium">{transfer.see_sector || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parent Ministry</span>
                    <p className="font-medium">{transfer.see_ministry || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employees</span>
                    <p className="font-medium">{transfer.employee_count?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transfer Mode</span>
                    <p className="font-medium">
                      {transfer.transfer_mode ? SEE_TRANSFER_MODE_LABELS[transfer.transfer_mode] || transfer.transfer_mode : '—'}
                    </p>
                  </div>
                </div>
                {transfer.description && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{transfer.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Annual Revenue</span>
                    <p className="font-medium font-mono">{formatCurrency(transfer.current_annual_revenue)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Annual Expenses</span>
                    <p className="font-medium font-mono">{formatCurrency(transfer.current_annual_expenses)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Assets</span>
                    <p className="font-medium font-mono">{formatCurrency(transfer.total_assets)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Liabilities</span>
                    <p className="font-medium font-mono">{formatCurrency(transfer.total_liabilities)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valuation */}
            {(transfer.valuation_amount || transfer.valuation_method) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Valuation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valuation Amount</span>
                      <p className="font-medium font-mono text-lg">{formatCurrency(transfer.valuation_amount)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Method</span>
                      <p className="font-medium">{transfer.valuation_method || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valuation Firm</span>
                      <p className="font-medium">{transfer.valuation_firm || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valuation Date</span>
                      <p className="font-medium">{transfer.valuation_date || '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historical Financials Table */}
            {transfer.financials && transfer.financials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-surface-muted">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Year</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Revenue</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Expenses</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Net Income</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">FCF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {transfer.financials.map(f => (
                          <tr key={f.id}>
                            <td className="px-4 py-2 font-mono">{f.year}</td>
                            <td className="px-4 py-2">
                              <Badge variant={f.period_type === 'historical' ? 'gray' : 'blue'} className="text-[10px]">
                                {f.period_type === 'historical' ? 'Historical' : 'Projected'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(f.revenue)}</td>
                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(f.expenses)}</td>
                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(f.net_income)}</td>
                            <td className="px-4 py-2 text-right font-mono">{formatCurrency(f.free_cash_flow)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Compliance Checks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compliance Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fixed Asset Register</span>
                  <Badge variant={transfer.fixed_asset_register_maintained ? 'success' : 'gray'} className="text-[10px]">
                    {transfer.fixed_asset_register_maintained ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Regulatory Separation</span>
                  <Badge variant={transfer.regulatory_separation_done ? 'success' : 'gray'} className="text-[10px]">
                    {transfer.regulatory_separation_done ? 'Done' : 'Pending'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Legislation Review</span>
                  <Badge variant={transfer.legislation_review_done ? 'success' : 'gray'} className="text-[10px]">
                    {transfer.legislation_review_done ? 'Done' : 'Pending'}
                  </Badge>
                </div>
                {transfer.shares_allotted_to_state != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">State Shares</span>
                    <span className="font-medium">{transfer.shares_allotted_to_state}%</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents ({transfer.documents?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!transfer.documents || transfer.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {transfer.documents.map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm truncate">{doc.file_name}</div>
                          <div className="text-xs text-muted-foreground">{doc.document_type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Restructuring Notes */}
            {transfer.restructuring_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Restructuring Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{transfer.restructuring_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Transfer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this transfer?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {transfer.see_name} and all associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  )
}
