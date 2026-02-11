'use client'

import React from 'react'

interface YoYStats {
  currentYearCommitments: number
  currentYearDisbursements: number
  currentYearExpenditures: number
  commitmentChange: number
  disbursementChange: number
  expenditureChange: number
}

interface SDGMetricCardsProps {
  metrics: {
    totalActivities: number
    totalOrganizations: number
    commitments: number
    disbursements: number
    expenditures: number
    activeActivities: number
    pipelineActivities: number
    closedActivities: number
  }
  yoyStats: YoYStats
  donorCount: number
  sdgColor: string
}

function formatCurrencyShort(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return '$0.0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`
  return `${sign}$${abs.toFixed(1)}`
}

function TriangleUp() {
  return (
    <svg className="w-2.5 h-2.5" style={{ color: '#4C5568' }} fill="currentColor" viewBox="0 0 10 10">
      <polygon points="5,0 10,10 0,10" />
    </svg>
  )
}

function TriangleDown() {
  return (
    <svg className="w-2.5 h-2.5" style={{ color: '#DC2625' }} fill="currentColor" viewBox="0 0 10 10">
      <polygon points="0,0 10,0 5,10" />
    </svg>
  )
}

export function SDGMetricCards({ metrics, yoyStats, donorCount }: SDGMetricCardsProps) {
  const disbursedPercent = metrics.commitments > 0
    ? ((metrics.disbursements / metrics.commitments) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="flex flex-wrap lg:flex-nowrap gap-4 mb-8">
      {/* Activities */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
        <p className="text-xs font-medium text-slate-600 truncate">Activities</p>
        <p className="text-2xl font-bold text-slate-900">
          {metrics.activeActivities} <span className="text-sm font-normal text-slate-500">Active</span>
        </p>
        <div className="text-xs text-slate-500">
          <p>{metrics.pipelineActivities || 0} Pipeline</p>
          <p>{metrics.closedActivities || 0} Closed/Suspended</p>
        </div>
      </div>

      {/* Total Committed */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
        <p className="text-xs font-medium text-slate-600 truncate">Total Committed</p>
        <p className="text-2xl font-bold text-slate-900">{formatCurrencyShort(metrics.commitments)}</p>
        <div className="text-xs text-slate-500">
          <p className="flex items-center gap-1">
            {yoyStats.commitmentChange >= 0 ? <TriangleUp /> : <TriangleDown />}
            <span>{yoyStats.commitmentChange >= 0 ? '+' : ''}{formatCurrencyShort(yoyStats.commitmentChange)} vs last year</span>
          </p>
          <p>{formatCurrencyShort(yoyStats.currentYearCommitments)} this year</p>
        </div>
      </div>

      {/* Total Disbursed */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
        <p className="text-xs font-medium text-slate-600 truncate">Total Disbursed</p>
        <p className="text-2xl font-bold text-slate-900">{formatCurrencyShort(metrics.disbursements)}</p>
        <div className="text-xs text-slate-500">
          <p className="flex items-center gap-1">
            {yoyStats.disbursementChange >= 0 ? <TriangleUp /> : <TriangleDown />}
            <span>{yoyStats.disbursementChange >= 0 ? '+' : ''}{formatCurrencyShort(yoyStats.disbursementChange)} vs last year</span>
          </p>
          <p>{formatCurrencyShort(yoyStats.currentYearDisbursements)} this year</p>
        </div>
      </div>

      {/* % Disbursed */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
        <p className="text-xs font-medium text-slate-600 truncate">% Disbursed</p>
        <p className="text-2xl font-bold text-slate-900">{disbursedPercent}%</p>
        <div className="text-xs text-slate-500">
          <p>of total commitments</p>
        </div>
      </div>

      {/* Total Expended */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
        <p className="text-xs font-medium text-slate-600 truncate">Total Expended</p>
        <p className="text-2xl font-bold text-slate-900">{formatCurrencyShort(metrics.expenditures)}</p>
        <div className="text-xs text-slate-500">
          <p className="flex items-center gap-1">
            {yoyStats.expenditureChange >= 0 ? <TriangleUp /> : <TriangleDown />}
            <span>{yoyStats.expenditureChange >= 0 ? '+' : ''}{formatCurrencyShort(yoyStats.expenditureChange)} vs last year</span>
          </p>
          <p>{formatCurrencyShort(yoyStats.currentYearExpenditures)} this year</p>
        </div>
      </div>

      {/* Organizations */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3">
        <p className="text-xs font-medium text-slate-600 truncate">Organizations</p>
        <p className="text-2xl font-bold text-slate-900">{metrics.totalOrganizations}</p>
        <div className="text-xs text-slate-500">
          <p>{donorCount} donor{donorCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  )
}
