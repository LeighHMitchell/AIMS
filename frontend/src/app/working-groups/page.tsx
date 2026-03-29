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
import { PlusIcon, SearchIcon, Users, LayoutGrid, List, Table as TableIcon, Pencil, MoreVertical, Eye, Trash2, Inbox, GitBranch, ChevronRight, ChevronLeft, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"
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
  banner?: string
  icon_url?: string
  member_count?: number
  meetings_count?: number
  activities_count?: number
  parent_id?: string | null
  parent_label?: string | null
  sub_group_count?: number
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<'all' | 'top-level' | 'sub-groups'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(12)

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
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(wg =>
        wg.label.toLowerCase().includes(q) ||
        wg.code.toLowerCase().includes(q) ||
        wg.description?.toLowerCase().includes(q)
      )
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(wg => wg.status === selectedStatus)
    }

    if (typeFilter === 'top-level') {
      filtered = filtered.filter(wg => !wg.parent_id)
    } else if (typeFilter === 'sub-groups') {
      filtered = filtered.filter(wg => !!wg.parent_id)
    }

    // Sort: top-level groups first, then sub-groups grouped under their parent
    const topLevel = filtered.filter(wg => !wg.parent_id)
    const subGroups = filtered.filter(wg => wg.parent_id)
    const ordered: WorkingGroup[] = []
    topLevel.forEach(parent => {
      ordered.push(parent)
      const children = subGroups.filter(sg => sg.parent_id === parent.id)
      children.forEach(child => ordered.push(child))
    })
    // Add orphan sub-groups (parent not in filtered set)
    const orderedIds = new Set(ordered.map(w => w.id))
    subGroups.forEach(sg => {
      if (!orderedIds.has(sg.id)) ordered.push(sg)
    })

    setFilteredGroups(ordered)
    setCurrentPage(1)
  }, [searchQuery, selectedStatus, typeFilter, workingGroups])

  const topLevelGroups = filteredGroups.filter(wg => !wg.parent_id)
  const subGroupsMap = new Map<string, WorkingGroup[]>()
  filteredGroups.filter(wg => wg.parent_id).forEach(sg => {
    const arr = subGroupsMap.get(sg.parent_id!) || []
    arr.push(sg)
    subGroupsMap.set(sg.parent_id!, arr)
  })

  const toggleExpanded = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpandAll = () => {
    const parentsWithChildren = topLevelGroups.filter(wg => (subGroupsMap.get(wg.id)?.length || 0) > 0)
    const allExpanded = parentsWithChildren.every(wg => expandedGroups.has(wg.id))
    if (allExpanded) {
      setExpandedGroups(new Set())
    } else {
      setExpandedGroups(new Set(parentsWithChildren.map(wg => wg.id)))
    }
  }

  // Pagination
  const totalItems = filteredGroups.length
  const totalPages = Math.ceil(totalItems / pageLimit)
  const startIndex = (currentPage - 1) * pageLimit
  const endIndex = startIndex + pageLimit
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex)

  // For card view, paginate the flat list
  const paginatedCards = paginatedGroups

  // For table view, paginate top-level groups and include their sub-groups
  const paginatedTopLevel = topLevelGroups.slice(startIndex, Math.min(endIndex, topLevelGroups.length))

  if (loading) {
    return (
      <MainLayout>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div>
                <Skeleton className="h-8 w-48 mb-1" />
                <Skeleton className="h-4 w-80" />
              </div>
            </div>
            <Skeleton className="h-10 w-48 rounded-md" />
          </div>
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-[170px] rounded-md" />
            <Skeleton className="h-10 w-[150px] rounded-md" />
            <Skeleton className="h-10 w-[88px] rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-3xl border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-6 pt-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <PlusIcon className="h-5 w-5" />
                New Working Group
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/working-groups/new')}>
                <Users className="h-4 w-4 mr-2" />
                <div>
                  <p className="font-medium">Working Group</p>
                  <p className="text-xs text-muted-foreground">Top-level working group</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/working-groups/new?group_type=sub_working_group')}>
                <GitBranch className="h-4 w-4 mr-2" />
                <div>
                  <p className="font-medium">Sub-Working Group</p>
                  <p className="text-xs text-muted-foreground">Nested under a parent group</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="top-level">Working Groups</SelectItem>
              <SelectItem value="sub-groups">Sub-Working Groups</SelectItem>
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

          <div className="flex items-center border rounded-md flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={`rounded-r-none h-9 ${viewMode === 'table' ? 'bg-slate-200 text-slate-900' : 'text-slate-400'}`}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("card")}
              className={`rounded-l-none h-9 ${viewMode === 'card' ? 'bg-slate-200 text-slate-900' : 'text-slate-400'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCards.map((wg) => (
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
                  member_count: wg.member_count,
                  group_type: wg.group_type,
                  banner: wg.banner,
                  icon_url: wg.icon_url,
                }}
                onEdit={(id) => router.push(`/working-groups/${id}/edit`)}
                onDelete={(id) => setWgToDelete(wg)}
              />
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            {/* Expand/Collapse All */}
            {Array.from(subGroupsMap.values()).some(arr => arr.length > 0) && (
              <div className="px-4 py-2 border-b flex justify-end">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={toggleExpandAll}>
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  {topLevelGroups.filter(wg => (subGroupsMap.get(wg.id)?.length || 0) > 0).every(wg => expandedGroups.has(wg.id)) ? 'Collapse All' : 'Expand All'}
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Meetings</TableHead>
                  <TableHead className="text-right">Activities</TableHead>
                  {isSuperUser() && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLevelGroups.map((wg) => {
                  const children = subGroupsMap.get(wg.id) || []
                  const hasChildren = children.length > 0
                  const isExpanded = expandedGroups.has(wg.id)

                  return (
                    <React.Fragment key={wg.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => router.push(`/working-groups/${wg.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {hasChildren ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpanded(wg.id) }}
                                className="p-0.5 hover:bg-muted rounded flex-shrink-0"
                              >
                                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <span>{wg.label}</span>
                            {wg.code && (
                              <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{wg.code}</code>
                            )}
                            {hasChildren && (
                              <span className="text-[10px] text-muted-foreground font-normal">{children.length} sub-groups</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {wg.group_type ? (
                            <Badge variant="outline" className="text-xs">
                              {GROUP_TYPE_LABELS[wg.group_type] || wg.group_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {wg.status ? wg.status.charAt(0).toUpperCase() + wg.status.slice(1) : '-'}
                        </TableCell>
                        <TableCell className="text-right">{wg.member_count || 0}</TableCell>
                        <TableCell className="text-right">{wg.meetings_count || 0}</TableCell>
                        <TableCell className="text-right">{wg.activities_count || 0}</TableCell>
                        {isSuperUser() && (
                          <TableCell>
                            <div onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => router.push(`/working-groups/${wg.id}/edit`)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/working-groups/${wg.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" /> View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/working-groups/new?parent_id=${wg.id}&parent_label=${encodeURIComponent(wg.label)}`)}>
                                    <GitBranch className="h-4 w-4 mr-2" /> Create Sub-Group
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => setWgToDelete(wg)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {/* Sub-group rows */}
                      {isExpanded && children.map((sg) => (
                        <TableRow
                          key={sg.id}
                          className="cursor-pointer bg-muted/30"
                          onClick={() => router.push(`/working-groups/${sg.id}`)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5 pl-9">
                              <GitBranch className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span>{sg.label}</span>
                              {sg.code && (
                                <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{sg.code}</code>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {sg.group_type ? (
                              <Badge variant="outline" className="text-xs">
                                {GROUP_TYPE_LABELS[sg.group_type] || sg.group_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sg.status ? sg.status.charAt(0).toUpperCase() + sg.status.slice(1) : '-'}
                          </TableCell>
                          <TableCell className="text-right">{sg.member_count || 0}</TableCell>
                          <TableCell className="text-right">{sg.meetings_count || 0}</TableCell>
                          <TableCell className="text-right">{sg.activities_count || 0}</TableCell>
                          {isSuperUser() && (
                            <TableCell>
                              <div onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => router.push(`/working-groups/${sg.id}/edit`)}>
                                      <Pencil className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => router.push(`/working-groups/${sg.id}`)}>
                                      <Eye className="h-4 w-4 mr-2" /> View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600" onClick={() => setWgToDelete(sg)}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  )
                })}
                {/* Orphan sub-groups (parent not in view) */}
                {filteredGroups.filter(wg => wg.parent_id && !topLevelGroups.some(tl => tl.id === wg.parent_id)).map((sg) => (
                  <TableRow
                    key={sg.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/working-groups/${sg.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5 pl-5">
                        <GitBranch className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span>{sg.label}</span>
                        {sg.code && (
                          <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{sg.code}</code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sg.group_type ? (
                        <Badge variant="outline" className="text-xs">
                          {GROUP_TYPE_LABELS[sg.group_type] || sg.group_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sg.status ? sg.status.charAt(0).toUpperCase() + sg.status.slice(1) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{sg.member_count || 0}</TableCell>
                    <TableCell className="text-right">{sg.meetings_count || 0}</TableCell>
                    <TableCell className="text-right">{sg.activities_count || 0}</TableCell>
                    {isSuperUser() && (
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => router.push(`/working-groups/${sg.id}/edit`)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/working-groups/${sg.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => setWgToDelete(sg)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {totalItems > 0 && totalPages > 1 && (
          <div className="bg-card rounded-lg border border-border shadow-sm p-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(endIndex, totalItems)} of {totalItems} working groups
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 p-0 ${currentPage === pageNum ? 'bg-slate-200 text-slate-900' : ''}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Items per page:</label>
                <Select
                  value={pageLimit.toString()}
                  onValueChange={(value) => { setPageLimit(Number(value)); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
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
