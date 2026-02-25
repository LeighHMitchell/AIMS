"use client"

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import type { NationalDevelopmentGoal } from '@/types/project-bank';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { cn } from '@/lib/utils';

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
  const ndpAligned = formData.ndp_aligned;

  const handleGoalSelect = (goalId: string | null) => {
    if (goalId) {
      updateField('ndp_goal_id', goalId);
      updateField('ndp_aligned', true);
    } else {
      updateField('ndp_goal_id', null);
      updateField('ndp_aligned', false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">MSDP Alignment Screening</h3>
        <p className="text-sm text-muted-foreground">
          Determine whether this project aligns with the Myanmar Sustainable Development Plan.
          MSDP alignment is required for projects with FIRR below 10% to proceed to economic analysis.
        </p>
      </div>

      {/* Alignment status indicator */}
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
        {!ndpAligned && (
          <p className="text-xs text-amber-600 mt-1 ml-7">
            Without MSDP alignment, projects with FIRR below 10% will be rejected at the financial analysis stage.
          </p>
        )}
      </div>

      {/* Primary NDP Goal Selection */}
      <div>
        <Label className="mb-2 block">Primary NDP Goal</Label>
        <div className="space-y-2">
          {/* Not aligned option */}
          <button
            type="button"
            onClick={() => handleGoalSelect(null)}
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
          {activeGoals.map(goal => (
            <button
              key={goal.id}
              type="button"
              onClick={() => handleGoalSelect(goal.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-colors',
                selectedGoalId === goal.id
                  ? 'border-green-300 bg-green-50'
                  : 'border-muted-foreground/20 hover:border-muted-foreground/40',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-muted-foreground">{goal.code}</span>
                <span className="text-sm font-medium">{goal.name}</span>
              </div>
              {goal.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{goal.description}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Additional fields when aligned */}
      {ndpAligned && (
        <>
          <div>
            <Label>MSDP Strategy Area</Label>
            <Input
              value={formData.msdp_strategy_area || ''}
              onChange={e => updateField('msdp_strategy_area', e.target.value)}
              placeholder="e.g. Strategy 5.4: Transport and ICT Infrastructure"
            />
          </div>

          <div>
            <Label>Alignment Justification</Label>
            <Textarea
              value={formData.alignment_justification || ''}
              onChange={e => updateField('alignment_justification', e.target.value)}
              placeholder="Explain how this project contributes to the selected NDP goal..."
              rows={4}
            />
          </div>

          <div>
            <Label>Sector Strategy Reference</Label>
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

          {/* SDG Goals (multi-select) */}
          <div>
            <Label>SDG Goals</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Array.from({ length: 17 }, (_, i) => {
                const val = String(i + 1);
                const selected = (formData.sdg_goals || []).includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const current = formData.sdg_goals || [];
                      updateField(
                        'sdg_goals',
                        selected ? current.filter((g: string) => g !== val) : [...current, val]
                      );
                    }}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selected
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-background border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40'
                    }`}
                  >
                    SDG {val}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {errors._form && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{errors._form}</p>
      )}
    </div>
  );
}
