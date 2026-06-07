"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent } from '@/components/ui/card'
import { CardShell } from '@/components/ui/card-shell'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, getSortIcon, sortableHeaderClasses } from '@/components/ui/table'
import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/ui/skeleton-loader'
import { AlertCircle, List, LayoutGrid, Search, X, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrganizationCardActionMenu } from '@/components/organizations/OrganizationCardActionMenu'
import { apiFetch } from '@/lib/api-fetch'
import { getIconForTag, getTagColor, getTagVocabularyLabel, isCustomTag } from '@/lib/tag-utils'
import { useUserRole } from '@/hooks/useUserRole'
import { toast } from 'sonner'

interface Tag {
  id: string
  name: string
  code?: string | null
  vocabulary?: string | null
  description?: string | null
  activityCount: number
}

interface BannerMeta {
  banner?: string | null
  banner_position?: number
  color?: string | null
  icon?: string | null
}

export default function TagsListingPage() {
  const [tags, setTags] = useState<Tag[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card')
  const [banners, setBanners] = useState<Record<string, BannerMeta>>({})
  const [query, setQuery] = useState('')
  const [sortField, setSortField] = useState<'name' | 'activities'>('activities')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { isSuperUser } = useUserRole()
  const canEdit = isSuperUser()
  const router = useRouter()

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await apiFetch(`/api/tags/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete tag')
      }
      setTags(prev => (prev || []).filter(t => t.id !== deleteTarget.id))
      toast.success('Tag deleted')
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete tag')
    } finally {
      setDeleting(false)
    }
  }

  const toggleSort = (field: 'name' | 'activities') => {
    if (sortField === field) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortOrder(field === 'name' ? 'asc' : 'desc') }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiFetch('/api/tags/summary')
        if (!response.ok) throw new Error('Failed to fetch tags')
        const result = await response.json()
        setTags(result.tags || [])
      } catch (err: any) {
        console.error('[Tags Listing] Error:', err)
        setError(err.message || 'Failed to load tags')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await apiFetch('/api/profile-banners/tag')
        if (!res.ok) return
        setBanners(await res.json())
      } catch {
        // Banners are optional
      }
    }
    fetchBanners()
  }, [])

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6 space-y-6">
            <PageHeaderSkeleton />
            <CardGridSkeleton count={12} columns={4} />
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error || !tags) {
    return (
      <MainLayout>
        <div className="min-h-screen">
          <div className="w-full p-6">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Tags</h2>
                <p className="text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  const totalTags = tags.length
  const totalActivities = tags.reduce((sum, t) => sum + t.activityCount, 0)

  const q = query.trim().toLowerCase()
  const matchesQuery = (t: Tag) =>
    !q ||
    t.name.toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q) ||
    (t.code || '').toLowerCase().includes(q)

  const filtered = tags.filter(matchesQuery).sort((a, b) => {
    let cmp = 0
    if (sortField === 'name') cmp = a.name.localeCompare(b.name)
    else cmp = a.activityCount - b.activityCount || a.name.localeCompare(b.name)
    return sortOrder === 'asc' ? cmp : -cmp
  })

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="w-full p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Tags</h1>
            <p className="text-muted-foreground mt-1">
              {q
                ? `${filtered.length} of ${totalTags} tags`
                : `${totalTags} tags across ${totalActivities} activity applications`}
            </p>
          </div>

          {/* Filters + View Toggle */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="pl-10 pr-9"
                  aria-label="Search tags"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center border rounded-md flex-shrink-0">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-r-none h-9">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'card' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('card')} className="rounded-l-none h-9">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* List View */}
          {viewMode === 'list' && filtered.length > 0 && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={sortableHeaderClasses} onClick={() => toggleSort('name')}>
                      <span className="inline-flex items-center gap-1">Name {getSortIcon('name', sortField, sortOrder)}</span>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Vocabulary</TableHead>
                    <TableHead className={`text-right ${sortableHeaderClasses}`} onClick={() => toggleSort('activities')}>
                      <span className="inline-flex items-center gap-1 justify-end">Activities {getSortIcon('activities', sortField, sortOrder)}</span>
                    </TableHead>
                    {canEdit && <TableHead className="w-[52px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tag) => {
                    const b = banners[String(tag.id)]
                    const IconComponent = getIconForTag(b?.icon)
                    return (
                      <TableRow
                        key={tag.id}
                        className="group/row cursor-pointer"
                        onClick={() => router.push(`/tags/${tag.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center">
                              <IconComponent className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="text-foreground truncate">{tag.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-foreground max-w-xs">
                          <span className="block truncate">{tag.description || <span className="text-muted-foreground">—</span>}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-foreground">
                          {isCustomTag(tag.vocabulary) ? 'Custom' : getTagVocabularyLabel(tag.vocabulary)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">{tag.activityCount}</TableCell>
                        {canEdit && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label="Tag actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={5} className="min-w-[120px]">
                                <DropdownMenuItem onClick={() => router.push(`/tags/${tag.id}/edit`)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteTarget(tag)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Card View */}
          {viewMode === 'card' && filtered.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filtered.map((tag) => {
                const b = banners[String(tag.id)]
                const IconComponent = getIconForTag(b?.icon)
                const color = getTagColor({ color: b?.color, name: tag.name, id: tag.id })

                return (
                  <CardShell
                    key={tag.id}
                    href={`/tags/${tag.id}`}
                    ariaLabel={tag.name}
                    bannerColor={color}
                    bannerActions={canEdit ? (
                      <OrganizationCardActionMenu
                        organizationId={tag.id}
                        onView={() => router.push(`/tags/${tag.id}`)}
                        onEdit={() => router.push(`/tags/${tag.id}/edit`)}
                        onDelete={() => setDeleteTarget(tag)}
                      />
                    ) : undefined}
                    bannerContent={
                      b?.banner ? (
                        <img
                          src={b.banner}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
                          style={{ objectPosition: `center ${b.banner_position ?? 50}%` }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <IconComponent className="h-12 w-12 text-white/20" />
                        </div>
                      )
                    }
                    bannerOverlay={
                      <h2 className="text-body font-bold text-white leading-tight">
                        <Link
                          href={`/tags/${tag.id}`}
                          className="relative z-10 hover:underline inline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {tag.name}
                        </Link>
                      </h2>
                    }
                  >
                    <div className="relative flex-1 p-5 flex flex-col bg-card">
                      <p className="text-helper text-muted-foreground line-clamp-3 mb-3">
                        {tag.description || (isCustomTag(tag.vocabulary) ? 'Custom tag' : getTagVocabularyLabel(tag.vocabulary))}
                      </p>
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border">
                        <span className="text-body font-medium">
                          {tag.activityCount} {tag.activityCount === 1 ? 'activity' : 'activities'}
                        </span>
                      </div>
                    </div>
                  </CardShell>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {totalTags === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No tags found. Add tags to activities to see them here.</p>
              </CardContent>
            </Card>
          )}

          {/* No search results */}
          {totalTags > 0 && filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No tags match &ldquo;{query}&rdquo;.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setQuery('')}>Clear filter</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={handleDelete}
        title="Delete Tag"
        description={`Are you sure you want to delete the tag "${deleteTarget?.name ?? ''}"? It will be removed from all activities it is applied to. This action cannot be undone.`}
        confirmText="Delete Tag"
        isDestructive
        isLoading={deleting}
      />
    </MainLayout>
  )
}
