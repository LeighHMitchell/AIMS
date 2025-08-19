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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, X, Search, Check, Users, Upload, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'

interface Organization {
  id: string
  name: string
  acronym?: string
  iati_org_id?: string
  type?: string
  country?: string
}

interface CustomGroup {
  id: string
  name: string
  description?: string
  purpose?: string
  group_code?: string
  is_public: boolean
  tags: string[]
  logo?: string
  banner?: string
  organization_ids?: string[]
}

interface EditCustomGroupModalProps {
  group: CustomGroup | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditCustomGroupModal({ group, open, onOpenChange, onSuccess }: EditCustomGroupModalProps) {
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
    logo: '',
    banner: '',
  })
  
  const [tagInput, setTagInput] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [bannerPreview, setBannerPreview] = useState<string>('')

  // Initialize form data when group changes
  useEffect(() => {
    if (group && open) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        purpose: group.purpose || '',
        group_code: group.group_code || '',
        is_public: group.is_public || true,
        tags: group.tags || [],
        logo: group.logo || '',
        banner: group.banner || '',
      })
      setLogoPreview(group.logo || '')
      setBannerPreview(group.banner || '')
      fetchOrganizations()
      fetchGroupMemberships()
    }
  }, [group, open])

  const fetchGroupMemberships = async () => {
    if (!group?.id) return
    
    try {
      const response = await fetch(`/api/custom-groups/${group.id}`)
      if (response.ok) {
        const groupData = await response.json()
        // Extract organization IDs from members if available
        if (groupData.members && Array.isArray(groupData.members)) {
          const orgIds = groupData.members.map((member: any) => member.organization_id)
          setSelectedOrgs(orgIds)
        } else {
          setSelectedOrgs([])
        }
      }
    } catch (error) {
      console.error('Error fetching group memberships:', error)
      setSelectedOrgs([])
    }
  }

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

  // Logo dropzone
  const logoDropzone = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file) {
        setLogoFile(file)
        const reader = new FileReader()
        reader.onload = () => {
          setLogoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  })

  // Banner dropzone
  const bannerDropzone = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (file) {
        setBannerFile(file)
        const reader = new FileReader()
        reader.onload = () => {
          setBannerPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Group name is required')
      return
    }

    if (!group) return

    setLoading(true)
    
    try {
      // Upload files if they exist
      let logoUrl = formData.logo
      let bannerUrl = formData.banner

      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('file', logoFile)
        logoFormData.append('type', 'logo')
        
        const logoResponse = await fetch('/api/upload', {
          method: 'POST',
          body: logoFormData
        })
        
        if (logoResponse.ok) {
          const logoResult = await logoResponse.json()
          logoUrl = logoResult.url
        }
      }

      if (bannerFile) {
        const bannerFormData = new FormData()
        bannerFormData.append('file', bannerFile)
        bannerFormData.append('type', 'banner')
        
        const bannerResponse = await fetch('/api/upload', {
          method: 'POST',
          body: bannerFormData
        })
        
        if (bannerResponse.ok) {
          const bannerResult = await bannerResponse.json()
          bannerUrl = bannerResult.url
        }
      }

      // Update the group
      const response = await fetch(`/api/custom-groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          logo: logoUrl,
          banner: bannerUrl,
          organization_ids: selectedOrgs
        })
      })

      if (response.ok) {
        toast.success('Custom group updated successfully!')
        onOpenChange(false)
        onSuccess?.()
      } else {
        const error = await response.json()
        toast.error(error.error || error.message || 'Failed to update group')
      }
    } catch (error) {
      console.error('Error updating group:', error)
      toast.error('Error updating group')
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

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
    setFormData(prev => ({ ...prev, logo: '' }))
  }

  const removeBanner = () => {
    setBannerFile(null)
    setBannerPreview('')
    setFormData(prev => ({ ...prev, banner: '' }))
  }

  if (!group) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edit Custom Group
          </DialogTitle>
          <DialogDescription>
            Edit the custom group details, members, and visual assets
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

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Group Logo</Label>
            <div className="space-y-3">
              {logoPreview ? (
                <div className="relative inline-block">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="w-20 h-20 object-contain rounded-lg border bg-white p-1"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removeLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  {...logoDropzone.getRootProps()} 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                >
                  <input {...logoDropzone.getInputProps()} />
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drop logo here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Banner Upload */}
          <div className="space-y-2">
            <Label>Group Banner</Label>
            <div className="space-y-3">
              {bannerPreview ? (
                <div className="relative inline-block">
                  <img 
                    src={bannerPreview} 
                    alt="Banner preview" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full p-0"
                    onClick={removeBanner}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  {...bannerDropzone.getRootProps()} 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                >
                  <input {...bannerDropzone.getInputProps()} />
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drop banner image here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>
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
                  Updating...
                </>
              ) : (
                'Update Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
