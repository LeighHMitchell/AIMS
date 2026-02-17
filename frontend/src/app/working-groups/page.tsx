"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlusIcon, SearchIcon, NetworkIcon, Users, UserCheck, Calendar, LayoutGrid, Table as TableIcon, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'

interface WorkingGroup {
  id: string
  code: string
  label: string
  sector_code?: string
  group_type?: string
  description?: string
  is_active: boolean
  status: string
  member_count?: number
  activities_count?: number
  lead_person?: {
    name: string
    organization: string
  }
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  technical: 'Technical WG',
  development_partner: 'Development Partner WG',
  government: 'Government WG',
  joint: 'Joint WG',
  issue_specific: 'Issue-Specific WG',
  coordination: 'Coordination Group',
  thematic: 'Thematic WG',
  sub_working_group: 'Sub-Working Group',
}

export default function WorkingGroupsPage() {
  const router = useRouter()
  const { isSuperUser } = useUserRole()
  const [workingGroups, setWorkingGroups] = useState<WorkingGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<WorkingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')

  useEffect(() => {
    fetchWorkingGroups()
  }, [])

  const fetchWorkingGroups = async () => {
    try {
      const response = await fetch('/api/working-groups')
      if (!response.ok) throw new Error('Failed to fetch working groups')

      const data = await response.json()

      const transformedData = data.map((wg: any) => ({
        ...wg,
        status: wg.status || (wg.is_active ? 'active' : 'inactive'),
        member_count: wg.member_count || 0,
        activities_count: wg.activities_count || 0,
        lead_person: wg.lead_person || null
      }))

      setWorkingGroups(transformedData)
      setFilteredGroups(transformedData)
    } catch (error) {
      console.error('Error fetching working groups:', error)
      toast.error('Failed to load working groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = workingGroups

    if (searchQuery) {
      filtered = filtered.filter(wg =>
        wg.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wg.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(wg => wg.status === selectedStatus)
    }

    setFilteredGroups(filtered)
  }, [searchQuery, selectedStatus, workingGroups])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Groups</h1>
            <p className="mt-2 text-gray-600">
              Technical and Sector Working Groups for coordination and collaboration
            </p>
          </div>
          <Button className="gap-2" onClick={() => router.push('/working-groups/new')}>
            <PlusIcon className="h-5 w-5" />
            New Working Group
          </Button>
        </div>

        {/* Summary Cards - Monochrome */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Groups</p>
                  <p className="text-2xl font-bold text-gray-900">{workingGroups.length}</p>
                </div>
                <NetworkIcon className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Groups</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {workingGroups.filter(wg => wg.status === 'active').length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {workingGroups.reduce((sum, wg) => sum + (wg.member_count || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Linked Activities</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {workingGroups.reduce((sum, wg) => sum + (wg.activities_count || 0), 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters + View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search working groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('table')}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((wg) => (
              <Card
                key={wg.id}
                className="hover:shadow-lg transition-shadow cursor-pointer relative group"
                onClick={() => router.push(`/working-groups/${wg.id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold line-clamp-2">
                        {wg.label}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{wg.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={wg.status === 'active' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {wg.status}
                      </Badge>
                    </div>
                  </div>
                  {wg.group_type && (
                    <Badge variant="outline" className="text-xs mt-2 w-fit">
                      {GROUP_TYPE_LABELS[wg.group_type] || wg.group_type}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent>
                  {wg.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {wg.description}
                    </p>
                  )}

                  {wg.lead_person && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500">Chair</p>
                      <p className="text-sm font-medium">{wg.lead_person.name}</p>
                      <p className="text-xs text-gray-500">{wg.lead_person.organization}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{wg.member_count || 0} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{wg.activities_count || 0} activities</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit button for super users */}
                  {isSuperUser() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/working-groups/${wg.id}/edit`)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Activities</TableHead>
                  {isSuperUser() && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((wg) => (
                  <TableRow
                    key={wg.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/working-groups/${wg.id}`)}
                  >
                    <TableCell className="font-medium">{wg.label}</TableCell>
                    <TableCell className="text-gray-500 font-mono text-sm">{wg.code}</TableCell>
                    <TableCell>
                      {wg.group_type ? (
                        <Badge variant="outline" className="text-xs">
                          {GROUP_TYPE_LABELS[wg.group_type] || wg.group_type}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={wg.status === 'active' ? 'default' : 'secondary'}>
                        {wg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{wg.member_count || 0}</TableCell>
                    <TableCell className="text-right">{wg.activities_count || 0}</TableCell>
                    {isSuperUser() && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/working-groups/${wg.id}/edit`)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No working groups found matching your criteria</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
