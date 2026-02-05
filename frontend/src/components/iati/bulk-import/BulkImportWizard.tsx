'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Globe,
  Eye,
  Settings,
  Play,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import BulkImportSourceStep from './BulkImportSourceStep'
import BulkPreviewStep from './BulkPreviewStep'
import BulkImportRulesStep from './BulkImportRulesStep'
import BulkImportExecutionStep from './BulkImportExecutionStep'
import BulkImportResultsStep from './BulkImportResultsStep'
import type {
  BulkImportStep,
  BulkImportMeta,
  BulkImportState,
  ImportSourceMode,
  ImportRules,
  ParsedActivity,
  BatchStatus,
} from './types'

const STEPS: { key: BulkImportStep; label: string; icon: React.ElementType }[] = [
  { key: 'source', label: 'Source', icon: Globe },
  { key: 'preview', label: 'Preview', icon: Eye },
  { key: 'rules', label: 'Rules', icon: Settings },
  { key: 'import', label: 'Import', icon: Play },
  { key: 'results', label: 'Results', icon: BarChart3 },
]

const STEP_ORDER: BulkImportStep[] = ['source', 'preview', 'rules', 'import', 'results']

interface WizardState extends BulkImportState {
  refreshKey: number
}

function initialState(): WizardState {
  return {
    step: 'source',
    sourceMode: 'datastore',
    file: null,
    meta: null,
    parsedActivities: [],
    allParsedData: null,
    selectedActivityIds: new Set(),
    importRules: {
      activityMatching: 'update_existing',
      transactionHandling: 'replace_all',
      autoMatchOrganizations: true,
    },
    batchId: null,
    batchStatus: null,
    validationSummary: null,
    fetchStatus: 'idle',
    fetchError: null,
    refreshKey: 0,
  }
}

export default function BulkImportWizard() {
  const [state, setState] = useState<WizardState>(initialState)

  const stepIndex = STEP_ORDER.indexOf(state.step)

  const canGoNext = (): boolean => {
    switch (state.step) {
      case 'source':
        return state.parsedActivities.length > 0 && !!state.meta
      case 'preview':
        return state.selectedActivityIds.size > 0
      case 'rules':
        return true
      case 'import':
        return !!state.batchStatus && (state.batchStatus.status === 'completed' || state.batchStatus.status === 'failed')
      default:
        return false
    }
  }

  const goNext = () => {
    const nextIdx = stepIndex + 1
    if (nextIdx < STEP_ORDER.length) {
      setState(prev => ({ ...prev, step: STEP_ORDER[nextIdx] }))
    }
  }

  const goBack = () => {
    const prevIdx = stepIndex - 1
    if (prevIdx >= 0 && state.step !== 'import' && state.step !== 'results') {
      setState(prev => ({ ...prev, step: STEP_ORDER[prevIdx] }))
    }
  }

  const handleRefresh = () => {
    // Reset state and increment refreshKey to force component remount
    setState(prev => ({
      ...prev,
      parsedActivities: [],
      meta: null,
      selectedActivityIds: new Set(),
      validationSummary: null,
      fetchStatus: 'idle',
      fetchError: null,
      refreshKey: prev.refreshKey + 1,
    }))
  }

  const handleSourceModeChange = useCallback((mode: ImportSourceMode) => {
    setState(prev => ({ ...prev, sourceMode: mode }))
  }, [])

  const handleActivitiesReady = useCallback((activities: ParsedActivity[], meta: BulkImportMeta) => {
    // Select all activities that don't have blocking errors by default
    const validIds = new Set(
      activities
        .filter(a => !a.validationIssues?.some(i => i.severity === 'error'))
        .map(a => a.iatiIdentifier)
    )
    setState(prev => ({
      ...prev,
      parsedActivities: activities,
      meta,
      selectedActivityIds: validIds,
      validationSummary: {
        total: activities.length,
        valid: activities.filter(a => !a.validationIssues?.some(i => i.severity === 'error')).length,
        warnings: activities.filter(a => a.validationIssues?.some(i => i.severity === 'warning') && !a.validationIssues?.some(i => i.severity === 'error')).length,
        errors: activities.filter(a => a.validationIssues?.some(i => i.severity === 'error')).length,
      },
      batchId: null,
      batchStatus: null,
    }))
  }, [])

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setState(prev => ({ ...prev, selectedActivityIds: ids }))
  }, [])

  const handleRulesChange = useCallback((rules: ImportRules) => {
    setState(prev => ({ ...prev, importRules: rules }))
  }, [])

  const handleBatchComplete = useCallback((batchStatus: BatchStatus) => {
    setState(prev => ({ ...prev, batchStatus, step: 'results' }))
  }, [])

  const handleBatchIdChange = useCallback((id: string) => {
    setState(prev => ({ ...prev, batchId: id }))
  }, [])

  const handleStartNew = useCallback(() => {
    setState(initialState())
  }, [])

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left Sidebar - Stepper */}
      <div className="w-56 shrink-0">
        <nav className="space-y-1">
          {STEPS.map((s, index) => {
            const isActive = state.step === s.key
            const isPast = stepIndex > index
            const Icon = s.icon

            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : isPast
                      ? 'text-gray-700'
                      : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : isPast
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-900 text-white opacity-40'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span>{s.label}</span>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Right Panel - Step Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          {state.step === 'source' && (
            <BulkImportSourceStep
              key={state.refreshKey}
              sourceMode={state.sourceMode}
              onSourceModeChange={handleSourceModeChange}
              onActivitiesReady={handleActivitiesReady}
              activitiesLoaded={state.parsedActivities.length > 0}
            />
          )}
          {state.step === 'preview' && (
            <BulkPreviewStep
              activities={state.parsedActivities}
              selectedIds={state.selectedActivityIds}
              onSelectionChange={handleSelectionChange}
            />
          )}
          {state.step === 'rules' && (
            <BulkImportRulesStep
              rules={state.importRules}
              onRulesChange={handleRulesChange}
              activities={state.parsedActivities}
              selectedIds={state.selectedActivityIds}
            />
          )}
          {state.step === 'import' && state.meta && (
            <BulkImportExecutionStep
              activities={state.parsedActivities}
              selectedIds={state.selectedActivityIds}
              importRules={state.importRules}
              meta={state.meta}
              onComplete={handleBatchComplete}
              batchId={state.batchId}
              onBatchIdChange={handleBatchIdChange}
            />
          )}
          {state.step === 'results' && state.batchStatus && (
            <BulkImportResultsStep
              batchStatus={state.batchStatus}
              onStartNew={handleStartNew}
            />
          )}
        </div>

        {/* Bottom Navigation Bar */}
        {state.step !== 'results' && (
          <div className="sticky bottom-0 bg-white border-t pt-4 mt-6 flex items-center justify-between">
            {state.step === 'import' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Go back to rules step and reset batch state
                    setState(prev => ({
                      ...prev,
                      step: 'rules',
                      batchId: null,
                      batchStatus: null,
                    }))
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel Import
                </Button>
                <div className="text-sm text-gray-500">
                  {state.batchStatus?.status === 'completed' || state.batchStatus?.status === 'failed' ? (
                    <Button onClick={goNext}>
                      View Results
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    'Import in progress...'
                  )}
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={stepIndex === 0 ? handleRefresh : goBack}
                >
                  {stepIndex === 0 ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </>
                  )}
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canGoNext()}
                >
                  {state.step === 'rules' ? 'Start Import' : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
