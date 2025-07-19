"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, X, Search, Check, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Organization {
  id: string
  name: string
  acronym?: string
  iati_org_id?: string
  type?: string
  country?: string
}

interface CreateCustomGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateCustomGroupModal({ open, onOpenChange, onSuccess }: CreateCustomGroupModalProps) {
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purpose: '',
    group_code: '',
    is_public: true,
    tags: [] as string[],
  })
  
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (open) {
      fetchOrganizations()
    }
  }, [open])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Group name is required')
      return
    }

    if (selectedOrgs.length === 0) {
      toast.error('Please select at least one organization')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/custom-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organization_ids: selectedOrgs
        })
      })

      if (response.ok) {
        const newGroup = await response.json()
        toast.success('Custom group created successfully with organizations assigned!')
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          purpose: '',
          group_code: '',
          is_public: true,
          tags: [],
        })
        setSelectedOrgs([])
        setTagInput('')
        
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        toast.error(error.error || error.message || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('Error creating group')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const toggleOrganization = (orgId: string) => {
    setSelectedOrgs(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    )
  }

  const getOrganizationDisplay = (org: Organization) => {
    if (org.name && org.acronym && org.name !== org.acronym) {
      return `${org.name} (${org.acronym})`
    }
    return org.name
  }

  const getSelectedOrgDisplayList = () => {
    return organizations
      .filter(org => selectedOrgs.includes(org.id))
      .map(org => getOrganizationDisplay(org))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Custom Group
          </DialogTitle>
          <DialogDescription>
            Create a new custom grouping of organizations for better coordination and reporting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Humanitarian Donor Consortium"
              required
            />
          </div>

          {/* Group Code */}
          <div className="space-y-2">
            <Label htmlFor="group_code">Group Code (Optional)</Label>
            <Input
              id="group_code"
              value={formData.group_code}
              onChange={(e) => setFormData(prev => ({ ...prev, group_code: e.target.value }))}
              placeholder="e.g., HDC-2024"
            />
            <p className="text-sm text-muted-foreground">
              An internal identifier or abbreviation for this group
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the group..."
              rows={2}
            />
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              placeholder="What is the main purpose or objective of this group?"
              rows={2}
            />
          </div>

          {/* Members Selection */}
          <div className="space-y-2">
            <Label>Group Members *</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger className="w-full">
                <div
                  role="combobox"
                  aria-expanded={searchOpen}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    selectedOrgs.length === 0 && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {selectedOrgs.length > 0
                      ? `${selectedOrgs.length} organization${selectedOrgs.length > 1 ? 's' : ''} selected`
                      : "Select organizations..."}
                  </span>
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[600px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search organizations by name or acronym..." />
                  <CommandList>
                    <CommandEmpty>No organization found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[300px]">
                        {organizations.map((org) => (
                          <CommandItem
                            key={org.id}
                            onSelect={() => toggleOrganization(org.id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedOrgs.includes(org.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">
                                {getOrganizationDisplay(org)}
                              </div>
                              {org.iati_org_id && (
                                <div className="text-xs text-muted-foreground">
                                  IATI: {org.iati_org_id}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            
            {/* Display selected organizations */}
            {selectedOrgs.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Selected Organizations ({selectedOrgs.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {getSelectedOrgDisplayList().map((orgDisplay, index) => (
                    <Badge key={selectedOrgs[index]} variant="secondary" className="text-xs">
                      {orgDisplay}
                      <button
                        type="button"
                        onClick={() => toggleOrganization(selectedOrgs[index])}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                placeholder="Add tags (press Enter)"
              />
              <Button type="button" onClick={handleAddTag} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="amber" className="hover:shadow-sm transition-shadow">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_public" className="text-base">
                Public Group
              </Label>
              <p className="text-sm text-muted-foreground">
                Public groups are visible to all users
              </p>
            </div>
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_public: checked }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 