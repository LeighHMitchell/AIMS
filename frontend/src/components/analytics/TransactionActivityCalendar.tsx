"use client"

import React, { useState, useEffect } from 'react'
import { TransactionCalendarHeatmap } from '@/components/activities/TransactionCalendarHeatmap'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Calendar } from 'lucide-react'

interface TransactionActivityCalendarProps {
  dateRange?: {
    from: Date
    to: Date
  }
  filters?: {
    country?: string
    donor?: string
    sector?: string
  }
  refreshKey?: number
}

interface Transaction {
  transaction_date: string
  transaction_type: string
  value: number
}

export function TransactionActivityCalendar({ 
  dateRange, 
  filters, 
  refreshKey 
}: TransactionActivityCalendarProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalTransactions: number
    totalValue: number
    activeDays: number
    avgPerDay: number
  }>({ totalTransactions: 0, totalValue: 0, activeDays: 0, avgPerDay: 0 })

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        // If filtering by organization (donor), use the same logic as the transaction list:
        // Get activities where org is reporting_org_id AND published, then get all their transactions
        if (filters?.donor) {
          // First get published activities where this org is the reporting org
          const { data: activities, error: activitiesError } = await supabase
            .from('activities')
            .select('id')
            .eq('reporting_org_id', filters.donor)
            .eq('publication_status', 'published')

          if (activitiesError) {
            console.error('[TransactionActivityCalendar] Error fetching activities:', activitiesError)
            setError('Failed to fetch activity data')
            return
          }

          const activityIds = activities?.map(a => a.id) || []

          if (activityIds.length === 0) {
            setTransactions([])
            setStats({ totalTransactions: 0, totalValue: 0, activeDays: 0, avgPerDay: 0 })
            return
          }

          // Then get all transactions for those activities
          let transactionsQuery = supabase
            .from('transactions')
            .select('transaction_date, transaction_type, value, activity_id')
            .in('activity_id', activityIds)
            .order('transaction_date', { ascending: true })

          // Apply date range filter
          if (dateRange) {
            transactionsQuery = transactionsQuery
              .gte('transaction_date', dateRange.from.toISOString())
              .lte('transaction_date', dateRange.to.toISOString())
          }

          const { data: transactionsData, error: queryError } = await transactionsQuery

          if (queryError) {
            console.error('[TransactionActivityCalendar] Error fetching transactions:', queryError)
            setError('Failed to fetch transaction data')
            return
          }

          // Convert to expected format
          const allTransactions: Transaction[] = (transactionsData || []).map((t: any) => ({
            transaction_date: t.transaction_date,
            transaction_type: t.transaction_type || '',
            value: parseFloat(String(t.value || 0)),
          }))

          // Calculate stats
          const uniqueDays = new Set(allTransactions.map(t => t.transaction_date?.split('T')[0])).size
          const totalValue = allTransactions.reduce((sum, t) => sum + Math.abs(t.value), 0)

          setStats({
            totalTransactions: allTransactions.length,
            totalValue,
            activeDays: uniqueDays,
            avgPerDay: uniqueDays > 0 ? allTransactions.length / uniqueDays : 0
          })

          setTransactions(allTransactions)
        } else {
          // No org filter - get all transactions (original behavior for other use cases)
          let transactionsQuery = supabase
            .from('transactions')
            .select('transaction_date, transaction_type, value, activity_id')
            .eq('status', 'actual')
            .order('transaction_date', { ascending: true })

          // Apply date range filter
          if (dateRange) {
            transactionsQuery = transactionsQuery
              .gte('transaction_date', dateRange.from.toISOString())
              .lte('transaction_date', dateRange.to.toISOString())
          }

          const { data: transactionsData, error: queryError } = await transactionsQuery

          if (queryError) {
            console.error('[TransactionActivityCalendar] Error fetching transactions:', queryError)
            setError('Failed to fetch transaction data')
            return
          }

          // Convert to expected format
          const allTransactions: Transaction[] = (transactionsData || []).map((t: any) => ({
            transaction_date: t.transaction_date,
            transaction_type: t.transaction_type || '',
            value: parseFloat(String(t.value || 0)),
          }))

          // Calculate stats
          const uniqueDays = new Set(allTransactions.map(t => t.transaction_date?.split('T')[0])).size
          const totalValue = allTransactions.reduce((sum, t) => sum + Math.abs(t.value), 0)

          setStats({
            totalTransactions: allTransactions.length,
            totalValue,
            activeDays: uniqueDays,
            avgPerDay: uniqueDays > 0 ? allTransactions.length / uniqueDays : 0
          })

          setTransactions(allTransactions)
        }
      } catch (err) {
        console.error('[TransactionActivityCalendar] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [dateRange, filters, refreshKey])

  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transaction Activity Calendar
          </CardTitle>
          <CardDescription>
            Daily transaction activity colored by transaction type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transaction Activity Calendar
          </CardTitle>
          <CardDescription>
            Daily transaction activity colored by transaction type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Transaction Activity Calendar
        </CardTitle>
        <CardDescription>
          Daily transaction activity colored by transaction type. Hover over days for details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TransactionCalendarHeatmap transactions={transactions} stats={stats} />
      </CardContent>
    </Card>
  )
}
