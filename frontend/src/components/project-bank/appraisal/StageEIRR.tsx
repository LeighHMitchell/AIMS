"use client"

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Plus, Trash2, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { calculateFullEIRR, runSensitivityAnalysis } from '@/lib/eirr-calculator';
import { determineFullRouting, formatCurrency } from '@/lib/project-bank-utils';
import { CHART_COLOR_PALETTE } from '@/lib/chart-colors';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from './HelpTooltip';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { AppraisalShadowPrices } from '@/types/project-bank';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

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
  time_savings: number;
  vehicle_cost_savings: number;
  reduced_accident_costs: number;
  agricultural_surplus: number;
  increased_productivity: number;
  health_benefits: number;
  education_benefits: number;
  employment_generation: number;
  environmental_benefits: number;
  carbon_emission_reduction: number;
  tourism_revenue: number;
  energy_savings: number;
  trade_facilitation: number;
  increased_tax_revenue: number;
  other: number;
}

type BenefitKey = keyof Omit<EconBenefitRow, 'year'>;

const BENEFIT_COLUMNS: { key: BenefitKey; label: string; code: number }[] = [
  { key: 'time_savings', label: 'Time Savings', code: 1 },
  { key: 'vehicle_cost_savings', label: 'Vehicle Operating Cost Savings', code: 2 },
  { key: 'reduced_accident_costs', label: 'Reduced Accident Costs', code: 3 },
  { key: 'agricultural_surplus', label: 'Agricultural Surplus', code: 4 },
  { key: 'increased_productivity', label: 'Increased Productivity', code: 5 },
  { key: 'health_benefits', label: 'Health Benefits', code: 6 },
  { key: 'education_benefits', label: 'Education Benefits', code: 7 },
  { key: 'employment_generation', label: 'Employment Generation', code: 8 },
  { key: 'environmental_benefits', label: 'Environmental Benefits', code: 9 },
  { key: 'carbon_emission_reduction', label: 'Carbon Emission Reduction', code: 10 },
  { key: 'tourism_revenue', label: 'Tourism Revenue', code: 11 },
  { key: 'energy_savings', label: 'Energy Savings', code: 12 },
  { key: 'trade_facilitation', label: 'Trade Facilitation', code: 13 },
  { key: 'increased_tax_revenue', label: 'Increased Tax Revenue', code: 14 },
  { key: 'other', label: 'Other', code: 15 },
];

const EMPTY_BENEFIT_ROW: Omit<EconBenefitRow, 'year'> = {
  time_savings: 0, vehicle_cost_savings: 0, reduced_accident_costs: 0,
  agricultural_surplus: 0, increased_productivity: 0, health_benefits: 0,
  education_benefits: 0, employment_generation: 0, environmental_benefits: 0,
  carbon_emission_reduction: 0, tourism_revenue: 0, energy_savings: 0,
  trade_facilitation: 0, increased_tax_revenue: 0, other: 0,
};

// Migrate old format ({ year, amount, category }) to new column-based format
const CATEGORY_KEY_MAP: Record<string, BenefitKey> = {
  'Time savings': 'time_savings',
  'Vehicle operating cost savings': 'vehicle_cost_savings',
  'Agricultural surplus': 'agricultural_surplus',
  'Health benefits': 'health_benefits',
  'Employment generation': 'employment_generation',
  'Environmental benefits': 'environmental_benefits',
  'Other': 'other',
};

