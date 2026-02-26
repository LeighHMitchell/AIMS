"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api-fetch"
import { generateParcelCodeSuggestion } from "@/lib/land-bank-utils"

export type ParcelWizardStep = "basic_info" | "geometry" | "review"

const STEP_ORDER: ParcelWizardStep[] = ["basic_info", "geometry", "review"]

export interface ParcelFormData {
  name: string
  parcel_code: string
  state_region: string
  township: string
  size_hectares: string
  classification: string
  controlling_ministry_id: string
  asset_type: string
  title_status: string
  ndp_goal_id: string
  secondary_ndp_goals: string[]
  notes: string
  geometry: any | null
}

export interface UseParcelWizardReturn {
  parcelId: string | null
  currentStep: ParcelWizardStep
  currentStepIndex: number
  steps: ParcelWizardStep[]
  formData: ParcelFormData
  classifications: { name: string }[]
  isLoading: boolean
  isSaving: boolean
  errors: Record<string, string>
  isEditMode: boolean

  updateField: <K extends keyof ParcelFormData>(key: K, value: ParcelFormData[K]) => void
  validateCurrentStep: () => Record<string, string>
  goToStep: (step: ParcelWizardStep) => void
  canGoToStep: (step: ParcelWizardStep) => boolean
  isStepComplete: (step: ParcelWizardStep) => boolean
  saveAndContinue: () => void
  saveAndBack: () => void
  submit: () => Promise<void>
}

export function useParcelWizard(parcelId?: string): UseParcelWizardReturn {
  const router = useRouter()
  const isEditMode = !!parcelId
  const [currentStep, setCurrentStep] = useState<ParcelWizardStep>("basic_info")
  const [formData, setFormData] = useState<ParcelFormData>({
    name: "",
    parcel_code: "",
    state_region: "",
    township: "",
    size_hectares: "",
    classification: "",
    controlling_ministry_id: "",
    asset_type: "",
    title_status: "Unregistered",
    ndp_goal_id: "",
    secondary_ndp_goals: [],
    notes: "",
    geometry: null,
  })
  const [classifications, setClassifications] = useState<{ name: string }[]>([])
  const [assetTypes, setAssetTypes] = useState<{ name: string }[]>([])
  const [ministries, setMinistries] = useState<{ id: string; name: string; code: string }[]>([])
  const [isLoading, setIsLoading] = useState(!!parcelId)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [codeAutoSet, setCodeAutoSet] = useState(false)

  const currentStepIndex = STEP_ORDER.indexOf(currentStep)

  // Load classifications (and parcel data in edit mode) on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const promises: Promise<Response>[] = [
          apiFetch("/api/land-bank/classifications"),
          apiFetch("/api/land-bank/asset-types"),
          apiFetch("/api/line-ministries"),
        ]
        if (parcelId) {
          promises.push(apiFetch(`/api/land-bank/${parcelId}`))
        }

        const results = await Promise.all(promises)

        if (results[0].ok) {
          setClassifications(await results[0].json())
        }
        if (results[1].ok) {
          setAssetTypes(await results[1].json())
        }
        if (results[2].ok) {
          setMinistries(await results[2].json())
        }

        if (parcelId && results[3]?.ok) {
          const parcel = await results[3].json()
          setFormData({
            name: parcel.name || "",
            parcel_code: parcel.parcel_code || "",
            state_region: parcel.state_region || "",
            township: parcel.township || "",
            size_hectares: parcel.size_hectares ? String(parcel.size_hectares) : "",
            classification: parcel.classification || "",
            controlling_ministry_id: parcel.controlling_ministry_id || "",
            asset_type: parcel.asset_type || "",
            title_status: parcel.title_status || "Unregistered",
            ndp_goal_id: parcel.ndp_goal_id || "",
            secondary_ndp_goals: parcel.secondary_ndp_goals || [],
            notes: parcel.notes || "",
            geometry: parcel.geometry || null,
          })
          setCodeAutoSet(true) // Don't auto-suggest code in edit mode
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [parcelId])

  const updateField = useCallback(<K extends keyof ParcelFormData>(key: K, value: ParcelFormData[K]) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value }
      // Auto-suggest parcel code when region changes on new parcels
      if (key === "state_region" && !codeAutoSet && !prev.parcel_code) {
        next.parcel_code = generateParcelCodeSuggestion(value as string)
        setCodeAutoSet(true)
      }
      return next
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [codeAutoSet])

  const validateCurrentStep = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {}

    if (currentStep === "basic_info") {
      if (!formData.name.trim()) errs.name = "Parcel name is required"
      if (!formData.state_region) errs.state_region = "State/Region is required"
    }
    // geometry and review steps have no hard requirements

    setErrors(errs)
    return errs
  }, [currentStep, formData])

  const isStepComplete = useCallback((step: ParcelWizardStep): boolean => {
    const stepIdx = STEP_ORDER.indexOf(step)
    return stepIdx < currentStepIndex
  }, [currentStepIndex])

  const canGoToStep = useCallback((step: ParcelWizardStep): boolean => {
    const targetIdx = STEP_ORDER.indexOf(step)
    return targetIdx <= currentStepIndex
  }, [currentStepIndex])

  const goToStep = useCallback((step: ParcelWizardStep) => {
    if (canGoToStep(step)) {
      setCurrentStep(step)
    }
  }, [canGoToStep])

  const saveAndContinue = useCallback(() => {
    const validationErrors = validateCurrentStep()
    if (Object.keys(validationErrors).length > 0) return

    if (currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentStepIndex + 1])
    }
  }, [validateCurrentStep, currentStepIndex])

  const saveAndBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEP_ORDER[currentStepIndex - 1])
    }
  }, [currentStepIndex])

  const submit = useCallback(async () => {
    setIsSaving(true)
    setErrors({})

    try {
      const payload = {
        name: formData.name.trim(),
        parcel_code: formData.parcel_code.trim() || undefined,
        state_region: formData.state_region,
        township: formData.township.trim() || null,
        size_hectares: formData.size_hectares ? parseFloat(formData.size_hectares) : null,
        classification: formData.classification || null,
        controlling_ministry_id: formData.controlling_ministry_id || null,
        asset_type: formData.asset_type || null,
        title_status: formData.title_status || "Unregistered",
        ndp_goal_id: formData.ndp_goal_id && formData.ndp_goal_id !== "none" ? formData.ndp_goal_id : null,
        secondary_ndp_goals: formData.secondary_ndp_goals || [],
        notes: formData.notes.trim() || null,
        geometry: formData.geometry,
      }

      const url = parcelId ? `/api/land-bank/${parcelId}` : "/api/land-bank"
      const method = parcelId ? "PUT" : "POST"

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${parcelId ? "update" : "create"} parcel`)
      }

      const parcel = await res.json()
      router.push(`/land-bank/${parcel.id || parcelId}`)
    } catch (e: any) {
      setErrors({ _form: e.message })
    } finally {
      setIsSaving(false)
    }
  }, [formData, parcelId, router])

  return {
    parcelId: parcelId || null,
    currentStep,
    currentStepIndex,
    steps: STEP_ORDER,
    formData,
    classifications,
    assetTypes,
    ministries,
    isLoading,
    isSaving,
    errors,
    isEditMode,
    updateField,
    validateCurrentStep,
    goToStep,
    canGoToStep,
    isStepComplete,
    saveAndContinue,
    saveAndBack,
    submit,
  }
}
