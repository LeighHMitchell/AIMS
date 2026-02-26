"use client"

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
import { STATES_REGIONS, TITLE_STATUS_OPTIONS, TITLE_STATUS_LABELS } from "@/lib/land-bank-utils"
import { NdpGoalSelector } from "@/components/land-bank/NdpGoalSelector"
import { ParcelDrawMap } from "@/components/land-bank/ParcelDrawMap"
import { ParcelProgressRail } from "./ParcelProgressRail"
import { useParcelWizard } from "@/hooks/use-parcel-wizard"

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
          <Select value={formData.state_region} onValueChange={v => updateField("state_region", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select region..." />
            </SelectTrigger>
            <SelectContent>
              {STATES_REGIONS.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state_region && <p className="text-xs text-destructive">{errors.state_region}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="wiz-township">Township</Label>
          <Input
            id="wiz-township"
            value={formData.township}
            onChange={e => updateField("township", e.target.value)}
            placeholder="e.g. Thilawa"
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

      {/* NDP/MSDP Goal alignment */}
      <NdpGoalSelector
        primaryGoalId={formData.ndp_goal_id}
        secondaryGoalIds={formData.secondary_ndp_goals}
        onPrimaryChange={v => updateField("ndp_goal_id", v)}
        onSecondaryChange={v => updateField("secondary_ndp_goals", v)}
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
