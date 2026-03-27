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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PlusIcon, SearchIcon, Users, LayoutGrid, List, Table as TableIcon, Pencil, MoreVertical, Eye, Trash2, Inbox } from 'lucide-react'
import { EmptyState } from "@/components/ui/empty-state"
import WorkingGroupCardModern from '@/components/working-groups/WorkingGroupCardModern'
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
  const [wgToDelete, setWgToDelete] = useState<WorkingGroup | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteWorkingGroup = async () => {
    if (!wgToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/working-groups/${wgToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete working group')
      toast.success('Working group deleted')
      setWgToDelete(null)
      fetchWorkingGroups()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete working group')
    } finally {
      setDeleting(false)
    }
  }

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Working Groups</h1>
              <p className="text-muted-foreground mt-1">
                Technical and Sector Working Groups for coordination and collaboration
              </p>
            </div>
          </div>
          <Button className="gap-2" onClick={() => router.push('/working-groups/new')}>
            <PlusIcon className="h-5 w-5" />
            New Working Group
          </Button>
        </div>

        {/* Filters + View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
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

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-r-none gap-1"
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="rounded-l-none gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((wg) => (
              <WorkingGroupCardModern
                key={wg.id}
                workingGroup={{
                  id: wg.id,
                  code: wg.code,
                  label: wg.label,
                  description: wg.description,
                  sector_code: wg.sector_code,
                  is_active: wg.is_active,
                  status: wg.status,
                }}
              />
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
                    <TableCell className="text-muted-foreground font-mono text-sm">{wg.code}</TableCell>
                    <TableCell>
                      {wg.group_type ? (
                        <Badge variant="outline" className="text-xs">
                          {GROUP_TYPE_LABELS[wg.group_type] || wg.group_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
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
                          <Pencil className="h-4 w-4 text-muted-foreground ring-1 ring-slate-300 rounded-sm" />
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
          <EmptyState
            icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
            title="No working groups found"
            message="No working groups match your current criteria. Try adjusting your search or filters."
          />
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!wgToDelete} onOpenChange={() => setWgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Working Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{wgToDelete?.label}&quot;? This will permanently remove the working group and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkingGroup}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  )
}
