import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fixedCurrencyConverter } from '@/lib/currency-converter'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const activityId = params.id

    // Fetch activity data
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    // Fetch budgets (from activity_budgets table)
    const { data: budgets } = await supabase
      .from('activity_budgets')
      .select('*')
      .eq('activity_id', activityId)

    console.log(`[Financial Analytics] Fetched ${budgets?.length || 0} budgets for activity ${activityId}`)

    // Convert budgets to USD if needed (real-time conversion for missing usd_value)
    if (budgets && budgets.length > 0) {
      for (const budget of budgets) {
        if (!budget.usd_value && budget.value && budget.currency) {
          try {
            const valueDate = budget.value_date ? new Date(budget.value_date) : new Date()
            const result = await fixedCurrencyConverter.convertToUSD(
              budget.value,
              budget.currency,
              valueDate
            )
            if (result.success && result.usd_amount) {
              budget.usd_value = result.usd_amount
              console.log(`[Financial Analytics] Converted budget ${budget.value} ${budget.currency} → $${result.usd_amount} USD`)
            }
          } catch (error) {
            console.error('[Financial Analytics] Error converting budget to USD:', error)
            // If conversion fails, use the original value if it's already in USD
            if (budget.currency === 'USD') {
              budget.usd_value = budget.value
            }
          }
        } else if (budget.currency === 'USD' && !budget.usd_value) {
          // For USD budgets without usd_value, just use the value
          budget.usd_value = budget.value
        }
      }
    }

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        *,
        provider_organization:organizations!provider_org_id(name),
        receiver_organization:organizations!receiver_org_id(name)
      `)
      .eq('activity_id', activityId)

    console.log(`[Financial Analytics] Fetched ${transactions?.length || 0} transactions for activity ${activityId}`)
    if (transactions && transactions.length > 0) {
      const transactionTypes = transactions.reduce((acc: any, t: any) => {
        acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1
        return acc
      }, {})
      console.log(`[Financial Analytics] Transaction types breakdown:`, transactionTypes)
    }

    // Fetch planned disbursements
    const { data: plannedDisbursements } = await supabase
      .from('planned_disbursements')
      .select('*')
      .eq('activity_id', activityId)

    // Fetch participating organizations
    const { data: participatingOrgs } = await supabase
      .from('participating_organizations')
      .select(`
        *,
        organization:organizations(name, iati_identifier)
      `)
      .eq('activity_id', activityId)

    // Process Budget vs Actual by Year
    const budgetsByYear: any = {}
    
    // Add budgets by year
    budgets?.forEach((budget: any) => {
      let year = 'Unknown'
      if (budget.period_start) {
        year = new Date(budget.period_start).getFullYear().toString()
      } else if (budget.period_end) {
        year = new Date(budget.period_end).getFullYear().toString()
      }
      
      console.log(`[Financial Analytics] Processing budget: period_start=${budget.period_start}, year=${year}, usd_value=${budget.usd_value}, value=${budget.value}`)
      
      if (year !== 'Unknown') {
        if (!budgetsByYear[year]) {
          budgetsByYear[year] = { year: parseInt(year), budget: 0, actual: 0 }
        }
        const budgetAmount = budget.usd_value || budget.value || 0
        budgetsByYear[year].budget += budgetAmount
        console.log(`[Financial Analytics] Added ${budgetAmount} to year ${year}, new total: ${budgetsByYear[year].budget}`)
      }
    })

    // Add actual spending from transactions
    transactions?.forEach((transaction: any) => {
      if (transaction.transaction_date && (transaction.transaction_type === '3' || transaction.transaction_type === '4')) {
        const year = new Date(transaction.transaction_date).getFullYear()
        if (!budgetsByYear[year]) {
          budgetsByYear[year] = { year, budget: 0, actual: 0 }
        }
        budgetsByYear[year].actual += transaction.usd_value || transaction.value || 0
      }
    })

    // If we have activity dates but no budget/transaction data, create entries for those years
    if (Object.keys(budgetsByYear).length === 0) {
      const currentYear = new Date().getFullYear()
      const startYear = activity.planned_start_date 
        ? new Date(activity.planned_start_date).getFullYear() 
        : currentYear
      
      // Create at least one entry for current or start year
      budgetsByYear[startYear] = { year: startYear, budget: 0, actual: 0 }
    }

    const budgetVsActual = Object.values(budgetsByYear)
      .filter((item: any) => typeof item.year === 'number')
      .sort((a: any, b: any) => a.year - b.year)
    
    console.log(`[Financial Analytics] Budget vs Actual data:`, JSON.stringify(budgetVsActual, null, 2))

    // Calculate Cumulative Spending
    const transactionsByDate = transactions
      ?.filter((t: any) => t.transaction_date && (t.transaction_type === '3' || t.transaction_type === '4'))
      .map((t: any) => ({
        date: t.transaction_date,
        dateObj: new Date(t.transaction_date),
        amount: t.usd_value || t.value || 0
      }))
      .filter((t: any) => !isNaN(t.dateObj.getTime())) // Filter out invalid dates
      .sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime()) || []

    let cumulative = 0
    let cumulativeData = transactionsByDate.map((t: any) => {
      cumulative += t.amount
      return {
        date: t.date, // Keep ISO date for filtering
        timestamp: t.dateObj.getTime(), // Add timestamp for proper time-based x-axis
        displayDate: t.dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        cumulative
      }
    })

    // Remove duplicates by date and keep the last entry
    let uniqueCumulativeData = cumulativeData.reduce((acc: any[], curr: any) => {
      const existing = acc.findIndex(item => item.date === curr.date)
      if (existing >= 0) {
        acc[existing] = curr
      } else {
        acc.push(curr)
      }
      return acc
    }, [])

    // If no cumulative data from transactions, create placeholder from budgets or activity dates
    if (uniqueCumulativeData.length === 0 && budgets && budgets.length > 0) {
      // Use budget periods to create a cumulative projection
      const sortedBudgets = budgets
        .filter((b: any) => b.period_start)
        .sort((a: any, b: any) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime())
      
      cumulative = 0
      uniqueCumulativeData = sortedBudgets.slice(0, 5).map((budget: any) => {
        cumulative += budget.usd_value || budget.value || 0
        const dateObj = new Date(budget.period_start)
        return {
          date: budget.period_start,
          timestamp: dateObj.getTime(), // Add timestamp for proper time-based x-axis
          displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          cumulative
        }
      })
    }

    // Budget Composition by Type
    let budgetComposition = budgets?.reduce((acc: any[], budget: any) => {
      // Better categorization based on budget_type codes
      let typeName = 'Other'
      if (budget.budget_type === '1') typeName = 'Original'
      else if (budget.budget_type === '2') typeName = 'Revised'
      else if (budget.budget_type) typeName = `Type ${budget.budget_type}`
      
      const existing = acc.find(item => item.name === typeName)
      const value = budget.usd_value || budget.value || 0
      
      if (value > 0) {
        if (existing) {
          existing.value += value
        } else {
          acc.push({ name: typeName, value })
        }
      }
      return acc
    }, []) || []

    // If no budget composition data but we have budgets, group by year or status
    if (budgetComposition.length === 0 && budgets && budgets.length > 0) {
      const budgetsByStatus = budgets.reduce((acc: any, budget: any) => {
        const year = budget.period_start 
          ? new Date(budget.period_start).getFullYear().toString()
          : 'Unspecified'
        const value = budget.usd_value || budget.value || 0
        
        if (value > 0) {
          const existing = acc.find((item: any) => item.name === year)
          if (existing) {
            existing.value += value
          } else {
            acc.push({ name: year, value })
          }
        }
        return acc
      }, [])
      
      if (budgetsByStatus.length > 0) {
        budgetComposition = budgetsByStatus
      }
    }

    // Planned vs Actual Disbursements
    const disbursementsByPeriod: any = {}
    
    plannedDisbursements?.forEach((pd: any) => {
      if (pd.period_start) {
        const dateObj = new Date(pd.period_start)
        if (!isNaN(dateObj.getTime())) {
          const period = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          if (!disbursementsByPeriod[period]) {
            disbursementsByPeriod[period] = { 
              period, 
              date: pd.period_start, // Keep ISO date for filtering
              timestamp: dateObj.getTime(), // Add timestamp for proper time-based x-axis
              planned: 0, 
              actual: 0 
            }
          }
          disbursementsByPeriod[period].planned += pd.usd_amount || pd.amount || 0
        }
      }
    })

    // Add actual disbursements from transactions
    const disbursementTransactions = transactions?.filter((t: any) => t.transaction_type === '3') || []
    console.log(`[Financial Analytics] Found ${disbursementTransactions.length} disbursement transactions (type 3)`)
    
    disbursementTransactions.forEach((transaction: any) => {
      console.log(`[Financial Analytics] Processing transaction: date=${transaction.transaction_date}, type=${transaction.transaction_type}, usd_value=${transaction.usd_value}, value=${transaction.value}`)
      
      if (transaction.transaction_date) {
        const dateObj = new Date(transaction.transaction_date)
        if (!isNaN(dateObj.getTime())) {
          const period = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          if (!disbursementsByPeriod[period]) {
            disbursementsByPeriod[period] = { 
              period, 
              date: transaction.transaction_date,
              timestamp: dateObj.getTime(), // Add timestamp for proper time-based x-axis
              planned: 0, 
              actual: 0 
            }
          }
          const actualAmount = transaction.usd_value || transaction.value || 0
          disbursementsByPeriod[period].actual += actualAmount
          console.log(`[Financial Analytics] Added ${actualAmount} to ${period} actual disbursements`)
        }
      }
    })

    let disbursements = Object.values(disbursementsByPeriod).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    console.log(`[Financial Analytics] Disbursements data:`, JSON.stringify(disbursements, null, 2))

    // If no disbursement data but we have budgets, create placeholder using budget periods
    if (disbursements.length === 0 && budgets && budgets.length > 0) {
      const budgetPeriods = budgets
        .filter((b: any) => b.period_start)
        .slice(0, 6)
        .map((budget: any) => {
          const dateObj = new Date(budget.period_start)
          return {
            period: dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            date: budget.period_start,
            timestamp: dateObj.getTime(), // Add timestamp for proper time-based x-axis
            planned: budget.usd_value || budget.value || 0,
            actual: 0
          }
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      if (budgetPeriods.length > 0) {
        disbursements = budgetPeriods
      }
    }

    // Funding Source Breakdown (by organization role and transactions)
    let fundingSources: any[] = []
    
    // First try to get funding from participating organizations with role = 1 (Funding)
    const fundingOrgs = participatingOrgs?.filter((org: any) => org.role === '1') || []
    
    if (fundingOrgs.length > 0) {
      fundingSources = fundingOrgs
        .map((org: any) => {
          const orgName = org.organization?.name || org.organization_name || 'Unknown Donor'
          // Calculate total from this funding source via incoming funds transactions
          const total = transactions
            ?.filter((t: any) => 
              t.provider_org_id === org.organization_id && 
              (t.transaction_type === '1' || t.transaction_type === '2') // Incoming funds or commitments
            )
            .reduce((sum: number, t: any) => sum + (t.usd_value || t.value || 0), 0) || 0
          
          return {
            name: orgName,
            value: total
          }
        })
        .filter((source: any) => source.value > 0)
    }
    
    // If no funding sources from participating orgs, try to extract from transactions
    if (fundingSources.length === 0 && transactions && transactions.length > 0) {
      const fundingByProvider: any = {}
      
      transactions
        .filter((t: any) => t.transaction_type === '1' || t.transaction_type === '2') // Incoming funds or commitments
        .forEach((transaction: any) => {
          // Include ALL transactions, even those without provider organizations
          const providerName = transaction.provider_organization?.name 
            || transaction.provider_org_ref 
            || 'Unspecified Donor'
          const value = transaction.usd_value || transaction.value || 0
          
          if (value > 0) {
            if (!fundingByProvider[providerName]) {
              fundingByProvider[providerName] = 0
            }
            fundingByProvider[providerName] += value
          }
        })
      
      fundingSources = Object.entries(fundingByProvider).map(([name, value]) => ({
        name,
        value: value as number
      }))
    }
    
    // If still no funding sources but we have budgets, use budget data
    if (fundingSources.length === 0 && budgets && budgets.length > 0) {
      const totalBudget = budgets.reduce((sum: number, b: any) => 
        sum + (b.usd_value || b.value || 0), 0
      )
      
      if (totalBudget > 0) {
        fundingSources = [
          { name: 'Total Budget', value: totalBudget }
        ]
      }
    }

    // Financial Flow by Organization Role
    const financialFlow = {
      nodes: participatingOrgs?.map((org: any) => ({
        id: org.id,
        name: org.organization?.name || org.organization_name || 'Unknown',
        role: org.role
      })) || [],
      links: [] // Simplified for now - would need more complex logic for Sankey
    }

    // Calculate Commitment vs Disbursement Ratio
    const totalCommitment = transactions
      ?.filter((t: any) => t.transaction_type === '2')
      .reduce((sum: number, t: any) => sum + (t.usd_value || t.value || 0), 0) || 0

    const totalDisbursement = transactions
      ?.filter((t: any) => t.transaction_type === '3')
      .reduce((sum: number, t: any) => sum + (t.usd_value || t.value || 0), 0) || 0

    const commitmentRatio = totalCommitment > 0 ? (totalDisbursement / totalCommitment) * 100 : 0

    return NextResponse.json({
      budgetVsActual,
      cumulative: uniqueCumulativeData,
      budgetComposition,
      disbursements,
      fundingSources,
      financialFlow,
      commitmentRatio,
      totalCommitment,
      totalDisbursement
    })
  } catch (error) {
    console.error('Error fetching financial analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