function migrateBenefits(raw: any[]): EconBenefitRow[] {
  if (!raw.length) return [];
  if ('time_savings' in raw[0] || !('category' in raw[0])) return raw;
  const byYear = new Map<number, EconBenefitRow>();
  raw.forEach((r: any) => {
    if (!byYear.has(r.year)) {
      byYear.set(r.year, { year: r.year, ...EMPTY_BENEFIT_ROW });
    }
    const row = byYear.get(r.year)!;
    const key = CATEGORY_KEY_MAP[r.category] || 'other';
    row[key] = (row[key] || 0) + (r.amount || 0);
  });
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

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
  const econBenefits: EconBenefitRow[] = useMemo(() => migrateBenefits(eirrData.benefits || []), [eirrData.benefits]);

  // Selected benefit categories — persisted in eirrData
  const selectedCategories: BenefitKey[] = eirrData.selected_benefit_categories || [];
  const activeCols = useMemo(
    () => BENEFIT_COLUMNS.filter(col => selectedCategories.includes(col.key)),
    [selectedCategories],
  );

  const toggleCategory = (key: BenefitKey) => {
    const next = selectedCategories.includes(key)
      ? selectedCategories.filter((k: BenefitKey) => k !== key)
      : [...selectedCategories, key];
    updateField('eirr_calculation_data', { ...eirrData, selected_benefit_categories: next });
  };

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

  // Initialize cost rows from the FIRR cost table (FS-2 or FS-1) if empty
  const costTableSource = formData.firr_cost_table_data?.length
    ? formData.firr_cost_table_data
    : formData.cost_table_data?.length
      ? formData.cost_table_data
      : null;

  useEffect(() => {
    if (econCosts.length === 0 && costTableSource) {
      const initialCosts: EconCostRow[] = (costTableSource as any[]).map((row: any) => ({
        year: row.year,
        local_cost: 0,
        imported_cost: 0,
        labour_cost: 0,
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

  const updateBenefitRow = (idx: number, field: keyof EconBenefitRow, value: number) => {
    const updated = [...econBenefits];
    updated[idx] = { ...updated[idx], [field]: value };
    updateEirrData({ benefits: updated });
  };

  const addBenefitRow = () => {
    const lastYear = econBenefits.length > 0 ? Math.max(...econBenefits.map(b => b.year)) + 1 : new Date().getFullYear();
    updateEirrData({ benefits: [...econBenefits, { year: lastYear, ...EMPTY_BENEFIT_ROW }] });
  };

  const removeBenefitRow = (idx: number) => {
    updateEirrData({ benefits: econBenefits.filter((_, i) => i !== idx) });
  };

  // Quick entry for economic costs
  const [quickCostEntry, setQuickCostEntry] = useState(false);
  const [quickLocal, setQuickLocal] = useState(0);
  const [quickImported, setQuickImported] = useState(0);
  const [quickLabour, setQuickLabour] = useState(0);
  const [quickYears, setQuickYears] = useState(10);

  // Sub-tab state
  const [eirrSubTab, setEirrSubTab] = useState('costs');

  // Benefit category picker
  const [benefitPickerOpen, setBenefitPickerOpen] = useState(false);

  // Quick entry for economic benefits
  const [quickBenefitEntry, setQuickBenefitEntry] = useState(false);
  const [quickBenefitAmount, setQuickBenefitAmount] = useState(0);
  const [quickBenefitColumn, setQuickBenefitColumn] = useState<BenefitKey>(BENEFIT_COLUMNS[0].key);
  const [quickBenefitYears, setQuickBenefitYears] = useState(10);

  const applyQuickCostEntry = useCallback(() => {
    // If no rows exist, generate them from FIRR cost table years or manual count
    let rows = econCosts;
    if (rows.length === 0) {
      if (costTableSource) {
        rows = (costTableSource as any[]).map((r: any) => ({
          year: r.year,
          local_cost: 0,
          imported_cost: 0,
          labour_cost: 0,
        }));
      } else {
        const startYear = new Date().getFullYear();
        rows = Array.from({ length: quickYears }, (_, i) => ({
          year: startYear + i,
          local_cost: 0,
          imported_cost: 0,
          labour_cost: 0,
        }));
      }
    }
    const n = rows.length;
    const perLocal = Math.round(quickLocal / n);
    const perImported = Math.round(quickImported / n);
    const perLabour = Math.round(quickLabour / n);
    const updated = rows.map(row => ({
      ...row,
      local_cost: perLocal,
      imported_cost: perImported,
      labour_cost: perLabour,
    }));
    updateEirrData({ costs: updated });
    setQuickCostEntry(false);
    setQuickLocal(0);
    setQuickImported(0);
    setQuickLabour(0);
  }, [econCosts, quickLocal, quickImported, quickLabour, quickYears]);

  const applyQuickBenefitEntry = useCallback(() => {
    let rows = econBenefits;
    if (rows.length === 0) {
      // Generate rows from cost rows, cost table source, or manual year count
      let years: number[] = [];
      if (econCosts.length > 0) {
        years = econCosts.map(r => r.year);
      } else if (costTableSource) {
        years = (costTableSource as any[]).map((r: any) => r.year);
      } else {
        const startYear = new Date().getFullYear();
        years = Array.from({ length: quickBenefitYears }, (_, i) => startYear + i);
      }
      rows = years.map(year => ({ year, ...EMPTY_BENEFIT_ROW }));
    }
    const n = rows.length;
    const perYear = Math.round(quickBenefitAmount / n);
    const updated = rows.map(row => ({ ...row, [quickBenefitColumn]: perYear }));
    updateEirrData({ benefits: updated });
    setQuickBenefitEntry(false);
    setQuickBenefitAmount(0);
  }, [econCosts, econBenefits, costTableSource, quickBenefitAmount, quickBenefitColumn, quickBenefitYears]);

  // Pre-populate benefit rows from project lifetime if empty
  useEffect(() => {
    if (econBenefits.length === 0 && costTableSource) {
      const initialBenefits: EconBenefitRow[] = (costTableSource as any[]).map((row: any) => ({
        year: row.year,
        ...EMPTY_BENEFIT_ROW,
      }));
      updateEirrData({ benefits: initialBenefits });
    }
  }, []);

  // Sum selected benefit columns per row for calculation
  const benefitsForCalc = useMemo(() =>
    econBenefits.map(b => ({
      year: b.year,
      amount: activeCols.reduce((sum, col) => sum + (b[col.key] || 0), 0),
    })),
    [econBenefits, activeCols],
  );

  // Calculate EIRR
  const eirrResult = useMemo(() => {
    if (!econCosts.length && !econBenefits.length) return null;
    return calculateFullEIRR(econCosts, benefitsForCalc, shadowPrices);
  }, [econCosts, benefitsForCalc, shadowPrices]);

  // Sensitivity
  const sensitivityResults = useMemo(() => {
    if (!econCosts.length || !econBenefits.length) return [];
    return runSensitivityAnalysis(econCosts, benefitsForCalc, shadowPrices);
  }, [econCosts, benefitsForCalc, shadowPrices]);

  // Save EIRR result to form
  useEffect(() => {
    if (eirrResult) {
      updateField('eirr', eirrResult.eirr);
      updateField('eirr_date', new Date().toISOString().slice(0, 10));
      updateField('eirr_shadow_prices', shadowPrices);
    }
  }, [eirrResult?.eirr]); // eslint-disable-line react-hooks/exhaustive-deps

  const firrPercent = formData.firr ?? null;
  const routing = determineFullRouting(firrPercent, eirrResult?.eirr ?? null, true);

  // Routing banner uses neutral sidebar color

  // Tornado chart data
  const baseEirr = sensitivityResults.length > 0 ? sensitivityResults[0].firr_or_eirr : null;
  const tornadoData = sensitivityResults.slice(1).map(s => ({
    scenario: s.scenario,
    deviation: s.firr_or_eirr !== null && baseEirr !== null ? s.firr_or_eirr - baseEirr : 0,
    eirr: s.firr_or_eirr,
  })).sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Economic Analysis (EIRR)</h3>
        <p className="text-sm text-muted-foreground">
          Apply shadow prices to estimate economic costs and benefits. EIRR &ge; 15% qualifies for PPP mechanism.
        </p>
      </div>

      {/* Explanatory card */}
      <div className="p-4 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg">
        <p className="text-sm text-foreground">
          <strong>What is EIRR?</strong> The Economic Internal Rate of Return measures the project&apos;s value to
          society, not just financial returns. It uses shadow prices to adjust for market distortions such as subsidized
          labour, import duties, and exchange rate premiums.
        </p>
      </div>

      {/* Shadow Price Parameters — always shown */}
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <Label className="text-sm font-medium">Shadow Price Parameters <HelpTooltip text="These conversion factors adjust market prices to reflect true economic values." /></Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Standard Conversion Factor <HelpTooltip text="Adjusts domestic costs for trade taxes and subsidies. Typically 0.8–1.0 for developing economies." /></label>
            <Input
              type="number"
              step="0.01"
              value={shadowPrices.standard_conversion_factor}
              onChange={e => setShadowPrices(p => ({ ...p, standard_conversion_factor: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Shadow Exchange Rate <HelpTooltip text="Adjusts imported goods costs for exchange rate distortions. Typically 1.1–1.3 for controlled exchange rate economies." /></label>
            <Input
              type="number"
              step="0.01"
              value={shadowPrices.shadow_exchange_rate}
              onChange={e => setShadowPrices(p => ({ ...p, shadow_exchange_rate: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Shadow Wage Rate <HelpTooltip text="Adjusts labour costs for unemployment and underemployment. Typically 0.5–0.8 where there is surplus labour." /></label>
            <Input
              type="number"
              step="0.01"
              value={shadowPrices.shadow_wage_rate}
              onChange={e => setShadowPrices(p => ({ ...p, shadow_wage_rate: parseFloat(e.target.value) || 0 }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Social Discount Rate (%) <HelpTooltip text="The rate at which future economic benefits are discounted to present value. Typically 6–12% for developing countries." /></label>
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

      {/* Result cards — horizontal row below shadow prices */}
      {eirrResult && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Economic Internal Rate of Return <HelpTooltip text="The social discount rate at which ENPV equals zero." /></div>
            <div className={cn(
              'text-3xl font-bold mt-1',
              eirrResult.eirr !== null && eirrResult.eirr >= 15 ? 'text-green-600' : 'text-red-600',
            )}>
              {eirrResult.eirr !== null ? `${eirrResult.eirr.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {eirrResult.eirr !== null && eirrResult.eirr >= 15 ? 'Economically viable' : 'Below 15% threshold'}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Economic Net Present Value <HelpTooltip text="The total net economic benefit in present-value terms." /></div>
            <div className={cn(
              'text-3xl font-bold mt-1',
              eirrResult.enpv >= 0 ? 'text-green-600' : 'text-red-600',
            )}>
              {formatCurrency(eirrResult.enpv)}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Benefit-Cost Ratio <HelpTooltip text="Values above 1.0 mean benefits exceed costs." /></div>
            <div className="text-3xl font-bold mt-1 text-foreground">
              {eirrResult.bcr !== null ? eirrResult.bcr.toFixed(2) : '—'}
            </div>
          </div>
        </div>
      )}

      <Tabs value={eirrSubTab} onValueChange={setEirrSubTab}>
        <TabsList>
          <TabsTrigger value="costs">Economic Costs</TabsTrigger>
          <TabsTrigger value="benefits">Economic Benefits</TabsTrigger>
          <TabsTrigger value="results">Results & Sensitivity</TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="space-y-4 mt-4">
      {/* Economic Costs Table */}
      <div>
        <Label className="mb-2 block">Economic Costs (by component) <HelpTooltip text="Break down project costs into local, imported, and labour components. Shadow prices are applied automatically." /></Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setQuickCostEntry(!quickCostEntry)}
          className="gap-1.5 mb-3"
        >
          <Zap className="h-3.5 w-3.5" />
          {quickCostEntry ? 'Manual Entry' : 'Quick Entry'}
        </Button>

        {/* Quick Entry Panel */}
        {quickCostEntry && (
          <div className="p-3 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-2 mb-3">
            <p className="text-xs text-foreground font-medium">
              {econCosts.length > 0
                ? `Enter totals — they will be distributed evenly across all ${econCosts.length} year rows.`
                : costTableSource
                  ? `Enter totals — ${(costTableSource as any[]).length} year rows will be created from the Financial Analysis.`
                  : 'Enter totals and number of years — rows will be generated automatically.'}
            </p>
            {econCosts.length === 0 && !costTableSource && (
              <div className="max-w-[160px]">
                <label className="text-xs text-muted-foreground mb-0.5 block">Number of Years</label>
                <Input type="number" min={1} max={50} value={quickYears} onChange={e => setQuickYears(parseInt(e.target.value) || 10)} className="h-8 text-sm" />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-0.5 block">Total Local Cost</label>
                <Input type="number" value={quickLocal || ''} onChange={e => setQuickLocal(parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-0.5 block">Total Imported Cost</label>
                <Input type="number" value={quickImported || ''} onChange={e => setQuickImported(parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-0.5 block">Total Labour Cost</label>
                <Input type="number" value={quickLabour || ''} onChange={e => setQuickLabour(parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
              </div>
            </div>
            <Button type="button" size="sm" onClick={applyQuickCostEntry}>
              Apply
            </Button>
          </div>
        )}

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
                      <Input type="number" value={row.year} onChange={e => updateCostRow(idx, 'year', parseInt(e.target.value) || 0)} className="h-7 w-20 text-sm" />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" value={row.local_cost || ''} onChange={e => updateCostRow(idx, 'local_cost', parseFloat(e.target.value) || 0)} className="h-7 text-sm text-right" />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" value={row.imported_cost || ''} onChange={e => updateCostRow(idx, 'imported_cost', parseFloat(e.target.value) || 0)} className="h-7 text-sm text-right" />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" value={row.labour_cost || ''} onChange={e => updateCostRow(idx, 'labour_cost', parseFloat(e.target.value) || 0)} className="h-7 text-sm text-right" />
                    </td>
                    <td className="p-1.5 text-right text-sm text-muted-foreground">
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

        {/* Stacked bar chart of economic costs */}
        {econCosts.length > 0 && econCosts.some(r => r.local_cost || r.imported_cost || r.labour_cost) && (
          <div className="border rounded-lg p-4 bg-background mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Economic Costs by Component</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={econCosts.map(row => ({
                  year: row.year,
                  local: Math.round(row.local_cost * shadowPrices.standard_conversion_factor),
                  imported: Math.round(row.imported_cost * shadowPrices.shadow_exchange_rate),
                  labour: Math.round(row.labour_cost * shadowPrices.shadow_wage_rate),
                }))}
                barGap={0}
                barCategoryGap="20%"
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#cfd0d5" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11 }}
                  angle={econCosts.length > 15 ? -90 : econCosts.length > 8 ? -45 : 0}
                  textAnchor={econCosts.length > 8 ? 'end' : 'middle'}
                  height={econCosts.length > 15 ? 60 : econCosts.length > 8 ? 50 : 20}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}m` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`} />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const total = payload.reduce((sum, p) => sum + ((p.value as number) || 0), 0);
                    const COLORS: Record<string, string> = { Local: '#4c5568', Imported: '#7b95a7', Labour: '#cfd0d5' };
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                        <p className="font-medium mb-1">Year {label}</p>
                        <table className="w-full">
                          <tbody>
                            {payload.map(p => (
                              <tr key={p.name}>
                                <td className="pr-3 py-0.5">
                                  <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: COLORS[p.name as string] || p.color }} />
                                  {p.name}
                                </td>
                                <td className="text-right py-0.5">{(p.value as number).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                              </tr>
                            ))}
                            <tr className="border-t">
                              <td className="pr-3 py-0.5 font-medium">Total</td>
                              <td className="text-right py-0.5 font-medium">{total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="local" name="Local" stackId="cost" fill="#4c5568" />
                <Bar dataKey="imported" name="Imported" stackId="cost" fill="#7b95a7" />
                <Bar dataKey="labour" name="Labour" stackId="cost" fill="#cfd0d5" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-[#4c5568]" /> Local</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-[#7b95a7]" /> Imported</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-[#cfd0d5]" /> Labour</div>
            </div>
          </div>
        )}
      </div>

        </TabsContent>

        <TabsContent value="benefits" className="space-y-4 mt-4">
      {/* Economic Benefits */}
      <div>
        <Label className="mb-2 block">Economic Benefits <HelpTooltip text="Select the benefit categories relevant to this project, then enter annual values." /></Label>

        {/* Category Picker — custom dropdown with checkboxes */}
        <div className="relative mb-4">
          <button
            type="button"
            onClick={() => setBenefitPickerOpen(!benefitPickerOpen)}
            className="flex items-center justify-between gap-2 h-9 px-3 border rounded-md bg-background text-sm w-full max-w-sm hover:bg-muted/30 transition-colors"
          >
            <span className={selectedCategories.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedCategories.length > 0 ? `${selectedCategories.length} categories selected` : 'Select benefit categories...'}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', benefitPickerOpen && 'rotate-180')} />
          </button>

          {benefitPickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBenefitPickerOpen(false)} />
              <div className="absolute z-20 bottom-full mb-1 w-full max-w-sm border rounded-lg bg-background shadow-lg py-1 max-h-64 overflow-y-auto">
                {BENEFIT_COLUMNS.map(col => {
                  const checked = selectedCategories.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleCategory(col.key)}
                      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex-shrink-0 w-4 text-muted-foreground text-right">{col.code}.</span>
                      <span className={cn(
                        'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center',
                        checked ? 'bg-foreground border-foreground' : 'border-muted-foreground/40',
                      )}>
                        {checked && <Check className="h-3 w-3 text-background" />}
                      </span>
                      <span className="text-foreground">{col.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeCols.map(col => (
                <span key={col.key} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs text-foreground">
                  {col.label}
                  <button type="button" onClick={() => toggleCategory(col.key)} className="text-muted-foreground hover:text-foreground ml-0.5">&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table + Quick Entry only shown when categories are selected */}
        {activeCols.length > 0 && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickBenefitEntry(!quickBenefitEntry)}
              className="gap-1.5 mb-3"
            >
              <Zap className="h-3.5 w-3.5" />
              {quickBenefitEntry ? 'Manual Entry' : 'Quick Entry'}
            </Button>

            {/* Quick Entry Panel for Benefits */}
            {quickBenefitEntry && (
              <div className="p-3 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-2 mb-3">
                <p className="text-xs text-foreground font-medium">
                  {econBenefits.length > 0
                    ? `Enter a total for one category — it will be distributed evenly across all ${econBenefits.length} year rows.`
                    : econCosts.length > 0
                      ? `Enter a total for one category — ${econCosts.length} year rows will be created to match costs.`
                      : costTableSource
                        ? `Enter a total for one category — ${(costTableSource as any[]).length} year rows from the Financial Analysis.`
                        : 'Enter a total, category, and number of years.'}
                </p>
                {econBenefits.length === 0 && econCosts.length === 0 && !costTableSource && (
                  <div className="max-w-[160px]">
                    <label className="text-xs text-muted-foreground mb-0.5 block">Number of Years</label>
                    <Input type="number" min={1} max={50} value={quickBenefitYears} onChange={e => setQuickBenefitYears(parseInt(e.target.value) || 10)} className="h-8 text-sm" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-0.5 block">Category</label>
                    <select
                      value={quickBenefitColumn}
                      onChange={e => setQuickBenefitColumn(e.target.value as BenefitKey)}
                      className="h-8 text-sm border rounded px-2 bg-background w-full"
                    >
                      {activeCols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-0.5 block">Total Amount</label>
                    <Input type="number" value={quickBenefitAmount || ''} onChange={e => setQuickBenefitAmount(parseFloat(e.target.value) || 0)} placeholder="0" className="h-8 text-sm" />
                  </div>
                </div>
                <Button type="button" size="sm" onClick={applyQuickBenefitEntry}>
                  Apply
                </Button>
              </div>
            )}

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-muted">
                    <th className="text-left p-2 font-medium text-xs w-20">Year</th>
                    {activeCols.map(col => (
                      <th key={col.key} className="text-right p-2 font-medium text-xs">{col.label}</th>
                    ))}
                    <th className="text-right p-2 font-medium text-xs">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {econBenefits.map((row, idx) => {
                    const rowTotal = activeCols.reduce((sum, col) => sum + (row[col.key] || 0), 0);
                    return (
                      <tr key={idx}>
                        <td className="p-1.5">
                          <Input type="number" value={row.year} onChange={e => updateBenefitRow(idx, 'year', parseInt(e.target.value) || 0)} className="h-7 w-20 text-sm" />
                        </td>
                        {activeCols.map(col => (
                          <td key={col.key} className="p-1.5">
                            <Input
                              type="number"
                              value={row[col.key] || ''}
                              onChange={e => updateBenefitRow(idx, col.key, parseFloat(e.target.value) || 0)}
                              className="h-7 text-sm text-right"
                            />
                          </td>
                        ))}
                        <td className="p-1.5 text-right text-sm text-muted-foreground">
                          {rowTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-1.5">
                          <button onClick={() => removeBenefitRow(idx)} className="text-muted-foreground hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addBenefitRow} className="mt-2 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Year
            </Button>

            {/* Stacked bar chart of economic benefits */}
            {econBenefits.length > 0 && econBenefits.some(r => activeCols.some(col => r[col.key])) && (
              <div className="border rounded-lg p-4 bg-background mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Economic Benefits by Category</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={econBenefits.map(row => {
                      const d: Record<string, number> = { year: row.year };
                      activeCols.forEach(col => { d[col.key] = row[col.key] || 0; });
                      return d;
                    })}
                    barGap={0}
                    barCategoryGap="20%"
                    margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#cfd0d5" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11 }}
                      angle={econBenefits.length > 15 ? -90 : econBenefits.length > 8 ? -45 : 0}
                      textAnchor={econBenefits.length > 8 ? 'end' : 'middle'}
                      height={econBenefits.length > 15 ? 60 : econBenefits.length > 8 ? 50 : 20}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}m` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((sum, p) => sum + ((p.value as number) || 0), 0);
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                            <p className="font-medium mb-1">Year {label}</p>
                            <table className="w-full">
                              <tbody>
                                {payload.map(p => (
                                  <tr key={p.name}>
                                    <td className="pr-3 py-0.5">
                                      <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: p.color }} />
                                      {p.name}
                                    </td>
                                    <td className="text-right py-0.5">{(p.value as number).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                  </tr>
                                ))}
                                <tr className="border-t">
                                  <td className="pr-3 py-0.5 font-medium">Total</td>
                                  <td className="text-right py-0.5 font-medium">{total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      }}
                    />
                    {activeCols.map((col, i) => (
                      <Bar key={col.key} dataKey={col.key} name={col.label} stackId="benefit" fill={CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                  {activeCols.map((col, i) => (
                    <div key={col.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLOR_PALETTE[i % CHART_COLOR_PALETTE.length] }} />
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

        </TabsContent>

        <TabsContent value="results" className="space-y-6 mt-4">
      {/* Sensitivity — Tornado Chart + Table */}
      {sensitivityResults.length > 0 && (
        <div>
          <Label className="mb-2 block">Sensitivity Analysis <HelpTooltip text="Shows how EIRR changes under different cost and benefit scenarios." /></Label>

          {/* Tornado Chart */}
          {tornadoData.length > 0 && baseEirr !== null && (
            <div className="border rounded-lg p-4 bg-background mb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tornadoData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}pp`} />
                  <YAxis type="category" dataKey="scenario" tick={{ fontSize: 11 }} width={110} />
                  <RechartsTooltip
                    formatter={(value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}pp`}
                    labelFormatter={(label: string) => label}
                  />
                  <ReferenceLine x={0} stroke="#374151" strokeWidth={2} />
                  <Bar dataKey="deviation" fill={CHART_COLOR_PALETTE[2]}>
                    {tornadoData.map((entry, index) => (
                      <rect key={index} fill={entry.deviation >= 0 ? '#4c5568' : CHART_COLOR_PALETTE[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Deviation from base case EIRR ({baseEirr.toFixed(1)}%) in percentage points
              </p>
            </div>
          )}

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
                    <td className={cn('p-2 text-right text-sm', s.firr_or_eirr !== null && s.firr_or_eirr >= 15 ? 'text-green-600' : 'text-red-600')}>
                      {s.firr_or_eirr !== null ? `${s.firr_or_eirr.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className={cn('p-2 text-right text-sm', s.npv >= 0 ? 'text-green-600' : 'text-red-600')}>
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
        <div className="p-4 rounded-lg border bg-[#f6f5f3] border-[#5f7f7a]/20">
          <div className="text-sm font-bold mb-1 text-foreground">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
