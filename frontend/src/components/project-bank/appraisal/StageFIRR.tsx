"use client"

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CashFlowTable } from './CashFlowTable';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from './HelpTooltip';
import { calculateFIRR } from '@/lib/eirr-calculator';
import { formatCurrency } from '@/lib/project-bank-utils';
import { FormattedNumberInput } from './FormattedNumberInput';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { CostTableRow } from '@/types/project-bank';
import { cn } from '@/lib/utils';
import { Copy, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

interface StageFIRRProps {
  wizard: UseAppraisalWizardReturn;
}

const SENSITIVITY_SCENARIOS = [
  { label: 'Base Case', costMult: 1.0, revMult: 1.0, tooltip: 'No changes — uses your entered figures as-is.' },
  { label: 'Revenue −10%', costMult: 1.0, revMult: 0.9, tooltip: 'Tests the impact if revenues come in 10% below projections.' },
  { label: 'Revenue −20%', costMult: 1.0, revMult: 0.8, tooltip: 'Tests the impact if revenues come in 20% below projections.' },
  { label: 'Costs +10%', costMult: 1.1, revMult: 1.0, tooltip: 'Tests the impact if all costs (CAPEX + OPEX) are 10% higher than projected.' },
  { label: 'Costs +20%', costMult: 1.2, revMult: 1.0, tooltip: 'Tests the impact if all costs (CAPEX + OPEX) are 20% higher than projected.' },
  { label: 'Worst Case', costMult: 1.2, revMult: 0.8, tooltip: 'Combines 20% higher costs with 20% lower revenues — a stress test.' },
];

function ComparisonTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const nonZero = payload.filter((entry: any) => entry.value !== 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
      <p className="font-semibold text-slate-900 mb-2">Year {label}</p>
      <div className="border-t pt-2 space-y-1">
        {nonZero.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-slate-700">{entry.name}</span>
            </div>
            <span className="text-sm font-medium text-slate-900">
              {Math.abs(entry.value).toLocaleString('en-US')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StageFIRR({ wizard }: StageFIRRProps) {
  const { formData, updateField, projectId, documents, refreshDocuments } = wizard;

  const preliminaryData: CostTableRow[] = formData.cost_table_data || [];
  const refinedData: CostTableRow[] = formData.firr_cost_table_data || [];

  // Pre-populate refined data from preliminary on first entry,
  // or auto-generate year rows from construction/operational periods
  useEffect(() => {
    if (refinedData.length === 0 && preliminaryData.length > 0) {
      updateField('firr_cost_table_data', [...preliminaryData]);
    } else if (refinedData.length === 0 && preliminaryData.length === 0) {
      // Auto-generate years from project timeline
      const sy = new Date().getFullYear();
      const cYears = formData.construction_period_years || 2;
      const oYears = formData.operational_period_years || 10;
      const total = cYears + oYears;
      const generated: CostTableRow[] = [];
      for (let i = 0; i < total; i++) {
        generated.push({ year: sy + i, capex: 0, opex: 0, revenue: 0 });
      }
      updateField('firr_cost_table_data', generated);
    }
  }, []); // Only on mount

  // Calculate FIRR from refined data
  const firrResult = useMemo(() => {
    if (!refinedData.length) return null;
    return calculateFIRR(refinedData);
  }, [refinedData]);

  // Run sensitivity analysis on refined data
  const sensitivityResults = useMemo(() => {
    if (!refinedData.length) return [];
    return SENSITIVITY_SCENARIOS.map(scenario => {
      const adjusted = refinedData.map(row => ({
        ...row,
        capex: (row.capex || 0) * scenario.costMult,
        opex: (row.opex || 0) * scenario.costMult,
        revenue: (row.revenue || 0) * scenario.revMult,
      }));
      const result = calculateFIRR(adjusted);
      return { label: scenario.label, firr: result.firr, npv: result.npv_at_10 };
    });
  }, [refinedData]);

  // Store FIRR result in form data whenever it changes
  useEffect(() => {
    if (firrResult) {
      updateField('firr', firrResult.firr);
      updateField('firr_date', new Date().toISOString().slice(0, 10));
      updateField('firr_calculation_data', {
        ...firrResult,
        sensitivity: sensitivityResults,
        calculated_at: new Date().toISOString(),
      });
    }
  }, [firrResult?.firr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Comparison chart data — preliminary vs refined totals per year
  const [comparisonView, setComparisonView] = useState<'net' | 'capex' | 'opex' | 'revenue'>('net');
  const comparisonData = useMemo(() => {
    const allYears = new Set([
      ...preliminaryData.map(r => r.year),
      ...refinedData.map(r => r.year),
    ]);
    const sorted = Array.from(allYears).sort((a, b) => a - b);
    return sorted.map(year => {
      const prelim = preliminaryData.find(r => r.year === year);
      const refined = refinedData.find(r => r.year === year);
      const pNet = (prelim?.revenue || 0) - (prelim?.capex || 0) - (prelim?.opex || 0);
      const rNet = (refined?.revenue || 0) - (refined?.capex || 0) - (refined?.opex || 0);
      return {
        year,
        'Preliminary': comparisonView === 'net' ? pNet
          : comparisonView === 'capex' ? (prelim?.capex || 0)
          : comparisonView === 'opex' ? (prelim?.opex || 0)
          : (prelim?.revenue || 0),
        'Refined': comparisonView === 'net' ? rNet
          : comparisonView === 'capex' ? (refined?.capex || 0)
          : comparisonView === 'opex' ? (refined?.opex || 0)
          : (refined?.revenue || 0),
      };
    });
  }, [preliminaryData, refinedData, comparisonView]);

  // Totals for comparison summary
  const prelimTotals = preliminaryData.reduce(
    (acc, r) => ({ capex: acc.capex + (r.capex || 0), opex: acc.opex + (r.opex || 0), revenue: acc.revenue + (r.revenue || 0) }),
    { capex: 0, opex: 0, revenue: 0 },
  );
  const refinedTotals = refinedData.reduce(
    (acc, r) => ({ capex: acc.capex + (r.capex || 0), opex: acc.opex + (r.opex || 0), revenue: acc.revenue + (r.revenue || 0) }),
    { capex: 0, opex: 0, revenue: 0 },
  );

  const xAxisAngle = comparisonData.length <= 8 ? 0 : comparisonData.length <= 15 ? -45 : -90;
  const xAxisHeight = xAxisAngle === 0 ? 20 : xAxisAngle === -45 ? 50 : 60;
  const xAxisTextAnchor = xAxisAngle === 0 ? 'middle' : 'end';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Financial Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Refine the cost estimates. The Financial Internal Rate of Return (FIRR) is calculated in real-time from your refined figures.
        </p>
        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">How is the FIRR calculated?</p>
          <p>The FIRR is the discount rate at which the project's net present value (NPV) equals zero. For the calculation to work, your cash flows must include:</p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li><strong>Early years with net outflows</strong> — CAPEX + OPEX should exceed revenue during construction and early operation (this represents the initial investment).</li>
            <li><strong>Later years with net inflows</strong> — revenue should exceed costs once the project is operational (this represents the return on investment).</li>
          </ul>
          <p>If all years show a net surplus or all years show a net deficit, the FIRR cannot be determined. Most infrastructure projects have high upfront costs and generate returns over time.</p>
        </div>
      </div>

      {/* Revenue projection fields — quick summary, collapsed when cash flow table has data */}
      {!refinedData.some(r => (r.revenue || 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Projected Annual Revenue (USD) <HelpTooltip text="Expected annual revenue in USD once the project reaches full operation. This is a quick estimate — for detailed year-by-year projections, enter revenue directly in the Refined Cash Flow Table below." /></Label>
            <FormattedNumberInput
              value={formData.projected_annual_revenue ?? null}
              onChange={v => updateField('projected_annual_revenue', v)}
              placeholder="10,000,000"
              decimals={2}
            />
          </div>
          <div>
            <Label>Revenue Ramp-up <HelpTooltip text="Number of years before revenue reaches full projected level. During ramp-up, revenue may be lower than the projected annual amount." /></Label>
            <FormattedNumberInput
              value={formData.revenue_ramp_up_years ?? null}
              onChange={v => updateField('revenue_ramp_up_years', v)}
              placeholder="e.g. 3"
            />
          </div>
        </div>
      )}

      {/* Preliminary vs Refined summary cards */}
      {preliminaryData.length > 0 && refinedData.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(['capex', 'opex', 'revenue'] as const).map(key => {
            const pVal = prelimTotals[key];
            const rVal = refinedTotals[key];
            const diff = rVal - pVal;
            const pctChange = pVal > 0 ? ((diff / pVal) * 100) : 0;
            const label = key === 'capex' ? 'Total CAPEX' : key === 'opex' ? 'Total OPEX' : 'Total Revenue';
            return (
              <div key={key} className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground line-through">{formatCurrency(pVal)}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-semibold">{formatCurrency(rVal)}</span>
                </div>
                {pVal > 0 && diff !== 0 && (
                  <div className={cn('text-xs mt-0.5', diff > 0 ? (key === 'revenue' ? 'text-[hsl(var(--success-icon))]' : 'text-red-600') : (key === 'revenue' ? 'text-red-600' : 'text-[hsl(var(--success-icon))]'))}>
                    {diff > 0 ? '+' : ''}{pctChange.toFixed(1)}% from preliminary
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cash Flow Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Refined Cash Flow Table <HelpTooltip text="Adjust the preliminary estimates with more accurate figures. These refined values are used for the FIRR calculation." /></Label>
          {preliminaryData.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateField('firr_cost_table_data', [...preliminaryData])}
              className="gap-1.5 text-xs"
            >
              <Copy className="h-3 w-3" /> Reset to preliminary
            </Button>
          )}
        </div>
        <CashFlowTable
          rows={refinedData}
          onChange={rows => updateField('firr_cost_table_data', rows)}
          constructionYears={formData.construction_period_years}
          operationalYears={formData.operational_period_years}
        />
      </div>

      {/* Result cards — below the table */}
      {firrResult && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">FIRR <HelpTooltip text="Financial Internal Rate of Return — the discount rate at which NPV equals zero. Calculated from your refined figures." /></div>
            <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
              {firrResult.firr !== null ? `${firrResult.firr.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {firrResult.firr !== null && firrResult.firr >= 10 ? 'Commercially viable' : 'Below threshold'}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">NPV @ 10% <HelpTooltip text="Net Present Value discounted at 10% — positive means the project adds value." /></div>
            <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
              {formatCurrency(firrResult.npv_at_10)}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Payback Year <HelpTooltip text="The year cumulative net cash flows become positive." /></div>
            <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
              {firrResult.payback_year || '—'}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Total Investment <HelpTooltip text="Sum of all CAPEX and OPEX over the project life." /></div>
            <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
              {formatCurrency(firrResult.total_investment)}
            </div>
          </div>
        </div>
      )}

      {/* Preliminary vs Refined comparison chart */}
      {preliminaryData.length > 0 && refinedData.length > 0 && comparisonData.length > 0 && (
        <div>
          <Label className="mb-2 block">Preliminary vs Refined Comparison <HelpTooltip text="Compare your preliminary feasibility estimates against the refined figures entered above." /></Label>
          <div className="border rounded-lg p-4 bg-background space-y-3">
            <div className="flex items-center justify-end gap-0.5">
              {(['net', 'capex', 'opex', 'revenue'] as const).map(view => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setComparisonView(view)}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded transition-colors',
                    comparisonView === view
                      ? 'bg-slate-200 text-slate-900 font-semibold'
                      : 'text-gray-600 hover:bg-muted',
                  )}
                >
                  {view === 'net' ? 'Net' : view === 'capex' ? 'CAPEX' : view === 'opex' ? 'OPEX' : 'Revenue'}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cfd0d5" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} angle={xAxisAngle} textAnchor={xAxisTextAnchor} height={xAxisHeight} interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)} />
                <RechartsTooltip content={<ComparisonTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <ReferenceLine y={0} stroke="#4c5568" strokeWidth={1} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Preliminary" fill="#cfd0d5" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Refined" fill="#4c5568" radius={[2, 2, 0, 0]}>
                  {comparisonView === 'net' && comparisonData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.Refined >= 0 ? '#5f7f7a' : '#dc2625'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sensitivity Analysis — Table */}
      {sensitivityResults.length > 0 && (
        <div>
          <Label className="mb-2 block">Sensitivity Analysis <HelpTooltip text="Shows how FIRR changes under different cost and revenue scenarios." /></Label>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted">
                <tr className="bg-surface-muted">
                  <th className="text-left p-2 font-medium text-xs">Scenario</th>
                  <th className="text-right p-2 font-medium text-xs">FIRR <HelpTooltip text="Financial Internal Rate of Return under this scenario." /></th>
                  <th className="text-right p-2 font-medium text-xs">NPV @ 10% <HelpTooltip text="Net Present Value discounted at 10% under this scenario." /></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sensitivityResults.map((s, i) => (
                  <tr key={i} className={i === 0 ? 'font-medium' : ''}>
                    <td className="p-2 text-sm">
                      {s.label}
                      <HelpTooltip text={SENSITIVITY_SCENARIOS[i].tooltip} />
                    </td>
                    <td className={cn('p-2 text-right tabular-nums text-sm', s.firr !== null && s.firr >= 10 ? 'text-[hsl(var(--success-icon))]' : 'text-amber-600')}>
                      {s.firr !== null ? `${s.firr.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className={cn('p-2 text-right tabular-nums text-sm', s.npv >= 0 ? 'text-[hsl(var(--success-icon))]' : 'text-red-600')}>
                      {formatCurrency(s.npv)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <Label className="mb-2 block">Supporting Documents</Label>
        <DocumentUploadZone
          projectId={projectId}
          stage="firr_assessment"
          documents={documents}
          onDocumentsChange={refreshDocuments}
          acceptedTypes={['firr_calculation_workbook', 'other']}
        />
      </div>
    </div>
  );
}
