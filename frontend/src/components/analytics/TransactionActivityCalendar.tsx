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

        // Query transactions directly for better performance and to show all transactions
        let transactionsQuery = supabase
          .from('transactions')
          .select('transaction_date, transaction_type, value, provider_org_id, activity_id')
          .eq('status', 'actual')
          .order('transaction_date', { ascending: true })

        // Apply date range filter
        if (dateRange) {
          transactionsQuery = transactionsQuery
            .gte('transaction_date', dateRange.from.toISOString())
            .lte('transaction_date', dateRange.to.toISOString())
        }

        // Apply donor filter
        if (filters?.donor) {
          transactionsQuery = transactionsQuery.eq('provider_org_id', filters.donor)
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








