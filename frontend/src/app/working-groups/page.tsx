"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UsersIcon, PlusIcon, SearchIcon, FilterIcon, NetworkIcon, Users, UserCheck, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface WorkingGroup {
  id: string
  code: string
  label: string
  sector_code?: string
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

export default function WorkingGroupsPage() {
  const router = useRouter()
  const [workingGroups, setWorkingGroups] = useState<WorkingGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<WorkingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Fetch working groups
  useEffect(() => {
    fetchWorkingGroups()
  }, [])

  const fetchWorkingGroups = async () => {
    try {
      const response = await fetch('/api/working-groups')
      if (!response.ok) throw new Error('Failed to fetch working groups')
      
      const data = await response.json()
      
      // Transform data - use actual counts from API if available
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

  // Filter working groups based on search and filters
  useEffect(() => {
    let filtered = workingGroups

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(wg => 
        wg.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wg.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wg.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sector filter
    if (selectedSector !== 'all') {
      filtered = filtered.filter(wg => wg.sector_code === selectedSector)
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(wg => wg.status === selectedStatus)
    }

    setFilteredGroups(filtered)
  }, [searchQuery, selectedSector, selectedStatus, workingGroups])

  // Get unique sectors
  const sectors = Array.from(new Set(workingGroups.filter(wg => wg.sector_code).map(wg => wg.sector_code)))

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <Button className="gap-2">
            <PlusIcon className="h-5 w-5" />
            New Working Group
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Groups</p>
                  <p className="text-2xl font-bold">{workingGroups.length}</p>
                </div>
                <NetworkIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Groups</p>
                  <p className="text-2xl font-bold">
                    {workingGroups.filter(wg => wg.status === 'active').length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold">
                    {workingGroups.reduce((sum, wg) => sum + (wg.member_count || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Linked Activities</p>
                  <p className="text-2xl font-bold">
                    {workingGroups.reduce((sum, wg) => sum + (wg.activities_count || 0), 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
          
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {sectors.map(sector => (
                <SelectItem key={sector} value={sector!}>
                  Sector {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
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
        </div>

        {/* Working Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((wg) => (
            <Card 
              key={wg.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
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
                  <Badge 
                    variant={wg.status === 'active' ? 'default' : 'secondary'}
                    className="ml-2"
                  >
                    {wg.status}
                  </Badge>
                </div>
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
                
                {wg.sector_code && (
                  <div className="mt-3">
                    <Badge variant="outline" className="text-xs">
                      Sector {wg.sector_code}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No working groups found matching your criteria</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
} 