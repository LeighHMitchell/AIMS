"use client"

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Check, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { apiFetch } from '@/lib/api-fetch';
import { HelpTooltip } from '@/components/ui/help-text-tooltip';
import { RequiredDot } from '@/components/ui/required-dot';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import type { NationalDevelopmentGoal } from '@/types/project-bank';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import { cn } from '@/lib/utils';


interface StageMSDPScreeningProps {
  wizard: UseAppraisalWizardReturn;
}

const CATEGORY_LABELS: Record<string, string> = {
  includedInNationalPlan: 'National Development Plans',
  linkedToGovFramework: 'Government Results Frameworks',
  mutualAccountabilityFramework: 'Accountability Frameworks',
  capacityDevFromNationalPlan: 'National Capacity Plans',
};

/** MSDP strategies keyed by goal number (1–5), sourced from MSDP 2018–2030 */
const MSDP_STRATEGIES: Record<number, { code: string; name: string }[]> = {
  1: [
    { code: '1.1', name: 'Secure and further foster Union-wide peace' },
    { code: '1.2', name: 'Promote equitable and conflict-sensitive socio-economic development throughout all States and Regions' },
    { code: '1.3', name: 'Promote greater access to justice, individual rights and adherence to the rule of law' },
    { code: '1.4', name: 'Enhance good governance, institutional performance and improve the efficiency of administrative decision making at all levels' },
    { code: '1.5', name: 'Increase the ability of all people to engage with government' },
  ],
  2: [
    { code: '2.1', name: 'Effectively manage the exchange rate and balance of payments' },
    { code: '2.2', name: 'Reduce inflation and maintain monetary stability' },
    { code: '2.3', name: 'Increase domestic revenue mobilisation through a fair, efficient and transparent taxation system' },
    { code: '2.4', name: 'Strengthen public financial management to support stability and the efficient allocation of public resources' },
    { code: '2.5', name: 'Enhance the efficiency and competitiveness of State Economic Enterprises' },
  ],
  3: [
    { code: '3.1', name: 'Create an enabling environment supporting a diverse and productive economy through inclusive agricultural, aquacultural and polycultural practices' },
    { code: '3.2', name: 'Support job creation in industry and services, especially through developing small and medium-sized enterprises' },
    { code: '3.3', name: 'Provide a secure, conducive investment enabling environment which eases the cost of doing business' },
    { code: '3.4', name: 'Further reform our trade sector and strengthen regional and international cooperation and linkages' },
    { code: '3.5', name: 'Increase broad-based access to financial services and strengthen the financial system overall' },
    { code: '3.6', name: 'Build a priority infrastructure base that facilitates sustainable growth and economic diversification' },
    { code: '3.7', name: 'Encourage greater creativity and innovation' },
  ],
  4: [
    { code: '4.1', name: 'Improve equitable access to high quality lifelong educational opportunities' },
    { code: '4.2', name: 'Strengthen health services systems enabling the provision of universal health care using a path that is explicitly pro-poor' },
    { code: '4.3', name: 'Expand an adaptive and systems-based social safety net and extend social protection services throughout the life cycle' },
    { code: '4.4', name: 'Increase secure access to food that is safe and well-balanced' },
    { code: '4.5', name: 'Protect the rights and harness the productivity of all, including migrant workers' },
  ],
  5: [
    { code: '5.1', name: 'Ensure a clean environment together with healthy and functioning ecosystems' },
    { code: '5.2', name: 'Increase climate change resilience, reduce exposure to disasters and shocks while protecting livelihoods' },
    { code: '5.3', name: 'Enable safe and equitable access to water and sanitation in ways that ensure environmental sustainability' },
    { code: '5.4', name: 'Provide affordable and reliable energy to populations and industries via an appropriate energy generation mix' },
    { code: '5.5', name: 'Improve land governance and sustainable management of resource-based industries' },
    { code: '5.6', name: 'Manage cities, towns, historical and cultural centres efficiently and sustainably' },
  ],
};

const MSDP_GOAL_IMAGES: Record<number, string> = {
  1: '/images/msdp-goal-1.png',
  2: '/images/msdp-goal-2.png',
  3: '/images/msdp-goal-3.png',
  4: '/images/msdp-goal-4.png',
  5: '/images/msdp-goal-5.png',
};

