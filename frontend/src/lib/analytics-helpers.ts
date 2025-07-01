import { GraphData, GraphNode, GraphLink } from '@/components/analytics/AidFlowNetworkGraph'

interface Transaction {
  id: string
  activity_id: string
  transaction_type: string
  value: number
  provider_org_id?: string
  receiver_org_id?: string
  provider_org_name?: string
  receiver_org_name?: string
  flow_type?: string
  aid_type?: string
  status: string
  transaction_date: string
}

interface Organization {
  id: string
  name: string
  organization_type: string
  sector?: string
}

interface Activity {
  id: string
  implementing_org_id?: string
  recipient_org_id?: string
}

export function buildAidFlowGraphData(
  transactions: Transaction[],
  organizations: Organization[],
  activities?: Activity[],
  options?: {
    limit?: number
    minValue?: number
    transactionTypes?: string[]
  }
): GraphData {
  const { 
    limit = 200, 
    minValue = 0,
    transactionTypes = ['1', '2', '3', '4'] // All transaction types
  } = options || {}

  console.log('[buildAidFlowGraphData] Starting with:', {
    transactions: transactions.length,
    organizations: organizations.length,
    options
  })

  // Create organization map for quick lookup
  const orgMap = new Map<string, Organization>()
  organizations.forEach(org => {
    if (org.id) {
      orgMap.set(org.id, org)
    }
  })

  // Create nodes map to track unique organizations
  const nodesMap = new Map<string, GraphNode>()

  // Create links map to aggregate flows between organizations
  const linksMap = new Map<string, GraphLink>()

  // Filter and process transactions
  const validTransactions = transactions.filter(t => {
    // Must have a value
    if (!t.value || parseFloat(t.value.toString()) <= minValue) return false
    
    // Must have at least one organization reference (ID or name)
    const hasProvider = t.provider_org_id || t.provider_org_name
    const hasReceiver = t.receiver_org_id || t.receiver_org_name
    if (!hasProvider && !hasReceiver) return false
    
    // Transaction type filter (optional)
    if (transactionTypes.length > 0 && t.transaction_type && !transactionTypes.includes(t.transaction_type)) {
      return false
    }
    
    return true
  })

  console.log('[buildAidFlowGraphData] Valid transactions:', validTransactions.length)

  // Process each transaction
  validTransactions.forEach(transaction => {
    const value = parseFloat(transaction.value.toString())
    
    // Get provider info (prefer ID, fallback to name)
    let providerId = transaction.provider_org_id
    let providerName = transaction.provider_org_name
    let providerOrg = providerId ? orgMap.get(providerId) : null
    
    // If we have an org from the map, use its data
    if (providerOrg) {
      providerName = providerOrg.name || providerName
    }
    
    // If no ID but has name, use name as ID
    if (!providerId && providerName) {
      providerId = `name-${providerName}`
    }
    
    // Get receiver info (prefer ID, fallback to name)
    let receiverId = transaction.receiver_org_id
    let receiverName = transaction.receiver_org_name
    let receiverOrg = receiverId ? orgMap.get(receiverId) : null
    
    // If we have an org from the map, use its data
    if (receiverOrg) {
      receiverName = receiverOrg.name || receiverName
    }
    
    // If no ID but has name, use name as ID
    if (!receiverId && receiverName) {
      receiverId = `name-${receiverName}`
    }

    // Add provider node
    if (providerId && (providerOrg || providerName)) {
      if (!nodesMap.has(providerId)) {
        nodesMap.set(providerId, {
          id: providerId,
          name: providerOrg?.name || providerName || `Org ${providerId}`,
          type: providerOrg ? mapOrgTypeToNodeType(providerOrg.organization_type) : 'donor',
          sector: providerOrg?.sector,
          totalIn: 0,
          totalOut: 0
        })
      }
      // Update outflow
      const node = nodesMap.get(providerId)!
      node.totalOut = (node.totalOut || 0) + value
    }

    // Add receiver node
    if (receiverId && (receiverOrg || receiverName)) {
      if (!nodesMap.has(receiverId)) {
        nodesMap.set(receiverId, {
          id: receiverId,
          name: receiverOrg?.name || receiverName || `Org ${receiverId}`,
          type: receiverOrg ? mapOrgTypeToNodeType(receiverOrg.organization_type) : 'recipient',
          sector: receiverOrg?.sector,
          totalIn: 0,
          totalOut: 0
        })
      }
      // Update inflow
      const node = nodesMap.get(receiverId)!
      node.totalIn = (node.totalIn || 0) + value
    }

    // Create link between organizations if both exist
    if (providerId && receiverId && providerId !== receiverId) {
      const linkKey = `${providerId}->${receiverId}`
      
      if (linksMap.has(linkKey)) {
        // Aggregate value for existing link
        const existingLink = linksMap.get(linkKey)!
        existingLink.value += value
      } else {
        // Create new link
        linksMap.set(linkKey, {
          source: providerId,
          target: receiverId,
          value: value,
          flowType: mapTransactionTypeToFlowType(transaction.transaction_type),
          aidType: transaction.aid_type
        })
      }
    }
  })

  // If no nodes were created from transactions, create some from organizations directly
  if (nodesMap.size === 0 && organizations.length > 0) {
    console.log('[buildAidFlowGraphData] No nodes from transactions, using top organizations')
    
    // Add top organizations as nodes
    organizations.slice(0, Math.min(20, organizations.length)).forEach(org => {
      nodesMap.set(org.id, {
        id: org.id,
        name: org.name || `Organization ${org.id}`,
        type: mapOrgTypeToNodeType(org.organization_type),
        sector: org.sector,
        totalIn: 0,
        totalOut: 0
      })
    })
  }

  // Convert maps to arrays and apply limits
  let nodes = Array.from(nodesMap.values())
  let links = Array.from(linksMap.values())

  console.log('[buildAidFlowGraphData] Before limiting:', {
    nodes: nodes.length,
    links: links.length
  })

  // Sort nodes by total flow and limit
  nodes.sort((a, b) => {
    const aTotal = (a.totalIn || 0) + (a.totalOut || 0)
    const bTotal = (b.totalIn || 0) + (b.totalOut || 0)
    return bTotal - aTotal
  })

  if (nodes.length > limit) {
    nodes = nodes.slice(0, limit)
    const nodeIds = new Set(nodes.map(n => n.id))
    
    // Filter links to only include those between limited nodes
    links = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })
  }

  // Sort links by value for better visualization
  links.sort((a, b) => b.value - a.value)

  console.log('[buildAidFlowGraphData] Final result:', {
    nodes: nodes.length,
    links: links.length
  })

  return { nodes, links }
}

