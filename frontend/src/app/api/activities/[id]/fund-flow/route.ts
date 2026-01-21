import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { supabase, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    // Handle both sync and async params (Next.js 14/15 compatibility)
    const resolvedParams = await Promise.resolve(params)
    const activityId = resolvedParams.id
    
    console.log('\n')
    console.log('========================================')
    console.log('[Fund Flow] ===== ENDPOINT CALLED =====')
    console.log('[Fund Flow] Request URL:', request.url)
    console.log('[Fund Flow] Activity ID:', activityId)
    console.log('[Fund Flow] Activity ID type:', typeof activityId)
    console.log('[Fund Flow] Activity ID length:', activityId?.length)
    console.log('[Fund Flow] Params resolved:', JSON.stringify(resolvedParams))
    console.log('========================================')
    console.log('\n')
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection not initialized' },
        { status: 500 }
      )
    }

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      )
    }

    // Fetch transactions with provider/receiver organizations
    // Include transactions that have either org_id OR org_name (not requiring both)
    // First, try a simple query without joins to verify transactions exist
    let simpleCount = null
    try {
      const countResult = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activityId)
      simpleCount = countResult.count
      console.log(`[Fund Flow] Simple count (no joins): ${simpleCount} transactions`)
    } catch (countError) {
      console.error('[Fund Flow] Error getting simple count:', countError)
      // Continue anyway - the main query will handle errors
    }
    
    // First try without JOINs to see if transactions exist
    // Then we'll fetch organizations separately if needed
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        uuid,
        provider_org_id,
        provider_org_name,
        provider_org_ref,
        receiver_org_id,
        receiver_org_name,
        receiver_org_ref,
        value_usd,
        usd_value,
        value,
        currency,
        transaction_type,
        finance_type,
        transaction_date,
        value_date
      `)
      .eq('activity_id', activityId)

    if (transactionsError) {
      console.error('[Fund Flow] Error fetching transactions:', transactionsError)
      // If there's an error, transactions will be null - ensure we use empty array
    }
    
    // Ensure we have an array, even if error occurred
    const safeTransactions = transactions || []
    console.log(`[Fund Flow] ===== TRANSACTION QUERY RESULTS =====`)
    console.log(`[Fund Flow] Activity ID: ${activityId}`)
    console.log(`[Fund Flow] Transactions fetched: ${safeTransactions.length}`)
    console.log(`[Fund Flow] Query error:`, transactionsError ? JSON.stringify(transactionsError, null, 2) : 'None')
    
    if (transactionsError) {
      console.error('[Fund Flow] Transaction query error details:', JSON.stringify(transactionsError, null, 2))
    }
    
    // If no transactions found, try a simple query without JOINs to verify transactions exist
    if (safeTransactions.length === 0 && !transactionsError) {
      console.log('[Fund Flow] No transactions found with JOINs, checking simple query...')
      const { data: simpleTransactions, error: simpleError } = await supabase
        .from('transactions')
        .select('uuid, activity_id, provider_org_id, receiver_org_id')
        .eq('activity_id', activityId)
        .limit(5)
      
      console.log(`[Fund Flow] Simple query result: ${simpleTransactions?.length || 0} transactions`)
      if (simpleError) {
        console.error('[Fund Flow] Simple query error:', JSON.stringify(simpleError, null, 2))
      } else if (simpleTransactions && simpleTransactions.length > 0) {
        console.log('[Fund Flow] Sample simple transaction:', JSON.stringify(simpleTransactions[0], null, 2))
        console.log('[Fund Flow] ⚠️ Transactions exist but JOIN query returned 0 - likely JOIN issue')
      }
    }
    
    // Log sample transaction structure for debugging
    if (safeTransactions.length > 0) {
      console.log('[Fund Flow] Sample transaction structure:', JSON.stringify(safeTransactions[0], null, 2))
    } else {
      console.warn(`[Fund Flow] No transactions found for activity_id: ${activityId}`)
      // Try a direct query to see if transactions exist at all
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activityId)
      console.log(`[Fund Flow] Direct count query result: ${count} transactions exist for this activity_id`)
    }

    // Fetch planned disbursements with provider/receiver organizations
    const { data: plannedDisbursements, error: disbursementsError } = await supabase
      .from('planned_disbursements')
      .select(`
        uuid,
        provider_org_id,
        provider_org_name,
        provider_org_ref,
        receiver_org_id,
        receiver_org_name,
        receiver_org_ref,
        usd_amount,
        amount,
        currency
      `)
      .eq('activity_id', activityId)

    if (disbursementsError) {
      console.error('[Fund Flow] Error fetching planned disbursements:', disbursementsError)
    }
    
    // Ensure we have an array, even if error occurred
    const safePlannedDisbursements = plannedDisbursements || []
    console.log(`[Fund Flow] Fetched ${safePlannedDisbursements.length} planned disbursements`)
    
    // Log sample planned disbursement structure for debugging
    if (safePlannedDisbursements.length > 0) {
      console.log('[Fund Flow] Sample planned disbursement structure:', JSON.stringify(safePlannedDisbursements[0], null, 2))
    }

    // Helper function to build graph data from transactions
    async function buildGraphData(items: any[], type: 'transaction' | 'planned_disbursement') {
      console.log(`[Fund Flow] buildGraphData called with ${items.length} ${type} items`)
      const nodes: any[] = []
      const links: any[] = []
      const nodeMap = new Map<string, any>()
      
      let skippedNoOrg = 0
      let skippedNoAmount = 0
      let processed = 0
      let partialData = 0

      // Use for...of instead of forEach to support async/await
      for (const item of items) {
        // Get provider org details - use direct fields from transaction/planned disbursement
        const providerId = item.provider_org_id || item.provider_org_ref || null
        const providerName = item.provider_org_name || null
        const hasProvider = !!(providerId || providerName)

        // Get receiver org details - use direct fields from transaction/planned disbursement
        const receiverId = item.receiver_org_id || item.receiver_org_ref || null
        const receiverName = item.receiver_org_name || null
        const hasReceiver = !!(receiverId || receiverName)
        
        // Debug log for first few items
        if (processed + skippedNoOrg + skippedNoAmount < 3) {
          console.log(`[Fund Flow] Processing ${type} item ${processed + skippedNoOrg + skippedNoAmount + 1}:`, {
            hasProvider,
            hasReceiver,
            providerId,
            providerName,
            receiverId,
            receiverName,
            value: item.value || item.amount,
            value_usd: item.value_usd || item.usd_value,
            currency: item.currency
          })
        }

        // Skip only if BOTH provider AND receiver are missing
        if (!hasProvider && !hasReceiver) {
          skippedNoOrg++
          continue
        }
        
        // Track partial data (only one org known)
        if ((hasProvider && !hasReceiver) || (!hasProvider && hasReceiver)) {
          partialData++
        }
        
        // Use name as fallback if no ID, or "Unknown" if neither ID nor name exists
        const finalProviderId = providerId || (providerName ? `name-${providerName}` : 'unknown-provider')
        const finalProviderName = providerName || 'Unknown Provider'
        const finalReceiverId = receiverId || (receiverName ? `name-${receiverName}` : 'unknown-receiver')
        const finalReceiverName = receiverName || 'Unknown Receiver'

        // Get amount - convert to USD if needed
        let amount = 0
        let currency = 'USD' // All amounts will be in USD
        
        if (type === 'transaction') {
          // First check if USD values already exist
          if (item.value_usd || item.usd_value) {
            amount = item.value_usd || item.usd_value || 0
          } else if (item.value && item.currency) {
            // Convert to USD on-the-fly
            try {
              const valueDate = item.value_date 
                ? new Date(item.value_date) 
                : item.transaction_date 
                ? new Date(item.transaction_date) 
                : new Date()
              
              // Check if currency converter is available
              if (!fixedCurrencyConverter || !fixedCurrencyConverter.convertToUSD) {
                // Converter not available - use USD values only or skip
                if (item.currency === 'USD') {
                  amount = item.value
                } else {
                  skippedNoAmount++
                  continue
                }
              } else {
                // Set a timeout for currency conversion to prevent hanging
                const conversionPromise = fixedCurrencyConverter.convertToUSD(
                  item.value,
                  item.currency,
                  valueDate
                )
                
                // Add timeout wrapper
                const timeoutPromise = new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Conversion timeout')), 10000)
                )
                
                let result
                try {
                  result = await Promise.race([conversionPromise, timeoutPromise])
                } catch (conversionError) {
                  // Timeout or conversion error - treat as failed conversion
                  result = { success: false, error: conversionError instanceof Error ? conversionError.message : 'Conversion failed' }
                }
                
                if (result && result.success && result.usd_amount) {
                  amount = result.usd_amount
                  console.log(`[Fund Flow] Converted transaction ${item.value} ${item.currency} → $${result.usd_amount} USD`)
                } else if (item.currency === 'USD') {
                  // If conversion fails but currency is USD, use original value
                  amount = item.value
                } else {
                  // Conversion failed for non-USD currency - skip this transaction
                  skippedNoAmount++
                  continue
                }
              }
            } catch (error) {
              console.error('[Fund Flow] Error converting transaction to USD:', error)
              // If conversion fails but currency is USD, use original value
              if (item.currency === 'USD') {
                amount = item.value
              } else {
                skippedNoAmount++
                continue
              }
            }
          } else {
            // No value or currency - skip
            skippedNoAmount++
            continue
          }
        } else {
          // Planned disbursements
          if (item.usd_amount) {
            amount = item.usd_amount
          } else if (item.amount && item.currency) {
            // Convert to USD on-the-fly
            try {
              // Check if currency converter is available
              if (!fixedCurrencyConverter || !fixedCurrencyConverter.convertToUSD) {
                // Converter not available - use USD values only or skip
                if (item.currency === 'USD') {
                  amount = item.amount
                } else {
                  skippedNoAmount++
                  continue
                }
              } else {
                const valueDate = new Date() // Planned disbursements might not have dates
                // Set a timeout for currency conversion to prevent hanging
                const conversionPromise = fixedCurrencyConverter.convertToUSD(
                  item.amount,
                  item.currency,
                  valueDate
                )
                
                // Add timeout wrapper
                const timeoutPromise = new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Conversion timeout')), 10000)
                )
                
                let result
                try {
                  result = await Promise.race([conversionPromise, timeoutPromise])
                } catch (conversionError) {
                  // Timeout or conversion error - treat as failed conversion
                  result = { success: false, error: conversionError instanceof Error ? conversionError.message : 'Conversion failed' }
                }
                
                if (result && result.success && result.usd_amount) {
                  amount = result.usd_amount
                  console.log(`[Fund Flow] Converted planned disbursement ${item.amount} ${item.currency} → $${result.usd_amount} USD`)
                } else if (item.currency === 'USD') {
                  amount = item.amount
                } else {
                  skippedNoAmount++
                  continue
                }
              }
            } catch (error) {
              console.error('[Fund Flow] Error converting planned disbursement to USD:', error)
              if (item.currency === 'USD') {
                amount = item.amount
              } else {
                skippedNoAmount++
                continue
              }
            }
          } else {
            skippedNoAmount++
            continue
          }
        }

        // Skip only if amount is exactly 0, null, undefined, or NaN
        // Negative amounts are valid (e.g., refunds, reversals) and should be included
        if (amount == null || amount === 0 || (typeof amount === 'number' && isNaN(amount))) {
          console.log(`[Fund Flow] Skipping ${type} - amount is ${amount} (zero, null, undefined, or NaN)`)
          skippedNoAmount++
          continue
        }
        
        console.log(`[Fund Flow] Processing ${type}: amount=${amount} USD, provider=${finalProviderName}, receiver=${finalReceiverName}`)
        
        processed++

        // Add provider node
        const providerNodeId = `org-${finalProviderId}`
        if (!nodeMap.has(providerNodeId)) {
          const node = {
            id: providerNodeId,
            name: finalProviderName,
            type: 'provider',
            organizationId: finalProviderId,
            isUnknown: !hasProvider
          }
          nodes.push(node)
          nodeMap.set(providerNodeId, node)
        }

        // Add receiver node
        const receiverNodeId = `org-${finalReceiverId}`
        if (!nodeMap.has(receiverNodeId)) {
          const node = {
            id: receiverNodeId,
            name: finalReceiverName,
            type: 'receiver',
            organizationId: finalReceiverId,
            isUnknown: !hasReceiver
          }
          nodes.push(node)
          nodeMap.set(receiverNodeId, node)
        }

        // Create or update link
        const linkKey = `${providerNodeId}-${receiverNodeId}`
        const existingLink = links.find(
          (l: any) => l.source === providerNodeId && l.target === receiverNodeId && l.type === type
        )

        if (existingLink) {
          existingLink.value += amount
          existingLink.count = (existingLink.count || 0) + 1
        } else {
          const linkData: any = {
            source: providerNodeId,
            target: receiverNodeId,
            value: amount,
            type,
            count: 1
          }
          
          // Add transaction-specific metadata for visualization
          if (type === 'transaction') {
            linkData.transaction_type = item.transaction_type
            linkData.finance_type = item.finance_type
            linkData.currency = item.currency || 'USD'
            linkData.has_usd_value = !!(item.value_usd || item.usd_value)
          }
          
          links.push(linkData)
        }
      }
      
      console.log(`[Fund Flow] ${type}: Processed ${processed}, skipped (no org): ${skippedNoOrg}, skipped (no amount): ${skippedNoAmount}, partial data: ${partialData}, total items: ${items.length}`)
      console.log(`[Fund Flow] ${type}: Created ${nodes.length} nodes and ${links.length} links`)

      return { 
        nodes, 
        links,
        dataQuality: {
          total: items.length,
          processed,
          skippedNoAmount,
          skippedNoOrgs: skippedNoOrg,
          partialData
        }
      }
    }

    // Build graph data for transactions (with USD conversion)
    let transactionsData
    try {
      transactionsData = await buildGraphData(safeTransactions, 'transaction')
    } catch (error) {
      console.error('[Fund Flow] Error building transactions graph data:', error)
      transactionsData = { nodes: [], links: [], dataQuality: { total: safeTransactions.length, processed: 0, skippedNoAmount: 0, skippedNoOrgs: 0, partialData: 0 } }
    }

    // Build graph data for planned disbursements (with USD conversion)
    let plannedDisbursementsData
    try {
      plannedDisbursementsData = await buildGraphData(safePlannedDisbursements, 'planned_disbursement')
    } catch (error) {
      console.error('[Fund Flow] Error building planned disbursements graph data:', error)
      plannedDisbursementsData = { nodes: [], links: [], dataQuality: { total: safePlannedDisbursements.length, processed: 0, skippedNoAmount: 0, skippedNoOrgs: 0, partialData: 0 } }
    }
    
    console.log(`[Fund Flow] Final result - Transactions: ${transactionsData.nodes.length} nodes, ${transactionsData.links.length} links`)
    console.log(`[Fund Flow] Final result - Planned Disbursements: ${plannedDisbursementsData.nodes.length} nodes, ${plannedDisbursementsData.links.length} links`)
    console.log(`[Fund Flow] Transactions dataQuality:`, JSON.stringify(transactionsData.dataQuality, null, 2))
    console.log(`[Fund Flow] Planned disbursements dataQuality:`, JSON.stringify(plannedDisbursementsData.dataQuality, null, 2))

    return NextResponse.json({
      transactions: {
        nodes: transactionsData.nodes,
        links: transactionsData.links
      },
      plannedDisbursements: {
        nodes: plannedDisbursementsData.nodes,
        links: plannedDisbursementsData.links
      },
      dataQuality: {
        transactions: transactionsData.dataQuality,
        plannedDisbursements: plannedDisbursementsData.dataQuality
      }
    })
  } catch (error) {
    console.error('[Fund Flow] ===== UNEXPECTED ERROR =====')
    console.error('[Fund Flow] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[Fund Flow] Error message:', error instanceof Error ? error.message : 'Unknown error')
    
    // Try to log stack trace safely
    if (error instanceof Error && error.stack) {
      console.error('[Fund Flow] Error stack:', error.stack)
    }
    
    // Return empty data structure instead of error to prevent UI crashes
    // The UI can handle empty data gracefully
    return NextResponse.json({
      transactions: {
        nodes: [],
        links: []
      },
      plannedDisbursements: {
        nodes: [],
        links: []
      },
      dataQuality: {
        transactions: {
          total: 0,
          processed: 0,
          skippedNoAmount: 0,
          skippedNoOrgs: 0,
          partialData: 0
        },
        plannedDisbursements: {
          total: 0,
          processed: 0,
          skippedNoAmount: 0,
          skippedNoOrgs: 0,
          partialData: 0
        }
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 200 }) // Return 200 with empty data so UI doesn't break
  }
}

