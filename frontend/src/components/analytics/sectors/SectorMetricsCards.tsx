"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, TrendingUp, Activity, Users, Target, Wallet } from 'lucide-react'
import { BRAND_COLORS, CHART_BAR_COLORS } from './sectorColorMap'

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

  // Using brand colors for consistency with charts
  const metrics = [
    {
      title: 'Total Budgets',
      value: formatCurrency(totalBudgets),
      icon: Target,
      iconColor: CHART_BAR_COLORS.budgets,
      bgColor: `${CHART_BAR_COLORS.budgets}15` // 15% opacity
    },
    {
      title: 'Planned Disbursements',
      value: formatCurrency(totalPlanned),
      icon: Wallet,
      iconColor: CHART_BAR_COLORS.planned,
      bgColor: `${CHART_BAR_COLORS.planned}15`
    },
    {
      title: 'Actual Disbursements',
      value: formatCurrency(totalActual),
      icon: DollarSign,
      iconColor: CHART_BAR_COLORS.actual,
      bgColor: `${CHART_BAR_COLORS.actual}15`
    },
    {
      title: 'Commitments',
      value: formatCurrency(totalCommitments),
      icon: TrendingUp,
      iconColor: CHART_BAR_COLORS.commitments,
      bgColor: `${CHART_BAR_COLORS.commitments}30` // Slightly more visible for light color
    },
    {
      title: 'Total Projects',
      value: totalProjects.toLocaleString(),
      icon: Activity,
      iconColor: CHART_BAR_COLORS.projects,
      bgColor: `${CHART_BAR_COLORS.projects}15`
    },
    {
      title: 'Total Partners',
      value: totalPartners.toLocaleString(),
      icon: Users,
      iconColor: CHART_BAR_COLORS.partners,
      bgColor: `${CHART_BAR_COLORS.partners}15`
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
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: metric.bgColor }}
                >
                  <Icon className="h-6 w-6" style={{ color: metric.iconColor }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


