import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DATE_TOLERANCE_DAYS = 7

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth()
    if (authResponse) return authResponse
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not initialized' }, { status: 500 })
    }

    const resolvedParams = await Promise.resolve(params)
    const fundId = resolvedParams.id

    // Get child IDs
    const { data: parentRels } = await supabase
      .from('activity_relationships')
      .select('related_activity_id')
      .eq('activity_id', fundId)
      .eq('relationship_type', '1')
      .not('related_activity_id', 'is', null)

    const { data: reverseRels } = await supabase
      .from('activity_relationships')
      .select('activity_id')
      .eq('related_activity_id', fundId)
      .eq('relationship_type', '2')

    const childIds = new Set<string>()
    parentRels?.forEach(r => { if (r.related_activity_id) childIds.add(r.related_activity_id) })
    reverseRels?.forEach(r => { if (r.activity_id) childIds.add(r.activity_id) })

    if (childIds.size === 0) {
      return NextResponse.json({
        children: [],
        summary: { totalMatched: 0, totalDiscrepancy: 0, percentReconciled: 100, matchedCount: 0, unmatchedFundCount: 0, unmatchedChildCount: 0, mismatchCount: 0 },
      })
    }

    const childIdArray = Array.from(childIds)

    // Get child activity titles
    const { data: childActivities } = await supabase
      .from('activities')
      .select('id, title_narrative')
      .in('id', childIdArray)

    const childTitleMap: Record<string, string> = {}
    childActivities?.forEach(c => { childTitleMap[c.id] = c.title_narrative })

    // Fund-side outgoing (types 2, 3) to children
    const { data: fundOutgoing } = await supabase
      .from('transactions')
      .select('uuid, transaction_type, value, currency, transaction_date, value_date, receiver_activity_uuid, receiver_org_name, value_usd, usd_value')
      .eq('activity_id', fundId)
      .in('transaction_type', ['2', '3'])

    // Child-side incoming from this fund
    const { data: childIncoming } = await supabase
      .from('transactions')
      .select('uuid, activity_id, transaction_type, value, currency, transaction_date, value_date, provider_org_name, value_usd, usd_value')
      .in('activity_id', childIdArray)
      .in('transaction_type', ['1', '11'])
      .eq('provider_activity_uuid', fundId)

    // Group by child activity
    const reconciliation: Record<string, {
      childId: string
      childTitle: string
      fundTransactions: any[]
      childTransactions: any[]
      matches: any[]
      unmatchedFund: any[]
      unmatchedChild: any[]
      mismatches: any[]
      fundTotal: number
      childTotal: number
      discrepancy: number
    }> = {}

    // Initialize for all children
    childIdArray.forEach(id => {
      reconciliation[id] = {
        childId: id,
        childTitle: childTitleMap[id] || 'Unknown',
        fundTransactions: [],
        childTransactions: [],
        matches: [],
        unmatchedFund: [],
        unmatchedChild: [],
        mismatches: [],
        fundTotal: 0,
        childTotal: 0,
        discrepancy: 0,
      }
    })

    // Populate fund-side transactions
    fundOutgoing?.forEach(t => {
      const childId = t.receiver_activity_uuid
      if (childId && reconciliation[childId]) {
        const usd = getUsdValue(t)
        reconciliation[childId].fundTransactions.push({
          id: t.uuid,
          type: t.transaction_type,
          amount: usd,
          originalAmount: t.value,
          currency: t.currency,
          date: t.transaction_date || t.value_date,
          matched: false,
        })
        reconciliation[childId].fundTotal += usd
      }
    })

    // Populate child-side transactions
    childIncoming?.forEach(t => {
      const childId = t.activity_id
      if (childId && reconciliation[childId]) {
        const usd = getUsdValue(t)
        reconciliation[childId].childTransactions.push({
          id: t.uuid,
          type: t.transaction_type,
          amount: usd,
          originalAmount: t.value,
          currency: t.currency,
          date: t.transaction_date || t.value_date,
          matched: false,
        })
        reconciliation[childId].childTotal += usd
      }
    })

    // Match transactions per child
    let totalMatched = 0, totalDiscrepancy = 0
    let matchedCount = 0, unmatchedFundCount = 0, unmatchedChildCount = 0, mismatchCount = 0

    Object.values(reconciliation).forEach(child => {
      const fundTxns = [...child.fundTransactions]
      const childTxns = [...child.childTransactions]

      // Try to match: same amount + date within tolerance
      fundTxns.forEach(ft => {
        if (ft.matched) return
        const matchIdx = childTxns.findIndex(ct => {
          if (ct.matched) return false
          const amountMatch = Math.abs(ft.amount - ct.amount) < 0.01
          const dateMatch = datesWithinTolerance(ft.date, ct.date, DATE_TOLERANCE_DAYS)
          return amountMatch && dateMatch
        })

        if (matchIdx >= 0) {
          ft.matched = true
          childTxns[matchIdx].matched = true
          child.matches.push({
            fundTransaction: ft,
            childTransaction: childTxns[matchIdx],
            status: 'matched',
          })
          totalMatched += ft.amount
          matchedCount++
        }
      })

      // Try to find amount mismatches (same date range, different amounts)
      fundTxns.forEach(ft => {
        if (ft.matched) return
        const mismatchIdx = childTxns.findIndex(ct => {
          if (ct.matched) return false
          return datesWithinTolerance(ft.date, ct.date, DATE_TOLERANCE_DAYS)
        })

        if (mismatchIdx >= 0) {
          ft.matched = true
          childTxns[mismatchIdx].matched = true
          child.mismatches.push({
            fundTransaction: ft,
            childTransaction: childTxns[mismatchIdx],
            status: 'amount_mismatch',
            discrepancy: ft.amount - childTxns[mismatchIdx].amount,
          })
          totalDiscrepancy += Math.abs(ft.amount - childTxns[mismatchIdx].amount)
          mismatchCount++
        }
      })

      // Remaining unmatched
      fundTxns.filter(ft => !ft.matched).forEach(ft => {
        child.unmatchedFund.push({ ...ft, status: 'unmatched_fund' })
        totalDiscrepancy += ft.amount
        unmatchedFundCount++
      })

      childTxns.filter(ct => !ct.matched).forEach(ct => {
        child.unmatchedChild.push({ ...ct, status: 'unmatched_child' })
        totalDiscrepancy += ct.amount
        unmatchedChildCount++
      })

      child.discrepancy = child.fundTotal - child.childTotal
    })

    const totalTransactions = matchedCount + mismatchCount + unmatchedFundCount + unmatchedChildCount
    const percentReconciled = totalTransactions > 0 ? Math.round((matchedCount / totalTransactions) * 100) : 100

    const children = Object.values(reconciliation)
      .filter(c => c.fundTransactions.length > 0 || c.childTransactions.length > 0)
      .sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy))

    return NextResponse.json({
      children,
      summary: {
        totalMatched,
        totalDiscrepancy,
        percentReconciled,
        matchedCount,
        unmatchedFundCount,
        unmatchedChildCount,
        mismatchCount,
      },
    })
  } catch (error: any) {
    console.error('[Fund Reconciliation] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

function getUsdValue(t: any): number {
  return t.value_usd || t.usd_value || t.value || 0
}

function datesWithinTolerance(date1: string | null, date2: string | null, days: number): boolean {
  if (!date1 || !date2) return !date1 && !date2
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  return Math.abs(d1 - d2) <= days * 24 * 60 * 60 * 1000
}
