"use client"

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { HelpTooltip } from './HelpTooltip';
import type { NationalDevelopmentGoal } from '@/types/project-bank';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { cn } from '@/lib/utils';

function RequiredDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" />;
}

interface StageMSDPScreeningProps {
  wizard: UseAppraisalWizardReturn;
}

export function StageMSDPScreening({ wizard }: StageMSDPScreeningProps) {
  const { formData, updateField, errors } = wizard;
  const [goals, setGoals] = useState<NationalDevelopmentGoal[]>([]);

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await apiFetch('/api/national-development-goals');
        if (res.ok) setGoals(await res.json());
      } catch {}
    }
    fetchGoals();
  }, []);

  const activeGoals = goals.filter(g => g.is_active);
  const selectedGoalId = formData.ndp_goal_id;
  const secondaryGoals: string[] = formData.secondary_ndp_goals || [];
  const ndpAligned = formData.ndp_aligned;

  /** Handle selecting / deselecting an NDP goal */
  const handleGoalToggle = (goalId: string) => {
    if (goalId === selectedGoalId) {
      // If clicking the primary, promote first secondary or deselect all
      if (secondaryGoals.length > 0) {
        const [newPrimary, ...rest] = secondaryGoals;
        updateField('ndp_goal_id', newPrimary);
        updateField('secondary_ndp_goals', rest);
        updateField('ndp_aligned', true);
      } else {
        updateField('ndp_goal_id', null);
        updateField('secondary_ndp_goals', []);
        updateField('ndp_aligned', false);
      }
    } else if (secondaryGoals.includes(goalId)) {
      // Remove from secondary
      updateField('secondary_ndp_goals', secondaryGoals.filter(id => id !== goalId));
    } else if (!selectedGoalId) {
      // First selection becomes primary
      updateField('ndp_goal_id', goalId);
      updateField('ndp_aligned', true);
    } else {
      // Add as secondary
      updateField('secondary_ndp_goals', [...secondaryGoals, goalId]);
    }
  };

  const handleNotAligned = () => {
    updateField('ndp_goal_id', null);
    updateField('secondary_ndp_goals', []);
    updateField('ndp_aligned', false);
  };

  const isGoalSelected = (goalId: string) => goalId === selectedGoalId || secondaryGoals.includes(goalId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">MSDP Alignment Screening</h3>
        <p className="text-sm text-muted-foreground">
          Determine whether this project aligns with the Myanmar Sustainable Development Plan.
          MSDP alignment determines whether your project qualifies for additional economic analysis and PPP structuring.
        </p>
      </div>

      {/* Alignment status indicator — only show after user has made a selection */}
      {(ndpAligned !== undefined && ndpAligned !== null) && (
        <div className={cn(
          'p-4 rounded-lg border',
          ndpAligned ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
        )}>
          <div className="flex items-center gap-2">
            {ndpAligned ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <span className={cn('text-sm font-medium', ndpAligned ? 'text-green-700' : 'text-amber-700')}>
              {ndpAligned
                ? 'Project is aligned with MSDP'
                : 'Project is not currently aligned with MSDP'}
            </span>
          </div>
        </div>
      )}

      {/* Primary NDP Goal Selection */}
      <div>
        <Label className="mb-2 block">
          NDP Goals <RequiredDot />
          <HelpTooltip text="Select one or more National Development Plan goals. The first selected goal becomes the primary. Click additional goals to add as secondary." />
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Click to select goals. The first selected goal is the <strong>primary</strong>. Additional selections are secondary goals.
        </p>
        <div className="space-y-2">
          {/* Not aligned option */}
          <button
            type="button"
            onClick={handleNotAligned}
            className={cn(
              'w-full text-left p-3 rounded-lg border transition-colors',
              !ndpAligned
                ? 'border-amber-300 bg-amber-50'
                : 'border-muted-foreground/20 hover:border-muted-foreground/40',
            )}
          >
            <div className="text-sm font-medium">Not aligned with MSDP</div>
            <div className="text-xs text-muted-foreground">
              This project does not align with any NDP strategic area.
            </div>
          </button>

          {/* NDP Goals as cards */}
          {activeGoals.map(goal => {
            const isPrimary = selectedGoalId === goal.id;
            const isSecondary = secondaryGoals.includes(goal.id);
            const isSelected = isPrimary || isSecondary;

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => handleGoalToggle(goal.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  isPrimary
                    ? 'border-green-300 bg-green-50'
                    : isSecondary
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-muted-foreground/20 hover:border-muted-foreground/40',
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
            );
          })}
        </div>
      </div>

      {/* Additional fields when aligned */}
      {ndpAligned && (
        <>
          <div>
            <Label>MSDP Strategy Area <HelpTooltip text="The specific MSDP strategy or action area this project supports." /></Label>
            <Input
              value={formData.msdp_strategy_area || ''}
              onChange={e => updateField('msdp_strategy_area', e.target.value)}
              placeholder="e.g. Strategy 5.4: Transport and ICT Infrastructure"
            />
          </div>

          <div>
            <Label>Alignment Justification <HelpTooltip text="Explain how this project directly contributes to the selected NDP goals." /></Label>
            <Textarea
              value={formData.alignment_justification || ''}
              onChange={e => updateField('alignment_justification', e.target.value)}
              placeholder="Explain how this project contributes to the selected NDP goal..."
              rows={4}
            />
          </div>

          <div>
            <Label>Sector Strategy Reference <HelpTooltip text="Reference to the national sector strategy or master plan this project implements." /></Label>
            <Input
              value={formData.sector_strategy_reference || ''}
              onChange={e => updateField('sector_strategy_reference', e.target.value)}
              placeholder="e.g. National Transport Master Plan 2020"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={formData.in_sector_investment_plan || false}
              onCheckedChange={v => updateField('in_sector_investment_plan', v)}
            />
            <Label>Included in sector investment plan</Label>
          </div>
        </>
      )}

      {errors._form && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{errors._form}</p>
      )}
    </div>
  );
}
