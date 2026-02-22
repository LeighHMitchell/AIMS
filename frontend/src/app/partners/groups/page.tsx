"use client"

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Users, Pencil, Trash2, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { CreateCustomGroupModal } from '@/components/organizations/CreateCustomGroupModal'
import { apiFetch } from '@/lib/api-fetch';

interface CustomGroup {
  id: string
  name: string
  slug: string
  description: string
  purpose: string
  created_by: string
  created_by_name: string
  created_by_role: string
  is_public: boolean
  tags: string[]
  group_code: string
  created_at: string
  updated_at: string
  member_count: number
  members: any[]
  logo?: string
  banner?: string
}

// Format date to relative time
const formatRelativeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ManageGroupsPage() {
  const [groups, setGroups] = useState<CustomGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      const response = await apiFetch('/api/custom-groups?includeMembers=true')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      } else {
        console.error('Failed to fetch custom groups')
        toast.error('Failed to load custom groups')
      }
    } catch (error) {
      console.error('Error fetching custom groups:', error)
      toast.error('Error loading custom groups')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return

    try {
      const response = await apiFetch(`/api/custom-groups/${groupId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Group deleted successfully')
        fetchGroups()
      } else {
        toast.error('Failed to delete group')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Error deleting group')
    }
  }

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-muted rounded w-64 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-96 mt-2 animate-pulse"></div>
            </div>
            <div className="h-10 bg-muted rounded w-40 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full mb-4"></div>
                    <div className="flex gap-2 mb-4">
                      <div className="h-6 bg-muted rounded w-16"></div>
                      <div className="h-6 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Custom Groups</h1>
            <p className="text-muted-foreground mt-1">Manage custom organization groupings and consortiums</p>
          </div>
          
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Group</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search groups by name, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Groups Grid */}
        {filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                {group.banner && (
                  <div className="h-24 w-full overflow-hidden">
                    <img
                      src={group.banner}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {group.logo ? (
                        <img
                          src={group.logo}
                          alt={`${group.name} logo`}
                          className="w-10 h-10 object-contain rounded border bg-card p-0.5 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {group.group_code && (
                          <p className="text-sm text-muted-foreground mt-1">{group.group_code}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={group.is_public ? "default" : "secondary"}>
                      {group.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2 line-clamp-2">
                    {group.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tags */}
                  {group.tags && group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {group.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {group.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{group.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Member count */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                    <Users className="h-4 w-4" />
                    <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-muted-foreground mb-4">
                    Created by {group.created_by_name || 'Unknown'} • {formatRelativeDate(group.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/partners/groups/${group.id}`)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/partners/groups/${group.id}/edit`)}
                      className="flex-1"
                    >
                      <Pencil className="h-3 w-3 mr-1 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(group.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? 'No groups found' : 'No custom groups yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.' 
                  : 'Create your first custom group to organize partners by specific criteria.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Create Custom Group Modal */}
      <CreateCustomGroupModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchGroups}
      />
    </MainLayout>
  )
} 