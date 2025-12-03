"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, TrendingUp, Activity, Users, Target, Wallet } from 'lucide-react'

interface SectorMetricsCardsProps {
  totalPlanned: number
  totalActual: number
  totalCommitments: number
  totalBudgets: number
  totalProjects: number
  totalPartners: number
}

export function SectorMetricsCards({
  totalPlanned,
  totalActual,
  totalCommitments,
  totalBudgets,
  totalProjects,
  totalPartners
}: SectorMetricsCardsProps) {
  
  const formatCurrency = (value: number) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
      return '$0'
    }
    if (value === 0) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value)
  }

  const metrics = [
    {
      title: 'Total Budgets',
      value: formatCurrency(totalBudgets),
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Planned Disbursements',
      value: formatCurrency(totalPlanned),
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Actual Disbursements',
      value: formatCurrency(totalActual),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Commitments',
      value: formatCurrency(totalCommitments),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Projects',
      value: totalProjects.toLocaleString(),
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Total Partners',
      value: totalPartners.toLocaleString(),
      icon: Users,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index} className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


