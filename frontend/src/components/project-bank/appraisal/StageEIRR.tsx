"use client"

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { calculateFullEIRR, runSensitivityAnalysis } from '@/lib/eirr-calculator';
import { determineFullRouting, formatCurrency } from '@/lib/project-bank-utils';
import { DocumentUploadZone } from './DocumentUploadZone';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { AppraisalShadowPrices } from '@/types/project-bank';
import { cn } from '@/lib/utils';

interface StageEIRRProps {
  wizard: UseAppraisalWizardReturn;
}

interface EconCostRow {
  year: number;
  local_cost: number;
  imported_cost: number;
  labour_cost: number;
}

interface EconBenefitRow {
  year: number;
  amount: number;
  category: string;
}

const BENEFIT_CATEGORIES = [
  'Time savings',
  'Vehicle operating cost savings',
  'Agricultural surplus',
  'Health benefits',
  'Employment generation',
  'Environmental benefits',
  'Other',
];

export function StageEIRR({ wizard }: StageEIRRProps) {
  const { formData, updateField, projectId, documents, refreshDocuments } = wizard;

  // Shadow prices
  const [shadowPrices, setShadowPrices] = useState({
    standard_conversion_factor: 0.9,
    shadow_exchange_rate: 1.2,
    shadow_wage_rate: 0.6,
    social_discount_rate: 6.0,
  });

  // Economic cost/benefit rows stored in eirr_calculation_data
  const eirrData = formData.eirr_calculation_data || {};
  const econCosts: EconCostRow[] = eirrData.costs || [];
  const econBenefits: EconBenefitRow[] = eirrData.benefits || [];

  // Load shadow prices from API
  useEffect(() => {
    async function fetchShadowPrices() {
      try {
        const res = await apiFetch('/api/appraisal-shadow-prices');
        if (res.ok) {
          const data: AppraisalShadowPrices = await res.json();
          setShadowPrices({
            standard_conversion_factor: data.standard_conversion_factor,
            shadow_exchange_rate: data.shadow_exchange_rate,
            shadow_wage_rate: data.shadow_wage_rate,
            social_discount_rate: data.social_discount_rate,
          });
        }
      } catch {}
    }
    fetchShadowPrices();
  }, []);

  // Initialize costs from Stage 2 cost table if empty
  useEffect(() => {
    if (econCosts.length === 0 && formData.cost_table_data?.length) {
      const initialCosts: EconCostRow[] = formData.cost_table_data.map((row: any) => ({
        year: row.year,
        local_cost: Math.round(((row.capex || 0) + (row.opex || 0)) * 0.5),
        imported_cost: Math.round(((row.capex || 0) + (row.opex || 0)) * 0.3),
        labour_cost: Math.round(((row.capex || 0) + (row.opex || 0)) * 0.2),
      }));
      updateEirrData({ costs: initialCosts });
    }
  }, []);

  const updateEirrData = (updates: Record<string, any>) => {
    updateField('eirr_calculation_data', { ...eirrData, ...updates });
  };

  const updateCostRow = (idx: number, field: keyof EconCostRow, value: number) => {
    const updated = [...econCosts];
    updated[idx] = { ...updated[idx], [field]: value };
    updateEirrData({ costs: updated });
  };

  const addCostRow = () => {
    const lastYear = econCosts.length > 0 ? Math.max(...econCosts.map(c => c.year)) + 1 : new Date().getFullYear();
    updateEirrData({ costs: [...econCosts, { year: lastYear, local_cost: 0, imported_cost: 0, labour_cost: 0 }] });
  };

  const removeCostRow = (idx: number) => {
    updateEirrData({ costs: econCosts.filter((_, i) => i !== idx) });
  };

  const updateBenefitRow = (idx: number, field: keyof EconBenefitRow, value: any) => {
    const updated = [...econBenefits];
    updated[idx] = { ...updated[idx], [field]: value };
    updateEirrData({ benefits: updated });
  };

  const addBenefitRow = () => {
    const lastYear = econBenefits.length > 0 ? Math.max(...econBenefits.map(b => b.year)) + 1 : new Date().getFullYear();
    updateEirrData({ benefits: [...econBenefits, { year: lastYear, amount: 0, category: 'Other' }] });
  };

  const removeBenefitRow = (idx: number) => {
    updateEirrData({ benefits: econBenefits.filter((_, i) => i !== idx) });
  };

  // Calculate EIRR
  const eirrResult = useMemo(() => {
    if (!econCosts.length && !econBenefits.length) return null;
    const benefitsForCalc = econBenefits.map(b => ({ year: b.year, amount: b.amount }));
    return calculateFullEIRR(econCosts, benefitsForCalc, shadowPrices);
  }, [econCosts, econBenefits, shadowPrices]);

  // Sensitivity
  const sensitivityResults = useMemo(() => {
    if (!econCosts.length || !econBenefits.length) return [];
    const benefitsForCalc = econBenefits.map(b => ({ year: b.year, amount: b.amount }));
    return runSensitivityAnalysis(econCosts, benefitsForCalc, shadowPrices);
  }, [econCosts, econBenefits, shadowPrices]);

  // Save EIRR result to form
  useMemo(() => {
    if (eirrResult) {
      updateField('eirr', eirrResult.eirr);
      updateField('eirr_date', new Date().toISOString().slice(0, 10));
      updateField('eirr_shadow_prices', shadowPrices);
    }
  }, [eirrResult?.eirr]);

  const firrPercent = formData.firr ?? null;
  const routing = determineFullRouting(firrPercent, eirrResult?.eirr ?? null, true);

  const COLOR_MAP: Record<string, string> = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
  };
  const TEXT_COLOR_MAP: Record<string, string> = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Economic Analysis (EIRR)</h3>
        <p className="text-sm text-muted-foreground">
          Apply shadow prices to estimate economic costs and benefits. EIRR &ge; 15% qualifies for PPP mechanism.
        </p>
      </div>

      {/* Shadow Prices */}
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <Label className="text-sm font-medium">Shadow Price Parameters</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Standard Conversion Factor</label>
            <Input
              type="number"
              step="0.01"
              value={shadowPrices.standard_conversion_factor}
              onChange={e => setShadowPrices(p => ({ ...p, standard_conversion_factor: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Shadow Exchange Rate</label>
            <Input
              type="number"
              step="0.01"
              value={shadowPrices.shadow_exchange_rate}
              onChange={e => setShadowPrices(p => ({ ...p, shadow_exchange_rate: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Shadow Wage Rate</label>
            <Input
              type="number"
              step="0.01"
              value={shadowPrices.shadow_wage_rate}
              onChange={e => setShadowPrices(p => ({ ...p, shadow_wage_rate: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Social Discount Rate (%)</label>
            <Input
              type="number"
              step="0.1"
              value={shadowPrices.social_discount_rate}
              onChange={e => setShadowPrices(p => ({ ...p, social_discount_rate: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Economic Costs Table */}
      <div>
        <Label className="mb-2 block">Economic Costs (by component)</Label>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted">
                <th className="text-left p-2 font-medium text-xs w-20">Year</th>
                <th className="text-right p-2 font-medium text-xs">Local ({shadowPrices.standard_conversion_factor}x)</th>
                <th className="text-right p-2 font-medium text-xs">Imported ({shadowPrices.shadow_exchange_rate}x)</th>
                <th className="text-right p-2 font-medium text-xs">Labour ({shadowPrices.shadow_wage_rate}x)</th>
                <th className="text-right p-2 font-medium text-xs">Economic Cost</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {econCosts.map((row, idx) => {
                const ecCost = (row.local_cost * shadowPrices.standard_conversion_factor) +
                  (row.imported_cost * shadowPrices.shadow_exchange_rate) +
                  (row.labour_cost * shadowPrices.shadow_wage_rate);
                return (
                  <tr key={idx}>
                    <td className="p-1.5">
                      <Input type="number" value={row.year} onChange={e => updateCostRow(idx, 'year', parseInt(e.target.value) || 0)} className="h-7 w-20 text-sm font-mono" />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" value={row.local_cost || ''} onChange={e => updateCostRow(idx, 'local_cost', parseFloat(e.target.value) || 0)} className="h-7 text-sm text-right font-mono" />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" value={row.imported_cost || ''} onChange={e => updateCostRow(idx, 'imported_cost', parseFloat(e.target.value) || 0)} className="h-7 text-sm text-right font-mono" />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" value={row.labour_cost || ''} onChange={e => updateCostRow(idx, 'labour_cost', parseFloat(e.target.value) || 0)} className="h-7 text-sm text-right font-mono" />
                    </td>
                    <td className="p-1.5 text-right font-mono text-sm text-muted-foreground">
                      {ecCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-1.5">
                      <button onClick={() => removeCostRow(idx)} className="text-muted-foreground hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCostRow} className="mt-2 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Year
        </Button>
      </div>

      {/* Economic Benefits Table */}
      <div>
        <Label className="mb-2 block">Economic Benefits</Label>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted">
                <th className="text-left p-2 font-medium text-xs w-20">Year</th>
                <th className="text-left p-2 font-medium text-xs">Category</th>
                <th className="text-right p-2 font-medium text-xs">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {econBenefits.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-1.5">
                    <Input type="number" value={row.year} onChange={e => updateBenefitRow(idx, 'year', parseInt(e.target.value) || 0)} className="h-7 w-20 text-sm font-mono" />
                  </td>
                  <td className="p-1.5">
                    <select
                      value={row.category}
                      onChange={e => updateBenefitRow(idx, 'category', e.target.value)}
                      className="h-7 text-xs border rounded px-1.5 bg-background w-full"
                    >
                      {BENEFIT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <Input type="number" value={row.amount || ''} onChange={e => updateBenefitRow(idx, 'amount', parseFloat(e.target.value) || 0)} className="h-7 text-sm text-right font-mono" />
                  </td>
                  <td className="p-1.5">
                    <button onClick={() => removeBenefitRow(idx)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addBenefitRow} className="mt-2 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Benefit Year
        </Button>
      </div>

      {/* EIRR Results */}
      {eirrResult && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">EIRR</div>
            <div className={cn('text-xl font-bold font-mono', eirrResult.eirr !== null && eirrResult.eirr >= 15 ? 'text-green-600' : 'text-red-600')}>
              {eirrResult.eirr !== null ? `${eirrResult.eirr.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">ENPV</div>
            <div className={cn('text-lg font-bold font-mono', eirrResult.enpv >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(eirrResult.enpv)}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">BCR</div>
            <div className="text-lg font-bold font-mono text-foreground">
              {eirrResult.bcr !== null ? eirrResult.bcr.toFixed(2) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Sensitivity */}
      {sensitivityResults.length > 0 && (
        <div>
          <Label className="mb-2 block">Sensitivity Analysis</Label>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="text-left p-2 font-medium text-xs">Scenario</th>
                  <th className="text-right p-2 font-medium text-xs">EIRR</th>
                  <th className="text-right p-2 font-medium text-xs">ENPV</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sensitivityResults.map((s, i) => (
                  <tr key={i} className={i === 0 ? 'font-medium' : ''}>
                    <td className="p-2 text-sm">{s.scenario}</td>
                    <td className={cn('p-2 text-right font-mono text-sm', s.firr_or_eirr !== null && s.firr_or_eirr >= 15 ? 'text-green-600' : 'text-red-600')}>
                      {s.firr_or_eirr !== null ? `${s.firr_or_eirr.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className={cn('p-2 text-right font-mono text-sm', s.npv >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(s.npv)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Routing Banner */}
      {eirrResult && (
        <div className={cn('p-4 rounded-lg border', COLOR_MAP[routing.color] || COLOR_MAP.blue)}>
          <div className={cn('text-sm font-bold mb-1', TEXT_COLOR_MAP[routing.color])}>
            {routing.label}
          </div>
          <div className="text-sm text-muted-foreground">{routing.description}</div>
          <div className="text-xs text-muted-foreground mt-2 italic">{routing.nextSteps}</div>
        </div>
      )}

      {/* Documents */}
      <DocumentUploadZone
        projectId={projectId}
        stage="eirr_assessment"
        documents={documents}
        onDocumentsChange={refreshDocuments}
        acceptedTypes={['eirr_calculation_workbook', 'cost_benefit_analysis', 'other']}
      />
    </div>
  );
}
