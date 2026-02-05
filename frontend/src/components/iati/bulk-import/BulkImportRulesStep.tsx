'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  SkipForward,
  ArrowRightLeft,
  Building2,
} from 'lucide-react'
import type { ImportRules, ParsedActivity, ImpactPreview } from './types'

interface BulkImportRulesStepProps {
  rules: ImportRules
  onRulesChange: (rules: ImportRules) => void
  activities: ParsedActivity[]
  selectedIds: Set<string>
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
      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
        checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${checked ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="font-medium text-sm">{label}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </label>
  )
}

export default function BulkImportRulesStep({
  rules,
  onRulesChange,
  activities,
  selectedIds,
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
      {/* Activity Matching */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Matching</CardTitle>
          <CardDescription>How to handle activities that already exist in the database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioOption
            name="activityMatching"
            value="update_existing"
            checked={rules.activityMatching === 'update_existing'}
            onChange={() => onRulesChange({ ...rules, activityMatching: 'update_existing' })}
            label="Update Existing (Recommended)"
            description="Update existing activities with data from the file. New activities will be created."
            icon={RefreshCw}
          />
          <RadioOption
            name="activityMatching"
            value="skip_existing"
            checked={rules.activityMatching === 'skip_existing'}
            onChange={() => onRulesChange({ ...rules, activityMatching: 'skip_existing' })}
            label="Skip Existing"
            description="Only import new activities. Existing activities will be left unchanged."
            icon={SkipForward}
          />
          <RadioOption
            name="activityMatching"
            value="create_new_version"
            checked={rules.activityMatching === 'create_new_version'}
            onChange={() => onRulesChange({ ...rules, activityMatching: 'create_new_version' })}
            label="Create New Version"
            description="Always create a new activity, even if one with the same IATI ID exists."
            icon={Plus}
          />
        </CardContent>
      </Card>

      {/* Transaction Handling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Handling</CardTitle>
          <CardDescription>How to handle transactions when updating existing activities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioOption
            name="transactionHandling"
            value="replace_all"
            checked={rules.transactionHandling === 'replace_all'}
            onChange={() => onRulesChange({ ...rules, transactionHandling: 'replace_all' })}
            label="Replace All (Recommended)"
            description="Remove existing transactions and import new ones from the file."
            icon={ArrowRightLeft}
          />
          <RadioOption
            name="transactionHandling"
            value="append_new"
            checked={rules.transactionHandling === 'append_new'}
            onChange={() => onRulesChange({ ...rules, transactionHandling: 'append_new' })}
            label="Append New"
            description="Add new transactions without removing existing ones."
            icon={Plus}
          />
          <RadioOption
            name="transactionHandling"
            value="skip"
            checked={rules.transactionHandling === 'skip'}
            onChange={() => onRulesChange({ ...rules, transactionHandling: 'skip' })}
            label="Skip Transactions"
            description="Import activities only. Do not import any transactions."
            icon={SkipForward}
          />
        </CardContent>
      </Card>

      {/* Organization Resolution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Resolution</CardTitle>
          <CardDescription>How to resolve organizations referenced in transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-400" />
              <div>
                <Label className="font-medium">Auto-match by IATI Org ID</Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically find or create organizations using their IATI reference
                </p>
              </div>
            </div>
            <Switch
              checked={rules.autoMatchOrganizations}
              onCheckedChange={(checked) => onRulesChange({ ...rules, autoMatchOrganizations: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Impact Preview */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Import Impact Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <Plus className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{impact.toCreate}</p>
              <p className="text-xs text-gray-600">Will be created</p>
            </div>
            <div className="text-center">
              <RefreshCw className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{impact.toUpdate}</p>
              <p className="text-xs text-gray-600">Will be updated</p>
            </div>
            <div className="text-center">
              <SkipForward className="h-5 w-5 mx-auto mb-1 text-gray-500" />
              <p className="text-2xl font-bold text-gray-500">{impact.toSkip}</p>
              <p className="text-xs text-gray-600">Will be skipped</p>
            </div>
            <div className="text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{impact.totalTransactions}</p>
              <p className="text-xs text-gray-600">Transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
