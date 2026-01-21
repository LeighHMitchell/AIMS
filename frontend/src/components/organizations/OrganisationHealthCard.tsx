"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface OrganisationHealthCardProps {
  healthMetrics: {
    missingBudgetsPercent: number
    missingPlannedDisbursementsPercent: number
    outdatedDataPercent: number
  }
}

export function OrganisationHealthCard({ healthMetrics }: OrganisationHealthCardProps) {
  const getHealthStatus = (percent: number) => {
    if (percent <= 20) return { color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle, label: 'Good' }
    if (percent <= 50) return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertCircle, label: 'Fair' }
    return { color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle, label: 'Poor' }
  }

  const budgetStatus = getHealthStatus(healthMetrics.missingBudgetsPercent)
  const disbursementStatus = getHealthStatus(healthMetrics.missingPlannedDisbursementsPercent)
  const dataStatus = getHealthStatus(healthMetrics.outdatedDataPercent)

  const BudgetIcon = budgetStatus.icon
  const DisbursementIcon = disbursementStatus.icon
  const DataIcon = dataStatus.icon

  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Data Health</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* Missing Budgets */}
          <div className={`${budgetStatus.bgColor} p-3 rounded-lg`}>
            <div className="flex items-center gap-2 mb-1">
              <BudgetIcon className={`h-4 w-4 ${budgetStatus.color}`} />
              <span className={`text-xs font-medium ${budgetStatus.color}`}>Missing Budgets</span>
            </div>
            <p className={`text-lg font-bold ${budgetStatus.color}`}>
              {healthMetrics.missingBudgetsPercent.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-1">{budgetStatus.label}</p>
          </div>

          {/* Missing Planned Disbursements */}
          <div className={`${disbursementStatus.bgColor} p-3 rounded-lg`}>
            <div className="flex items-center gap-2 mb-1">
              <DisbursementIcon className={`h-4 w-4 ${disbursementStatus.color}`} />
              <span className={`text-xs font-medium ${disbursementStatus.color}`}>Missing Planned Disbursements</span>
            </div>
            <p className={`text-lg font-bold ${disbursementStatus.color}`}>
              {healthMetrics.missingPlannedDisbursementsPercent.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-1">{disbursementStatus.label}</p>
          </div>

          {/* Outdated Data */}
          <div className={`${dataStatus.bgColor} p-3 rounded-lg`}>
            <div className="flex items-center gap-2 mb-1">
              <DataIcon className={`h-4 w-4 ${dataStatus.color}`} />
              <span className={`text-xs font-medium ${dataStatus.color}`}>Outdated Data</span>
            </div>
            <p className={`text-lg font-bold ${dataStatus.color}`}>
              {healthMetrics.outdatedDataPercent.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-1">{dataStatus.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}







