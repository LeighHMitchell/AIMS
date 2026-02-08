'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  SkipForward,
  ArrowRightLeft,
  Building2,
  GitMerge,
  Receipt,
  Users,
} from 'lucide-react'
import type { ImportRules, ImportSourceMode, ParsedActivity, ImpactPreview } from './types'

interface BulkImportRulesStepProps {
  rules: ImportRules
  onRulesChange: (rules: ImportRules) => void
  activities: ParsedActivity[]
  selectedIds: Set<string>
  sourceMode?: ImportSourceMode
}

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  icon: Icon,
}: {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  label: string
  description: string
  icon: React.ElementType
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        checked
          ? 'border-2 border-gray-900 bg-gray-50'
          : 'border border-gray-200 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${checked ? 'text-gray-900' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${checked ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{label}</span>
        <p className="text-xs mt-0.5 text-gray-500">{description}</p>
      </div>
    </label>
  )
}

export default function BulkImportRulesStep({
  rules,
  onRulesChange,
  activities,
  selectedIds,
  sourceMode,
}: BulkImportRulesStepProps) {
  const impact: ImpactPreview = useMemo(() => {
    const selected = activities.filter(a => selectedIds.has(a.iatiIdentifier))
    let toCreate = 0
    let toUpdate = 0
    let toSkip = 0
    let totalTransactions = 0

    for (const a of selected) {
      totalTransactions += (a.transactions || []).length
      if (a.matched) {
        if (rules.activityMatching === 'skip_existing') {
          toSkip++
        } else if (rules.activityMatching === 'update_existing') {
          toUpdate++
        } else {
          toCreate++
        }
      } else {
        toCreate++
      }
    }

    return { toCreate, toUpdate, toSkip, totalTransactions }
  }, [activities, selectedIds, rules])

  return (
    <div className="space-y-6">
      {/* Three hero cards in a row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Activity Matching */}
        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <GitMerge className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Activity Matching</h3>
                <p className="text-xs text-gray-500">Handle existing activities</p>
              </div>
            </div>
            <div className="space-y-2">
              <RadioOption
                name="activityMatching"
                value="update_existing"
                checked={rules.activityMatching === 'update_existing'}
                onChange={() => onRulesChange({ ...rules, activityMatching: 'update_existing' })}
                label="Update Existing"
                description="Merge with existing data"
                icon={RefreshCw}
              />
              <RadioOption
                name="activityMatching"
                value="skip_existing"
                checked={rules.activityMatching === 'skip_existing'}
                onChange={() => onRulesChange({ ...rules, activityMatching: 'skip_existing' })}
                label="Skip Existing"
                description="Only import new ones"
                icon={SkipForward}
              />
              <RadioOption
                name="activityMatching"
                value="create_new_version"
                checked={rules.activityMatching === 'create_new_version'}
                onChange={() => onRulesChange({ ...rules, activityMatching: 'create_new_version' })}
                label="Create New Version"
                description="Always create new"
                icon={Plus}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transaction Handling */}
        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Receipt className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Transaction Handling</h3>
                <p className="text-xs text-gray-500">Handle transaction data</p>
              </div>
            </div>
            <div className="space-y-2">
              <RadioOption
                name="transactionHandling"
                value="replace_all"
                checked={rules.transactionHandling === 'replace_all'}
                onChange={() => onRulesChange({ ...rules, transactionHandling: 'replace_all' })}
                label="Replace All"
                description="Clear and re-import"
                icon={ArrowRightLeft}
              />
              <RadioOption
                name="transactionHandling"
                value="append_new"
                checked={rules.transactionHandling === 'append_new'}
                onChange={() => onRulesChange({ ...rules, transactionHandling: 'append_new' })}
                label="Append New"
                description="Add without removing"
                icon={Plus}
              />
              <RadioOption
                name="transactionHandling"
                value="skip"
                checked={rules.transactionHandling === 'skip'}
                onChange={() => onRulesChange({ ...rules, transactionHandling: 'skip' })}
                label="Skip Transactions"
                description="Don't import any"
                icon={SkipForward}
              />
            </div>
          </CardContent>
        </Card>

        {/* Organization Resolution */}
        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Organization Resolution</h3>
                <p className="text-xs text-gray-500">Match referenced orgs</p>
              </div>
            </div>
            <div
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                rules.autoMatchOrganizations
                  ? 'border-2 border-gray-900 bg-gray-50'
                  : 'border border-gray-200 hover:border-gray-400'
              }`}
              onClick={() => onRulesChange({ ...rules, autoMatchOrganizations: !rules.autoMatchOrganizations })}
            >
              <div className="flex items-center gap-3">
                <Building2 className={`h-4 w-4 ${rules.autoMatchOrganizations ? 'text-gray-900' : 'text-gray-400'}`} />
                <div>
                  <Label className={`text-sm cursor-pointer ${rules.autoMatchOrganizations ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    Auto-match by IATI ID
                  </Label>
                  <p className="text-xs mt-0.5 text-gray-500">
                    Find or create orgs automatically
                  </p>
                </div>
              </div>
              <Switch
                checked={rules.autoMatchOrganizations}
                onCheckedChange={(checked) => onRulesChange({ ...rules, autoMatchOrganizations: checked })}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 px-1">
              When enabled, organizations referenced in transactions will be matched by their IATI identifier or created if not found.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Sync Option - only for Datastore imports */}
      {sourceMode === 'datastore' && (
        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                rules.enableAutoSync
                  ? 'border-2 border-gray-900 bg-gray-50'
                  : 'border border-gray-200 hover:border-gray-400'
              }`}
              onClick={() => onRulesChange({ ...rules, enableAutoSync: !rules.enableAutoSync })}
            >
              <div className="flex items-center gap-3">
                <RefreshCw className={`h-4 w-4 ${rules.enableAutoSync ? 'text-gray-900' : 'text-gray-400'}`} />
                <div>
                  <Label className={`text-sm cursor-pointer ${rules.enableAutoSync ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    Enable Auto-Sync
                  </Label>
                  <p className="text-xs mt-0.5 text-gray-500">
                    Keep these activities synchronized with the IATI Datastore
                  </p>
                </div>
              </div>
              <Switch
                checked={rules.enableAutoSync || false}
                onCheckedChange={(checked) => onRulesChange({ ...rules, enableAutoSync: checked })}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 px-1">
              When enabled, imported activities will be automatically checked against the IATI Datastore every 24 hours and updated with any changes to the fields that were imported.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Impact Preview - monochrome */}
      <Card className="border-gray-300 bg-gray-50">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Import Impact Preview</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <Plus className="h-5 w-5 mx-auto mb-1 text-gray-700" />
              <p className="text-2xl font-bold text-gray-900">{impact.toCreate}</p>
              <p className="text-xs text-gray-500">Will be created</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <RefreshCw className="h-5 w-5 mx-auto mb-1 text-gray-700" />
              <p className="text-2xl font-bold text-gray-900">{impact.toUpdate}</p>
              <p className="text-xs text-gray-500">Will be updated</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <SkipForward className="h-5 w-5 mx-auto mb-1 text-gray-700" />
              <p className="text-2xl font-bold text-gray-900">{impact.toSkip}</p>
              <p className="text-xs text-gray-500">Will be skipped</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-gray-700" />
              <p className="text-2xl font-bold text-gray-900">{impact.totalTransactions}</p>
              <p className="text-xs text-gray-500">Transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