function mapOrgTypeToNodeType(orgType: string): GraphNode['type'] {
  if (!orgType) return 'implementer'
  
  switch (orgType.toLowerCase()) {
    case 'donor':
    case 'multilateral':
    case 'foundation':
    case 'bilateral':
      return 'donor'
    case 'government':
    case 'recipient':
    case 'recipient_government':
      return 'recipient'
    case 'ngo':
    case 'implementing':
    case 'implementer':
    case 'implementing_partner':
      return 'implementer'
    case 'sector':
      return 'sector'
    default:
      return 'implementer'
  }
}

function mapTransactionTypeToFlowType(transactionType?: string): GraphLink['flowType'] {
  if (!transactionType) return 'disbursement'
  
  switch (transactionType) {
    case '1':
      return 'commitment' // Incoming funds
    case '2':
      return 'commitment'
    case '3':
      return 'disbursement'
    case '4':
      return 'expenditure'
    default:
      return 'disbursement'
  }
}

// Additional helper to create sector-based graph
export function buildSectorFlowGraphData(
  transactions: Transaction[],
  organizations: Organization[],
  sectors: Array<{ code: string; name: string }>,
  activities: Array<{ id: string; sectors?: Array<{ sector_code: string }> }>
): GraphData {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodesMap = new Map<string, GraphNode>()
  const linksMap = new Map<string, GraphLink>()

  // Create sector nodes
  sectors.forEach(sector => {
    nodesMap.set(`sector-${sector.code}`, {
      id: `sector-${sector.code}`,
      name: sector.name,
      type: 'sector',
      totalIn: 0,
      totalOut: 0
    })
  })

  // Create organization nodes and links to sectors
  const validTransactions = transactions.filter(t => 
    t.status === 'actual' &&
    ['2', '3', '4'].includes(t.transaction_type) &&
    t.value > 10000
  )

  validTransactions.forEach(transaction => {
    const activity = activities.find(a => a.id === transaction.activity_id)
    if (!activity || !activity.sectors || activity.sectors.length === 0) return

    const providerId = transaction.provider_org_id
    if (!providerId) return

    const providerOrg = organizations.find(o => o.id === providerId)
    if (!providerOrg) return

    // Add provider node if not exists
    if (!nodesMap.has(providerId)) {
      nodesMap.set(providerId, {
        id: providerId,
        name: providerOrg.name,
        type: mapOrgTypeToNodeType(providerOrg.organization_type),
        totalOut: 0,
        totalIn: 0
      })
    }

    // Create links from provider to sectors
    const activitySectors = activity.sectors || []
    activitySectors.forEach(activitySector => {
      const sectorNodeId = `sector-${activitySector.sector_code}`
      if (!nodesMap.has(sectorNodeId)) return

      const linkKey = `${providerId}->${sectorNodeId}`
      const valuePerSector = transaction.value / activitySectors.length

      if (linksMap.has(linkKey)) {
        linksMap.get(linkKey)!.value += valuePerSector
      } else {
        linksMap.set(linkKey, {
          source: providerId,
          target: sectorNodeId,
          value: valuePerSector,
          flowType: mapTransactionTypeToFlowType(transaction.transaction_type)
        })
      }

      // Update node totals
      nodesMap.get(providerId)!.totalOut! += valuePerSector
      nodesMap.get(sectorNodeId)!.totalIn! += valuePerSector
    })
  })

  return {
    nodes: Array.from(nodesMap.values()),
    links: Array.from(linksMap.values())
  }
} 