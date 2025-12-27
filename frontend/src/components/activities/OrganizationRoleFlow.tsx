"use client"

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts'

interface OrganizationRoleFlowProps {
  data: {
    nodes: Array<{
      id: string
      name: string
      role: string
    }>
    links: any[]
  } | null
  transactions?: any[]
}

const ROLE_LABELS: Record<string, string> = {
  '1': 'Funding',
  '2': 'Accountable',
  '3': 'Extending',
  '4': 'Implementing'
}

// Color palette: Primary Scarlet, Blue Slate, Cool Steel, Pale Slate
const ROLE_COLORS: Record<string, string> = {
  '1': '#dc2625',
  '2': '#4c5568',
  '3': '#7b95a7',
  '4': '#cfd0d5'
}

export default function OrganizationRoleFlow({ data, transactions = [] }: OrganizationRoleFlowProps) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center">
          <p className="font-medium">No organization role data available</p>
          <p className="text-xs mt-2">Add participating organizations to see role-based financial flow</p>
        </div>
      </div>
    )
  }

  // Helper function to normalize role to string code (1-4)
  const normalizeRole = (role: any): string => {
    if (!role) return 'unknown'
    
    // If already a string code (1-4), use it
    if (typeof role === 'string' && /^[1-4]$/.test(role)) {
      return role
    }
    
    // If numeric, convert to string
    if (typeof role === 'number' && role >= 1 && role <= 4) {
      return String(role)
    }
    
    // Map role_type strings to codes
    const roleTypeMap: Record<string, string> = {
      'funding': '1',
      'government': '2',
      'extending': '3',
      'implementing': '4'
    }
    
    if (typeof role === 'string' && roleTypeMap[role.toLowerCase()]) {
      return roleTypeMap[role.toLowerCase()]
    }
    
    return 'unknown'
  }

  // Debug logging
  React.useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      console.log('[OrganizationRoleFlow] Received data:', {
        nodesCount: data.nodes.length,
        roles: data.nodes.map((n: any) => ({ name: n.name, role: n.role, roleType: typeof n.role }))
      })
    }
  }, [data])

  // Group organizations by role
  const roleGroups = data.nodes.reduce((acc: Record<string, { count: number; total: number; orgs: string[] }>, node) => {
    const role = normalizeRole(node.role)
    
    if (!acc[role]) {
      acc[role] = { count: 0, total: 0, orgs: [] }
    }
    acc[role].count++
    acc[role].orgs.push(node.name)
    
    // Calculate total value from transactions where this org is provider
    const orgTransactions = transactions.filter((t: any) => 
      t.provider_org_name === node.name || 
      t.provider_org_id === node.id ||
      (t.provider_organization && (
        t.provider_organization.name === node.name ||
        t.provider_organization.id === node.id
      ))
    )
    const orgTotal = orgTransactions.reduce((sum: number, t: any) => 
      sum + (t.value_usd || t.usd_value || t.value || 0), 0
    )
    acc[role].total += orgTotal
    
    return acc
  }, {})

  // Convert to chart data
  const chartData = Object.entries(roleGroups).map(([role, data]) => ({
    role: ROLE_LABELS[role] || `Role ${role}`,
    roleCode: role,
    organizations: data.count,
    totalValue: data.total,
    orgNames: data.orgs.join(', ')
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="text-center">
          <p className="font-medium">No role data to display</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{data.role}</p>
          <p className="text-sm text-slate-600">
            <span className="font-medium">Organizations: </span>
            {data.organizations}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-medium">Total Value: </span>
            {formatCurrency(data.totalValue)}
          </p>
          {data.orgNames && (
            <p className="text-xs text-slate-500 mt-2 max-w-xs">
              {data.orgNames}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="role" 
            stroke="#64748B" 
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={formatCurrency} 
            stroke="#64748B" 
            fontSize={12} 
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
          <Legend />
          <Bar dataKey="organizations" name="Number of Organizations" fill="#dc2625" radius={[4, 4, 0, 0]} />
          <Bar dataKey="totalValue" name="Total Value (USD)" fill="#4c5568" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Role summary table */}
      <div className="mt-6 space-y-2">
        <p className="text-sm font-semibold text-slate-900">Role Summary</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chartData.map((item) => (
            <div key={item.roleCode} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: ROLE_COLORS[item.roleCode] || '#64748B' }}
                  />
                  <span className="text-sm font-medium text-slate-900">{item.role}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{item.organizations} orgs</p>
                  <p className="text-xs text-slate-600">{formatCurrency(item.totalValue)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

