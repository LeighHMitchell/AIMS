"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, MapPin } from "lucide-react"
import { TITLE_STATUS_OPTIONS, TITLE_STATUS_LABELS, STATE_ID_TO_REGION, REGION_TO_STATE_ID } from "@/lib/land-bank-utils"
import { StateRegionSelect } from "@/components/forms/StateRegionSelect"
import { TownshipSelect } from "@/components/forms/TownshipSelect"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-fetch"
import myanmarData from "@/data/myanmar-locations.json"
import { ParcelDrawMap } from "@/components/land-bank/ParcelDrawMap"
import { ParcelProgressRail } from "./ParcelProgressRail"
import { useParcelWizard } from "@/hooks/use-parcel-wizard"

/** Resolve township name → myanmar-locations ID */
function townshipNameToId(name: string | null): string {
  if (!name) return ""
  for (const state of myanmarData.states) {
    const match = state.townships.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    )
    if (match) return match.id
  }
  return ""
}

/** Resolve township ID → name */
function townshipIdToName(id: string): string {
  if (!id) return ""
  for (const state of myanmarData.states) {
    const match = state.townships.find((t) => t.id === id)
    if (match) return match.name
  }
  return ""
}

interface ParcelWizardProps {
  parcelId?: string
}

export function ParcelWizard({ parcelId }: ParcelWizardProps) {
  const router = useRouter()
  const wizard = useParcelWizard(parcelId)

  const {
    currentStep,
    currentStepIndex,
    steps,
    formData,
    classifications,
    assetTypes,
    ministries,
    isLoading,
    isSaving,
    errors,
    isEditMode,
    updateField,
    goToStep,
    canGoToStep,
    isStepComplete,
    saveAndContinue,
    saveAndBack,
    submit,
  } = wizard

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      {/* Progress Rail */}
      <ParcelProgressRail
        currentStep={currentStep}
        onStepClick={goToStep}
        canGoToStep={canGoToStep}
        isStepComplete={isStepComplete}
      />

      {/* Main Content */}
      <div>
        <Card>
          <CardContent className="p-6">
            {currentStep === "basic_info" && (
              <StepBasicInfo
                formData={formData}
                classifications={classifications}
                assetTypes={assetTypes}
                ministries={ministries}
                errors={errors}
                updateField={updateField}
              />
            )}
            {currentStep === "geometry" && (
              <StepGeometry
                geometry={formData.geometry}
                onChange={(g) => updateField("geometry", g)}
              />
            )}
            {currentStep === "review" && (
              <StepReview
                formData={formData}
                isEditMode={isEditMode}
              />
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {errors._form && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mt-4">
            {errors._form}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => isFirstStep ? router.back() : saveAndBack()}
            disabled={isSaving}
          >
            {isFirstStep ? "\u2190 Cancel" : "\u2190 Back"}
          </Button>

          <Button
            onClick={isLastStep ? submit : saveAndContinue}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {isLastStep
              ? (isEditMode ? "Save Changes" : "Register Parcel")
              : "Continue \u2192"}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Step: Basic Information ───────────────────────────────── */

function StepBasicInfo({
  formData,
  classifications,
  assetTypes,
  ministries,
  errors,
  updateField,
}: {
  formData: ReturnType<typeof useParcelWizard>["formData"]
  classifications: { name: string }[]
  assetTypes: { name: string }[]
  ministries: { id: string; name: string; code: string }[]
  errors: Record<string, string>
  updateField: ReturnType<typeof useParcelWizard>["updateField"]
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Basic Information</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wiz-name">Parcel Name *</Label>
          <Input
            id="wiz-name"
            value={formData.name}
            onChange={e => updateField("name", e.target.value)}
            placeholder="e.g. Thilawa Industrial Plot A"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="wiz-code">
            Parcel Code
            <span className="text-xs text-muted-foreground ml-1">(auto-generated if blank)</span>
          </Label>
          <Input
            id="wiz-code"
            value={formData.parcel_code}
            onChange={e => updateField("parcel_code", e.target.value)}
            placeholder="e.g. YGN-0001"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>State/Region *</Label>
          <StateRegionSelect
            value={REGION_TO_STATE_ID[formData.state_region] || ""}
            onValueChange={(v) => {
              const stateId = v as string
              const regionName = STATE_ID_TO_REGION[stateId] || ""
              updateField("state_region", regionName)
              // Reset township when state changes
              updateField("township", "")
            }}
            placeholder="Select region..."
          />
          {errors.state_region && <p className="text-xs text-destructive">{errors.state_region}</p>}
        </div>
        <div className="space-y-2">
          <Label>Township</Label>
          <TownshipSelect
            value={townshipNameToId(formData.township)}
            onValueChange={(id) => {
              updateField("township", townshipIdToName(id))
            }}
            stateId={REGION_TO_STATE_ID[formData.state_region] || undefined}
            placeholder="Select township..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wiz-size">Size (Hectares)</Label>
          <Input
            id="wiz-size"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.size_hectares}
            onChange={e => updateField("size_hectares", e.target.value)}
            placeholder="e.g. 150"
          />
        </div>
        <div className="space-y-2">
          <Label>Classification</Label>
          <Select value={formData.classification} onValueChange={v => updateField("classification", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {classifications.map(c => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Controlling Ministry</Label>
          <Select value={formData.controlling_ministry_id} onValueChange={v => updateField("controlling_ministry_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select ministry..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {ministries.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Asset Type</Label>
          <Select value={formData.asset_type} onValueChange={v => updateField("asset_type", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select asset type..." />
            </SelectTrigger>
            <SelectContent>
              {assetTypes.map(a => (
                <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title/Legal Status</Label>
          <Select value={formData.title_status} onValueChange={v => updateField("title_status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status..." />
            </SelectTrigger>
            <SelectContent>
              {TITLE_STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>{TITLE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submitter Information */}
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Submitter Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wiz-sub-first">First Name</Label>
            <Input
              id="wiz-sub-first"
              value={formData.submitter_first_name}
              onChange={e => updateField("submitter_first_name", e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-sub-last">Last Name</Label>
            <Input
              id="wiz-sub-last"
              value={formData.submitter_last_name}
              onChange={e => updateField("submitter_last_name", e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-sub-org">Organization</Label>
            <Input
              id="wiz-sub-org"
              value={formData.submitter_organization}
              onChange={e => updateField("submitter_organization", e.target.value)}
              placeholder="Organization"
            />
          </div>
        </div>
      </div>

      {/* NDP/MSDP Goal alignment */}
      <NdpGoalCards
        primaryGoalId={formData.ndp_goal_id}
        secondaryGoalIds={formData.secondary_ndp_goals}
        updateField={updateField}
      />

      <div className="space-y-2">
        <Label htmlFor="wiz-notes">Notes</Label>
        <Textarea
          id="wiz-notes"
          value={formData.notes}
          onChange={e => updateField("notes", e.target.value)}
          placeholder="Additional details about this parcel..."
          rows={3}
        />
      </div>
    </div>
  )
}

/* ─── Step: Geometry ────────────────────────────────────────── */

function StepGeometry({
  geometry,
  onChange,
}: {
  geometry: any | null
  onChange: (geometry: any | null) => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Geometry</h2>
      <p className="text-sm text-muted-foreground">
        Draw a polygon on the map or upload a GeoJSON file to define the parcel boundary. You can skip this step and add geometry later.
      </p>
      <ParcelDrawMap geometry={geometry} onChange={onChange} />
    </div>
  )
}

/* ─── Step: Review ──────────────────────────────────────────── */

function StepReview({
  formData,
  isEditMode,
}: {
  formData: ReturnType<typeof useParcelWizard>["formData"]
  isEditMode: boolean
}) {
  const fields: { label: string; value: string | null }[] = [
    { label: "Parcel Name", value: formData.name || null },
    { label: "Parcel Code", value: formData.parcel_code || "(auto-generated)" },
    { label: "State/Region", value: formData.state_region || null },
    { label: "Township", value: formData.township || null },
    { label: "Size (Hectares)", value: formData.size_hectares || null },
    { label: "Classification", value: formData.classification || null },
    { label: "Asset Type", value: formData.asset_type || null },
    { label: "Title Status", value: formData.title_status || null },
    { label: "Notes", value: formData.notes || null },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">
        {isEditMode ? "Review Changes" : "Review & Register"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {isEditMode
          ? "Please review the changes below before saving."
          : "Please review the parcel details below before registering."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {fields.map(f => (
          <div key={f.label}>
            <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
            <dd className="text-sm mt-0.5">{f.value || "\u2014"}</dd>
          </div>
        ))}
      </div>

      {/* Geometry preview */}
      <div>
        <dt className="text-xs font-medium text-muted-foreground mb-2">Geometry</dt>
        {formData.geometry ? (
          <div className="border rounded-lg overflow-hidden">
            <ParcelDrawMap geometry={formData.geometry} onChange={() => {}} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
            <MapPin className="h-4 w-4" />
            No geometry defined
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── NDP/MSDP Goal Card Toggle ───────────────────────────── */

interface NdpGoal {
  id: string
  code: string
  name: string
  description?: string | null
  is_active?: boolean
}

function NdpGoalCards({
  primaryGoalId,
  secondaryGoalIds,
  updateField,
}: {
  primaryGoalId: string
  secondaryGoalIds: string[]
  updateField: ReturnType<typeof useParcelWizard>["updateField"]
}) {
  const [goals, setGoals] = useState<NdpGoal[]>([])

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await apiFetch("/api/national-development-goals")
        if (res.ok) setGoals(await res.json())
      } catch {}
    }
    fetchGoals()
  }, [])

  const activeGoals = goals.filter(g => g.is_active !== false)

  const handleGoalToggle = (goalId: string) => {
    if (goalId === primaryGoalId) {
      // Clicking primary: promote first secondary or deselect all
      if (secondaryGoalIds.length > 0) {
        const [newPrimary, ...rest] = secondaryGoalIds
        updateField("ndp_goal_id", newPrimary)
        updateField("secondary_ndp_goals", rest)
      } else {
        updateField("ndp_goal_id", "")
        updateField("secondary_ndp_goals", [])
      }
    } else if (secondaryGoalIds.includes(goalId)) {
      // Remove from secondary
      updateField("secondary_ndp_goals", secondaryGoalIds.filter(id => id !== goalId))
    } else if (!primaryGoalId) {
      // First selection becomes primary
      updateField("ndp_goal_id", goalId)
    } else {
      // Add as secondary
      updateField("secondary_ndp_goals", [...secondaryGoalIds, goalId])
    }
  }

  if (activeGoals.length === 0) return null

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <h3 className="text-sm font-semibold">NDP/MSDP Goal Alignment</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Click to select goals. First selected = primary (green). Additional = secondary (blue).
        </p>
      </div>
      <div className="space-y-2">
        {activeGoals.map(goal => {
          const isPrimary = primaryGoalId === goal.id
          const isSecondary = secondaryGoalIds.includes(goal.id)

          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => handleGoalToggle(goal.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                isPrimary
                  ? "border-green-300 bg-green-50"
                  : isSecondary
                  ? "border-blue-300 bg-blue-50"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-muted-foreground">{goal.code}</span>
                <span className="text-sm font-medium">{goal.name}</span>
                {isPrimary && (
                  <span className="ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-green-200 text-green-800">Primary</span>
                )}
                {isSecondary && (
                  <span className="ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">Secondary</span>
                )}
              </div>
              {goal.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.description}</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
