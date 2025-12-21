"use client"

import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ActivityComment } from '@/types/comment'
import { useUser } from '@/hooks/useUser'
import { toast } from 'sonner'
import { getRoleBadgeVariant, getRoleDisplayLabel } from '@/lib/role-badge-utils'
import {
  MessageSquare,
  Send,
  Reply,
  CheckCircle,
  Search,
} from 'lucide-react'

// Available context sections for organization
const ORGANIZATION_SECTIONS = [
  { value: 'general', label: 'General' },
  { value: 'branding', label: 'Branding' },
  { value: 'contact', label: 'Contact & Social' },
  { value: 'aliases', label: 'Aliases' },
  { value: 'budgets', label: 'IATI Budgets' },
  { value: 'documents', label: 'IATI Documents' },
  { value: 'iati-prefs', label: 'IATI Import' },
]

// Helper function to get user initials
const getUserInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
}

interface OrganizationCommentsProps {
  organizationId: string
  contextSection?: string
  contextField?: string
  allowContextSwitch?: boolean
  showInline?: boolean
}

// Normalize comment format
const normalizeComment = (comment: any): ActivityComment => {
  return {
    id: comment.id,
    activityId: comment.organization_id || comment.organizationId || '',
    author: {
      userId: comment.user_id || comment.userId || '',
      name: comment.user_name || comment.author?.name || 'Unknown User',
      role: getRoleDisplayLabel(comment.user_role || comment.author?.role || 'user'),
      profilePicture: comment.user_avatar_url?.avatar_url || comment.author?.profilePicture
    },
    message: comment.message || comment.content || '',
    type: (comment.type || 'Feedback') as 'Feedback' | 'Question',
    status: (comment.status || 'Open') as 'Open' | 'Resolved',
    contextSection: comment.context_section || comment.contextSection,
    contextField: comment.context_field || comment.contextField,
    mentions: Array.isArray(comment.mentions) ? comment.mentions : 
              (typeof comment.mentions === 'string' ? JSON.parse(comment.mentions || '[]') : []),
    attachments: Array.isArray(comment.attachments) ? comment.attachments :
                 (typeof comment.attachments === 'string' ? JSON.parse(comment.attachments || '[]') : []),
    createdAt: comment.created_at || comment.createdAt || new Date().toISOString(),
    replies: (comment.replies || []).map((reply: any) => ({
      id: reply.id,
      author: {
        userId: reply.user_id || reply.userId || '',
        name: reply.user_name || reply.author?.name || 'Unknown User',
        role: getRoleDisplayLabel(reply.user_role || reply.author?.role || 'user'),
        profilePicture: reply.user_avatar_url?.avatar_url || reply.author?.profilePicture
      },
      message: reply.message || reply.content || '',
      type: (reply.type || 'Feedback') as 'Feedback' | 'Question',
      createdAt: reply.created_at || reply.createdAt || new Date().toISOString()
    }))
  }
}

export function OrganizationComments({
  organizationId,
  contextSection,
  contextField,
  allowContextSwitch = true,
  showInline = false
}: OrganizationCommentsProps) {
  const { user } = useUser()
  
  const [comments, setComments] = useState<ActivityComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<'Question' | 'Feedback'>('Feedback')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [activeTab, setActiveTab] = useState<'open' | 'resolved' | 'archived'>('open')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContextSection, setSelectedContextSection] = useState(contextSection || 'general')
  const [selectedContextField, setSelectedContextField] = useState(contextField || '')

  // Load comments
  useEffect(() => {
    if (organizationId) {
      fetchComments()
    }
  }, [organizationId, searchTerm, selectedContextSection, activeTab])

  const fetchComments = async () => {
    if (!organizationId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedContextSection) params.append('section', selectedContextSection)
      if (selectedContextField) params.append('field', selectedContextField)
      if (activeTab === 'resolved') params.append('status', 'Resolved')
      if (activeTab === 'archived') {
        params.append('includeArchived', 'true')
      } else {
        params.append('includeArchived', 'false')
      }

      const res = await fetch(`/api/organizations/${organizationId}/comments?${params}`)
      
      if (!res.ok) {
        if (res.status === 404) {
          setComments([])
          return
        }
        throw new Error('Failed to fetch comments')
      }
      
      const data = await res.json()
      const normalizedComments = (Array.isArray(data) ? data : []).map(normalizeComment)
      setComments(normalizedComments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return

    try {
      const res = await fetch(`/api/organizations/${organizationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: newComment,
          type: commentType,
          contextSection: selectedContextSection || undefined,
          contextField: selectedContextField || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to add comment')
      
      await fetchComments()
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !user) return

    try {
      const res = await fetch(`/api/organizations/${organizationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          content: replyContent,
          parentCommentId,
        }),
      })

      if (!res.ok) throw new Error('Failed to add reply')
      
      await fetchComments()
      setReplyContent('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Error adding reply:', error)
      toast.error('Failed to add reply')
    }
  }

  const filteredComments = comments.filter(comment => {
    if (activeTab === 'resolved' && comment.status !== 'Resolved') return false
    if (activeTab === 'open' && comment.status === 'Resolved') return false
    if (activeTab === 'archived' && !comment.isArchived) return false
    if (searchTerm && !comment.message.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Context Selector */}
      {allowContextSwitch && (
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Comment Context</label>
            <Select
              value={selectedContextSection}
              onValueChange={setSelectedContextSection}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_SECTIONS.map((section) => (
                  <SelectItem key={section.value} value={section.value}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search comments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Comment Input */}
          {user && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={commentType} onValueChange={(v) => setCommentType(v as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Feedback">Feedback</SelectItem>
                      <SelectItem value="Question">Question</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedContextSection && (
                    <Badge variant="outline">
                      {ORGANIZATION_SECTIONS.find(s => s.value === selectedContextSection)?.label}
                    </Badge>
                  )}
                </div>
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments List */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading comments...</div>
          ) : filteredComments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No comments yet</div>
          ) : (
            <div className="space-y-4">
              {filteredComments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.profilePicture} />
                        <AvatarFallback>
                          {getUserInitials(comment.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.author.name}</span>
                          <Badge variant={getRoleBadgeVariant(comment.author.role)} className="text-xs">
                            {comment.author.role}
                          </Badge>
                          <Badge variant={comment.type === 'Question' ? 'default' : 'outline'} className="text-xs">
                            {comment.type}
                          </Badge>
                          {comment.status === 'Resolved' && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.message}</p>
                        {comment.contextSection && (
                          <div className="text-xs text-gray-500">
                            Context: {ORGANIZATION_SECTIONS.find(s => s.value === comment.contextSection)?.label}
                            {comment.contextField && ` • ${comment.contextField}`}
                          </div>
                        )}
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-4 space-y-3 mt-3 pt-3 border-t">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={reply.author.profilePicture} />
                                  <AvatarFallback>
                                    {getUserInitials(reply.author.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-xs">{reply.author.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 mt-1">{reply.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input */}
                        {replyingTo === comment.id ? (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              placeholder="Write a reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={!replyContent.trim()}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyContent('')
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(comment.id)}
                            className="mt-2"
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
