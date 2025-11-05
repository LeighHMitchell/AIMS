"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { TransactionCalendarHeatmap } from '@/components/activities/TransactionCalendarHeatmap'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

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
  value_usd?: number
  usd_value?: number
  value_USD?: number
}

export function TransactionActivityCalendar({ 
  dateRange, 
  filters, 
  refreshKey 
}: TransactionActivityCalendarProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Build base query through activities to properly apply filters
        let activityQuery = supabase
          .from('activities')
          .select(`
            id,
            locations,
            activity_sectors!inner(sector_code),
            transactions!transactions_activity_id_fkey1(
              transaction_date,
              transaction_type,
              value,
              value_usd,
              usd_value,
              value_USD,
              provider_org_id
            )
          `)
          .eq('publication_status', 'published')

        // Apply date range filter
        if (dateRange) {
          activityQuery = activityQuery
            .gte('transactions.transaction_date', dateRange.from.toISOString())
            .lte('transactions.transaction_date', dateRange.to.toISOString())
        }

        // Apply country filter
        if (filters?.country) {
          activityQuery = activityQuery.contains('locations', [{ country_code: filters.country }])
        }

        // Apply sector filter
        if (filters?.sector) {
          activityQuery = activityQuery.eq('activity_sectors.sector_code', filters.sector)
        }

        // Apply donor filter
        if (filters?.donor) {
          activityQuery = activityQuery.eq('transactions.provider_org_id', filters.donor)
        }

        const { data: activities, error: queryError } = await activityQuery

        if (queryError) {
          console.error('[TransactionActivityCalendar] Error fetching transactions:', queryError)
          setError('Failed to fetch transaction data')
          return
        }

        // Extract and flatten transactions from activities
        const allTransactions: Transaction[] = []
        activities?.forEach((activity: any) => {
          if (activity.transactions && Array.isArray(activity.transactions)) {
            activity.transactions.forEach((t: any) => {
              if (t.transaction_date) {
                allTransactions.push({
                  transaction_date: t.transaction_date,
                  transaction_type: t.transaction_type || '',
                  value: parseFloat(String(t.value || 0)),
                  value_usd: t.value_usd ? parseFloat(String(t.value_usd)) : undefined,
                  usd_value: t.usd_value ? parseFloat(String(t.usd_value)) : undefined,
                  value_USD: t.value_USD ? parseFloat(String(t.value_USD)) : undefined,
                })
              }
            })
          }
        })

        setTransactions(allTransactions)
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
          <CardTitle className="text-lg font-semibold text-slate-900">
            Transaction Activity Calendar
          </CardTitle>
          <CardDescription>
            Daily transaction activity colored by transaction type. Gradient colors indicate mixed transaction types on the same day.
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
          <CardTitle className="text-lg font-semibold text-slate-900">
            Transaction Activity Calendar
          </CardTitle>
          <CardDescription>
            Daily transaction activity colored by transaction type. Gradient colors indicate mixed transaction types on the same day.
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
        <CardTitle className="text-lg font-semibold text-slate-900">
          Transaction Activity Calendar
        </CardTitle>
        <CardDescription>
          Daily transaction activity colored by transaction type. Gradient colors indicate mixed transaction types on the same day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TransactionCalendarHeatmap transactions={transactions} />
      </CardContent>
    </Card>
  )
}


