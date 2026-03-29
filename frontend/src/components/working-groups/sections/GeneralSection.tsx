"use client"

import { RequiredDot } from "@/components/ui/required-dot";
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip";
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
  { value: 'technical', code: '1', label: 'Technical Working Group' },
  { value: 'development_partner', code: '2', label: 'Development Partner Working Group' },
  { value: 'government', code: '3', label: 'Government Working Group' },
  { value: 'joint', code: '4', label: 'Joint Working Group' },
  { value: 'issue_specific', code: '5', label: 'Issue-Specific Working Group' },
  { value: 'coordination', code: '6', label: 'Coordination Group' },
  { value: 'thematic', code: '7', label: 'Thematic Working Group' },
  { value: 'sub_working_group', code: '8', label: 'Sub-Working Group' },
]

interface GeneralSectionProps {
  workingGroup: WorkingGroup | null
  workingGroupId?: string
  isCreating: boolean
  parentLabel?: string
  onSave: (data: Partial<WorkingGroup>) => Promise<void>
}

export default function GeneralSection({
  workingGroup,
  workingGroupId,
  isCreating,
  parentLabel,
  onSave,
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
    displayName: 'Group Type',
  })
  const activeAutosave = useWorkingGroupAutosave('is_active', {
    workingGroupId,
    debounceMs: 500,
    enabled: !!workingGroupId,
    showToast: true,
    displayName: 'Active Status',
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
        ...(workingGroup?.parent_id ? { parent_id: workingGroup.parent_id } : {}),
      })
    } catch {
      // Error handled in parent
    } finally {
      setCreating(false)
    }
  }, [label, code, description, groupType, isActive, onSave, workingGroup?.parent_id])

  return (
    <div className="w-full space-y-6">
      {workingGroup?.parent_id && parentLabel && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm">
          <span className="text-muted-foreground">Creating sub-working group under</span>
          <span className="font-medium text-foreground">{parentLabel}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-gray-900">General</h2>
        <HelpTextTooltip text="Basic information about this working group including its name, code, mandate, type, and status." />
      </div>

      {/* Row 1: Banner Image + Icon/Logo */}
      {!isCreating && workingGroupId && (
        <div className="flex gap-8 items-start">
          {/* Banner Image */}
          <div className="space-y-2 flex-1">
            <LabelSaveIndicator
              isSaving={bannerAutosave.state.isSaving}
              isSaved={!!bannerAutosave.state.lastSaved || (!isCreating && !!banner)}
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
                <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">Click or drag image to upload</p>
                <p className="text-xs text-gray-400 mt-0.5">Max size: 5MB</p>
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

          {/* Icon/Logo */}
          <div className="space-y-2 w-32 flex-shrink-0">
            <LabelSaveIndicator
              isSaving={iconAutosave.state.isSaving}
              isSaved={!!iconAutosave.state.lastSaved || (!isCreating && !!iconUrl)}
              hasValue={!!iconUrl}
            >
              Icon / Logo
            </LabelSaveIndicator>
            {iconUrl ? (
              <div className="relative w-32 h-32">
                <img
                  src={iconUrl}
                  alt="Icon"
                  className="w-32 h-32 object-contain rounded-lg border bg-gray-50"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
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
                className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => iconInputRef.current?.click()}
              >
                <ImageIcon className="h-6 w-6 text-gray-400 mb-1" />
                <p className="text-[10px] text-gray-500 text-center">Upload icon</p>
                <p className="text-[9px] text-gray-400 text-center">Max: 2MB</p>
              </div>
            )}
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
        </div>
      )}

      {/* Row 2: Name + Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <LabelSaveIndicator
              isSaving={labelAutosave.state.isSaving}
              isSaved={!!labelAutosave.state.lastSaved || (!isCreating && !!label)}
              hasValue={!!label}
            >
              Name <RequiredDot />
            </LabelSaveIndicator>
            <HelpTextTooltip size="sm" text="The full name of the working group as it appears in reports and listings." />
          </div>
          <Input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              if (!isCreating) labelAutosave.triggerSave(e.target.value)
            }}
            placeholder="e.g. Health Sector Working Group"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <LabelSaveIndicator
              isSaving={codeAutosave.state.isSaving}
              isSaved={!!codeAutosave.state.lastSaved || (!isCreating && !!code)}
              hasValue={!!code}
            >
              Code <RequiredDot />
            </LabelSaveIndicator>
            <HelpTextTooltip size="sm" text="A unique short identifier (e.g. TWG-Health, SWG-BasicEducation) used in references and exports." />
          </div>
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (!isCreating) codeAutosave.triggerSave(e.target.value)
            }}
            placeholder="e.g. TWG-HEALTH"
          />
        </div>
      </div>

      {/* Row 3: Description / Mandate — full width */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <LabelSaveIndicator
            isSaving={descAutosave.state.isSaving}
            isSaved={!!descAutosave.state.lastSaved || (!isCreating && !!description)}
            hasValue={!!description}
          >
            Description / Mandate
          </LabelSaveIndicator>
          <HelpTextTooltip size="sm" text="The purpose, mandate, and scope of this working group. This appears on the profile page." />
        </div>
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

      {/* Row 4: Working Group Type + Active Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <LabelSaveIndicator
              isSaving={groupTypeAutosave.state.isSaving}
              isSaved={!!groupTypeAutosave.state.lastSaved || (!isCreating && !!groupType)}
              hasValue={!!groupType}
            >
              Working Group Type
            </LabelSaveIndicator>
            <HelpTextTooltip size="sm" text="The classification of this working group (e.g. Technical, Thematic, Government). Use 'Sub-Working Group' for groups nested under a parent." />
          </div>
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
                  <span className="flex items-center gap-2">
                    <code className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{opt.code}</code>
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <LabelSaveIndicator
              isSaving={activeAutosave.state.isSaving}
              isSaved={!!activeAutosave.state.lastSaved || !isCreating}
              hasValue={true}
            >
              Active Status
            </LabelSaveIndicator>
            <HelpTextTooltip size="sm" text="Toggle whether this working group is currently active. Inactive groups are hidden from default views but data is preserved." />
          </div>
          <div className="flex items-center justify-between border rounded-md h-10 px-3">
            <span className="text-sm text-muted-foreground">{isActive ? 'Active' : 'Inactive'}</span>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => {
                setIsActive(checked)
                if (!isCreating) activeAutosave.triggerSave(checked)
              }}
            />
          </div>
        </div>
      </div>

      {/* Create button — only shown when creating */}
      {isCreating && (
        <Button
          onClick={handleCreate}
          disabled={creating || !label.trim() || !code.trim()}
          className="w-full"
        >
          {creating ? 'Creating...' : 'Create Working Group'}
        </Button>
      )}
    </div>
  )
}
