"use client"

import React, { useState, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LabelSaveIndicator } from '@/components/ui/save-indicator'
import { useWorkingGroupAutosave } from '@/hooks/use-working-group-autosave'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { WorkingGroup } from '../WorkingGroupEditor'

const GROUP_TYPE_OPTIONS = [
  { value: 'technical', label: 'Technical Working Group' },
  { value: 'development_partner', label: 'Development Partner Working Group' },
  { value: 'government', label: 'Government Working Group' },
  { value: 'joint', label: 'Joint Working Group' },
  { value: 'issue_specific', label: 'Issue-Specific Working Group' },
  { value: 'coordination', label: 'Coordination Group' },
  { value: 'thematic', label: 'Thematic Working Group' },
  { value: 'sub_working_group', label: 'Sub-Working Group' },
]

interface GeneralSectionProps {
  workingGroup: WorkingGroup | null
  workingGroupId?: string
  isCreating: boolean
  onSave: (data: Partial<WorkingGroup>) => Promise<void>
  onNextSection: () => void
}

export default function GeneralSection({
  workingGroup,
  workingGroupId,
  isCreating,
  onSave,
  onNextSection
}: GeneralSectionProps) {
  const [label, setLabel] = useState(workingGroup?.label || '')
  const [code, setCode] = useState(workingGroup?.code || '')
  const [description, setDescription] = useState(workingGroup?.description || '')
  const [groupType, setGroupType] = useState(workingGroup?.group_type || '')
  const [isActive, setIsActive] = useState(workingGroup?.is_active !== false)
  const [banner, setBanner] = useState(workingGroup?.banner || '')
  const [iconUrl, setIconUrl] = useState(workingGroup?.icon_url || '')
  const [creating, setCreating] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)

  const labelAutosave = useWorkingGroupAutosave('label', {
    workingGroupId,
    debounceMs: 1000,
    enabled: !!workingGroupId,
  })
  const codeAutosave = useWorkingGroupAutosave('code', {
    workingGroupId,
    debounceMs: 1000,
    enabled: !!workingGroupId,
  })
  const descAutosave = useWorkingGroupAutosave('description', {
    workingGroupId,
    debounceMs: 2000,
    enabled: !!workingGroupId,
  })
  const groupTypeAutosave = useWorkingGroupAutosave('group_type', {
    workingGroupId,
    debounceMs: 500,
    enabled: !!workingGroupId,
    showToast: true,
  })
  const activeAutosave = useWorkingGroupAutosave('is_active', {
    workingGroupId,
    debounceMs: 500,
    enabled: !!workingGroupId,
    showToast: true,
  })
  const bannerAutosave = useWorkingGroupAutosave('banner', {
    workingGroupId,
    debounceMs: 1000,
    enabled: !!workingGroupId,
  })
  const iconAutosave = useWorkingGroupAutosave('icon_url', {
    workingGroupId,
    debounceMs: 1000,
    enabled: !!workingGroupId,
  })

  const handleImageUpload = async (file: File, type: 'banner' | 'icon') => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', `${type}-${file.name}`)
      formData.append('document_type', 'photo')

      if (!workingGroupId) return

      const res = await fetch(`/api/working-groups/${workingGroupId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const url = data.file_url

      if (type === 'banner') {
        setBanner(url)
        bannerAutosave.triggerSave(url)
      } else {
        setIconUrl(url)
        iconAutosave.triggerSave(url)
      }
      toast.success(`${type === 'banner' ? 'Banner' : 'Icon'} uploaded`)
    } catch {
      toast.error('Upload failed')
    }
  }

  const handleCreate = useCallback(async () => {
    if (!label.trim() || !code.trim()) {
      toast.error('Name and code are required')
      return
    }
    setCreating(true)
    try {
      await onSave({
        label: label.trim(),
        code: code.trim(),
        description: description.trim() || undefined,
        group_type: groupType || undefined,
        is_active: isActive,
      })
    } catch {
      // Error handled in parent
    } finally {
      setCreating(false)
    }
  }, [label, code, description, groupType, isActive, onSave])

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">General Information</h2>
        <p className="text-sm text-gray-500 mt-1">Basic details about this working group</p>
      </div>

      <div className="space-y-4">
        {/* Label */}
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={labelAutosave.state.isSaving}
            isSaved={!!labelAutosave.state.lastSaved}
            hasValue={!!label}
          >
            Name <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
          </LabelSaveIndicator>
          <Input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              if (!isCreating) labelAutosave.triggerSave(e.target.value)
            }}
            placeholder="e.g. Health Sector Working Group"
          />
        </div>

        {/* Code */}
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={codeAutosave.state.isSaving}
            isSaved={!!codeAutosave.state.lastSaved}
            hasValue={!!code}
          >
            Code <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
          </LabelSaveIndicator>
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (!isCreating) codeAutosave.triggerSave(e.target.value)
            }}
            placeholder="e.g. TWG-HEALTH"
          />
          <p className="text-xs text-gray-500">Unique identifier code for this working group</p>
        </div>

        {/* Group Type */}
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={groupTypeAutosave.state.isSaving}
            isSaved={!!groupTypeAutosave.state.lastSaved}
            hasValue={!!groupType}
          >
            Working Group Type
          </LabelSaveIndicator>
          <Select
            value={groupType || 'none'}
            onValueChange={(val) => {
              const newVal = val === 'none' ? '' : val
              setGroupType(newVal)
              if (!isCreating) groupTypeAutosave.triggerSave(newVal || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No type selected</SelectItem>
              {GROUP_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <LabelSaveIndicator
            isSaving={descAutosave.state.isSaving}
            isSaved={!!descAutosave.state.lastSaved}
            hasValue={!!description}
          >
            Description / Mandate
          </LabelSaveIndicator>
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              if (!isCreating) descAutosave.triggerSave(e.target.value)
            }}
            placeholder="Purpose and mandate of this working group..."
            rows={5}
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between border rounded-lg p-4">
          <div>
            <LabelSaveIndicator
              isSaving={activeAutosave.state.isSaving}
              isSaved={!!activeAutosave.state.lastSaved}
              hasValue={true}
            >
              Active Status
            </LabelSaveIndicator>
            <p className="text-xs text-gray-500 mt-1">Whether this working group is currently active</p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => {
              setIsActive(checked)
              if (!isCreating) activeAutosave.triggerSave(checked)
            }}
          />
        </div>

        {/* Banner Image */}
        {!isCreating && workingGroupId && (
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={bannerAutosave.state.isSaving}
              isSaved={!!bannerAutosave.state.lastSaved}
              hasValue={!!banner}
            >
              Banner Image
            </LabelSaveIndicator>
            {banner ? (
              <div className="relative">
                <img
                  src={banner}
                  alt="Banner"
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => {
                    setBanner('')
                    bannerAutosave.triggerSave(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => bannerInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">Upload banner image</p>
              </div>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file, 'banner')
              }}
            />
          </div>
        )}

        {/* Icon/Logo */}
        {!isCreating && workingGroupId && (
          <div className="space-y-2">
            <LabelSaveIndicator
              isSaving={iconAutosave.state.isSaving}
              isSaved={!!iconAutosave.state.lastSaved}
              hasValue={!!iconUrl}
            >
              Icon / Logo
            </LabelSaveIndicator>
            <div className="flex items-center gap-4">
              {iconUrl ? (
                <div className="relative">
                  <img
                    src={iconUrl}
                    alt="Icon"
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => {
                      setIconUrl('')
                      iconAutosave.triggerSave(null)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center h-16 w-16 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => iconInputRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => iconInputRef.current?.click()}
                >
                  {iconUrl ? 'Change' : 'Upload'} Icon
                </Button>
                <p className="text-xs text-gray-500 mt-1">Square image recommended</p>
              </div>
            </div>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file, 'icon')
              }}
            />
          </div>
        )}

        {/* Create / Next buttons */}
        {isCreating ? (
          <Button
            onClick={handleCreate}
            disabled={creating || !label.trim() || !code.trim()}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create Working Group'}
          </Button>
        ) : (
          <div className="flex justify-end pt-4">
            <Button onClick={onNextSection} variant="outline">
              Next: Members
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