/** Extract goal number from an NDP goal code like "MSDP-3" → 3 */
function goalNumber(code: string): number {
  const m = code.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

export function StageMSDPScreening({ wizard }: StageMSDPScreeningProps) {
  const { formData, updateField, errors } = wizard;
  const [goals, setGoals] = useState<NationalDevelopmentGoal[]>([]);
  const [strategyOptions, setStrategyOptions] = useState<MultiSelectOption[]>([]);

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await apiFetch('/api/national-development-goals');
        if (res.ok) setGoals(await res.json());
      } catch {}
    }
    fetchGoals();
  }, []);

  useEffect(() => {
    async function fetchStrategyOptions() {
      try {
        const res = await apiFetch('/api/admin/aid-effectiveness-options?activeOnly=true');
        if (res.ok) {
          const json = await res.json();
          const items = json.data || [];
          setStrategyOptions(
            items.map((item: any) => {
              const year = item.start_date ? new Date(item.start_date).getFullYear() : null;
              const endYear = item.end_date ? new Date(item.end_date).getFullYear() : null;
              const yearRange = year && endYear ? `${year}–${endYear}` : year ? `${year}–` : '';
              const ministries = Array.isArray(item.responsible_ministries) && item.responsible_ministries.length > 0
                ? item.responsible_ministries.map((m: any) => m.code || m.name).join(', ')
                : '';
              // Build label: "Name 2024–2028 (NDS)"
              let label = item.label;
              if (yearRange) label += ` ${yearRange}`;
              if (item.acronym) label += ` (${item.acronym})`;
              return {
                value: item.label,
                label,
                group: CATEGORY_LABELS[item.category] || item.category,
                subtitle: ministries || undefined,
              };
            })
          );
        }
      } catch {}
    }
    fetchStrategyOptions();
  }, []);

  const activeGoals = goals.filter(g => g.is_active);
  const selectedGoalId = formData.ndp_goal_id;
  const secondaryGoals: string[] = formData.secondary_ndp_goals || [];
  const ndpAligned = formData.ndp_aligned;

  // Build the list of MSDP strategies available based on selected goals
  const selectedGoalNumbers = useMemo(() => {
    const allSelectedIds = [selectedGoalId, ...secondaryGoals].filter(Boolean) as string[];
    return allSelectedIds
      .map(id => {
        const goal = goals.find(g => g.id === id);
        return goal ? goalNumber(goal.code) : 0;
      })
      .filter(n => n > 0);
  }, [selectedGoalId, secondaryGoals, goals]);

  const availableStrategies = useMemo(() => {
    const result: { goalNum: number; goalName: string; strategies: { code: string; name: string }[] }[] = [];
    selectedGoalNumbers.forEach(num => {
      const strategies = MSDP_STRATEGIES[num];
      if (strategies) {
        const goal = goals.find(g => goalNumber(g.code) === num);
        result.push({
          goalNum: num,
          goalName: goal ? goal.name : `Goal ${num}`,
          strategies,
        });
      }
    });
    return result.sort((a, b) => a.goalNum - b.goalNum);
  }, [selectedGoalNumbers, goals]);

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
        updateField('msdp_strategy_area', null);
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
    updateField('msdp_strategy_area', null);
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
              <CheckCircle className="h-5 w-5 text-[hsl(var(--success-icon))]" />
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
          MSDP Goals <RequiredDot />
          <HelpTooltip text="Select one or more MSDP goals. The first selected goal becomes the primary. Click additional goals to add as secondary." />
        </Label>
        <div className="grid grid-cols-3 gap-3 max-w-[396px]">
          {/* Not aligned option */}
          <button
            type="button"
            onClick={handleNotAligned}
            className={cn(
              'relative flex flex-col justify-end w-[120px] h-[120px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
              !ndpAligned
                ? 'ring-amber-300 bg-amber-50'
                : 'ring-border bg-background hover:bg-muted/50',
            )}
          >
            <Image src="/images/msdp-not-aligned.png" alt="Not aligned" fill className="object-contain opacity-15" style={{ objectPosition: 'left bottom' }} />
            <div className="relative z-10 p-2">
              <div className="text-[10px] font-medium">Not aligned</div>
              <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">
                Does not align with any NDP strategic area
              </div>
            </div>
          </button>

          {/* NDP Goals as cards with images */}
          {activeGoals.map(goal => {
            const isPrimary = selectedGoalId === goal.id;
            const isSecondary = secondaryGoals.includes(goal.id);
            const gNum = goalNumber(goal.code);
            const goalImage = MSDP_GOAL_IMAGES[gNum];

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => handleGoalToggle(goal.id)}
                className={cn(
                  'relative flex flex-col justify-end w-[120px] h-[120px] rounded-lg shadow-sm ring-1 ring-inset text-left transition-all overflow-hidden',
                  isPrimary
                    ? 'ring-[#5f7f7a] bg-[#f6f5f3] ring-2'
                    : isSecondary
                    ? 'ring-[#5f7f7a]/60 bg-[#f6f5f3]'
                    : 'ring-border bg-background hover:bg-muted/50',
                )}
              >
                {goalImage && (
                  <Image src={goalImage} alt={goal.name} fill className="object-contain object-bottom-left opacity-15" style={{ objectPosition: 'left bottom' }} />
                )}
                {(isPrimary || isSecondary) && (
                  <div className="absolute top-1.5 right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
                {(isPrimary || isSecondary) && (
                  <span className={cn(
                    'absolute top-1.5 left-1.5 z-10 text-[7px] font-semibold uppercase px-1 py-0.5 rounded-full',
                    isPrimary ? 'bg-[#5f7f7a]/15 text-[#5f7f7a]' : 'bg-[#5f7f7a]/10 text-[#5f7f7a]',
                  )}>
                    {isPrimary ? 'Primary' : (() => {
                      const idx = secondaryGoals.indexOf(goal.id);
                      const labels = ['Secondary', 'Tertiary', 'Quaternary', 'Quinary'];
                      return labels[idx] || `#${idx + 2}`;
                    })()}
                  </span>
                )}
                <div className="relative z-10 p-2">
                  <span className="text-[10px] font-medium leading-tight line-clamp-3 block">Goal {gNum}: {goal.name}</span>
                  <span className="text-[8px] font-mono text-muted-foreground mt-0.5 block">{goal.code}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional fields when aligned */}
      {ndpAligned && (
        <>
          <div>
            <Label>MSDP Strategies <HelpTooltip text="Select one or more MSDP strategies this project supports. Options are filtered by your selected goals above." /></Label>
            {availableStrategies.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">Select a goal first</p>
            ) : (
              <div className="space-y-3 mt-1">
                {availableStrategies.map(group => (
                  <div key={group.goalNum}>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Goal {group.goalNum}: {group.goalName}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.strategies.map(s => {
                        const strategyValue = `Strategy ${s.code}: ${s.name}`;
                        const selectedStrategies: string[] = formData.msdp_strategies || (formData.msdp_strategy_area ? [formData.msdp_strategy_area] : []);
                        const isSelected = selectedStrategies.includes(strategyValue);
                        return (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => {
                              const current: string[] = formData.msdp_strategies || (formData.msdp_strategy_area ? [formData.msdp_strategy_area] : []);
                              if (isSelected) {
                                const updated = current.filter((v: string) => v !== strategyValue);
                                updateField('msdp_strategies', updated.length > 0 ? updated : null);
                                updateField('msdp_strategy_area', updated[0] || null);
                              } else {
                                const updated = [...current, strategyValue];
                                updateField('msdp_strategies', updated);
                                updateField('msdp_strategy_area', updated[0]);
                              }
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium border transition-colors text-left',
                              isSelected
                                ? 'bg-primary/10 border-primary/30 text-foreground'
                                : 'bg-background border-border text-muted-foreground hover:bg-muted/50',
                            )}
                          >
                            <span className="font-mono font-bold shrink-0">{s.code}</span>
                            <span className="line-clamp-1">{s.name}</span>
                            {isSelected && <span className="text-xs leading-none ml-0.5">×</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">MSDP Alignment Justification <HelpTooltip text="Explain how this project directly contributes to the selected MSDP goals and strategies." /></Label>
              {(() => {
                const len = (formData.alignment_justification || '').length;
                const remaining = 200 - len;
                if (remaining <= 0) {
                  return (
                    <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--success-icon))]">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {len} characters
                    </span>
                  );
                }
                return (
                  <span className="text-xs text-muted-foreground">
                    {remaining} more character{remaining !== 1 ? 's' : ''} suggested
                  </span>
                );
              })()}
            </div>
            <Textarea
              value={formData.alignment_justification || ''}
              onChange={e => updateField('alignment_justification', e.target.value)}
              placeholder="Explain how this project contributes to the selected MSDP goals and strategies..."
              rows={4}
            />
          </div>

        </>
      )}

      <div className="max-w-lg">
        <Label>Sector Strategy Reference <HelpTooltip text="Select one or more government planning documents or frameworks that this project implements." /></Label>
        <MultiSelect
          options={strategyOptions}
          selected={formData.sector_strategy_reference || []}
          onChange={v => updateField('sector_strategy_reference', v.length > 0 ? v : null)}
          placeholder="Select planning documents..."
          searchable
          searchPlaceholder="Filter documents..."
          selectedLabel="document(s)"
          renderOption={(option) => (
            <div className="py-0.5">
              <div className="text-sm flex items-center gap-2">
                {option.subtitle && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{option.subtitle}</span>
                )}
                <span>{option.label}</span>
              </div>
            </div>
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={formData.in_sector_investment_plan || false}
          onCheckedChange={v => updateField('in_sector_investment_plan', v)}
        />
        <Label>Included in sector investment plan <HelpTooltip text="A sector investment plan is a government-endorsed, costed programme of priority projects within a specific sector (e.g. transport, energy, health). Toggle this on if the project appears in an approved sector investment plan, public investment programme (PIP), or equivalent prioritised pipeline." /></Label>
      </div>

    </div>
  );
}
