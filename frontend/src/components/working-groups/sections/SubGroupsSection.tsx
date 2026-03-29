"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { GitBranch, Plus, Users, Eye, Pencil, Trash2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch'
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip'

interface SubGroup {
  id: string
  code: string
  label: string
  description?: string
  group_type?: string
  is_active: boolean
  status?: string
  member_count?: number
}

interface SubGroupsSectionProps {
  workingGroupId: string
  workingGroupLabel?: string
}

export default function SubGroupsSection({
  workingGroupId,
  workingGroupLabel,
}: SubGroupsSectionProps) {
  const router = useRouter()
  const [subGroups, setSubGroups] = useState<SubGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SubGroup | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Create form state
  const [newLabel, setNewLabel] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const fetchSubGroups = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/working-groups/${workingGroupId}`)
      if (response.ok) {
        const data = await response.json()
        setSubGroups(data.sub_groups || [])
      }
    } catch (error) {
      console.error('Error fetching sub-groups:', error)
    } finally {
      setLoading(false)
    }
  }, [workingGroupId])

  useEffect(() => {
    fetchSubGroups()
  }, [fetchSubGroups])

  const handleCreate = async () => {
    if (!newLabel.trim() || !newCode.trim()) {
      toast.error('Name and code are required')
      return
    }

    setCreating(true)
    try {
      const response = await apiFetch('/api/working-groups', {
        method: 'POST',
        body: JSON.stringify({
          label: newLabel.trim(),
          code: newCode.trim(),
          description: newDescription.trim() || null,
          group_type: 'sub_working_group',
          parent_id: workingGroupId,
          is_active: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sub-working group')
      }

      toast.success('Sub-working group created')
      setShowCreateDialog(false)
      setNewLabel('')
      setNewCode('')
      setNewDescription('')
      fetchSubGroups()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create sub-working group')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await apiFetch(`/api/working-groups/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (response.ok || response.status === 204) {
        toast.success(`"${deleteTarget.label}" deleted`)
        setDeleteTarget(null)
        fetchSubGroups()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete')
      }
    } catch (error) {
      toast.error('Failed to delete sub-working group')
    } finally {
      setDeleting(false)
    }
  }

  // Auto-generate code from label
  const handleLabelChange = (value: string) => {
    setNewLabel(value)
    if (!newCode || newCode === generateCode(newLabel)) {
      setNewCode(generateCode(value))
    }
  }

  const generateCode = (label: string) => {
    return 'SWG-' + label
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
      .substring(0, 20)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">Sub-Working Groups</h2>
          <HelpTextTooltip text="Create specialized sub-groups under this working group. Each sub-group has its own members, meetings, and documents." />
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Create Sub-Working Group
        </Button>
      </div>

      {/* Sub-groups list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : subGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <GitBranch className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No sub-working groups yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Sub-working groups let you organize specialized topics within this working group.
            Each has its own members, meetings, and documents.
          </p>
          <Button
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Create First Sub-Working Group
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {subGroups.map(sg => (
            <div
              key={sg.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GitBranch className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{sg.label}</h3>
                    <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{sg.code}</code>
                    <span className="text-xs text-muted-foreground">
                      {sg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {sg.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{sg.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {sg.member_count || 0} members
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3">
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
                    <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(sg)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader className="bg-surface-muted -mx-6 -mt-6 px-6 py-4 rounded-t-lg border-b">
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Create Sub-Working Group
            </DialogTitle>
            <DialogDescription>
              Create a new sub-working group under {workingGroupLabel || 'this working group'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sg-label">Name <span className="text-red-500">*</span></Label>
              <Input
                id="sg-label"
                placeholder="e.g. Reproductive Health Sub-Working Group"
                value={newLabel}
                onChange={e => handleLabelChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sg-code">Code <span className="text-red-500">*</span></Label>
              <Input
                id="sg-code"
                placeholder="e.g. SWG-ReproductiveHealth"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sg-desc">Description</Label>
              <Textarea
                id="sg-desc"
                placeholder="Brief description of the sub-working group's mandate..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newLabel.trim() || !newCode.trim()}>
              {creating ? 'Creating...' : 'Create Sub-Working Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Working Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.label}&quot;? This will permanently remove the sub-working group and all its members, meetings, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
