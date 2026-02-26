"use client"

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { CashFlowTable } from './CashFlowTable';
import { DocumentUploadZone } from './DocumentUploadZone';
import { HelpTooltip } from './HelpTooltip';
import { calculateFIRR } from '@/lib/eirr-calculator';
import { determineFullRouting, formatCurrency } from '@/lib/project-bank-utils';
import { CHART_COLOR_PALETTE } from '@/lib/chart-colors';
import type { UseAppraisalWizardReturn } from '@/hooks/use-appraisal-wizard';
import type { CostTableRow } from '@/types/project-bank';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface StageFIRRProps {
  wizard: UseAppraisalWizardReturn;
}

const SENSITIVITY_SCENARIOS = [
  { label: 'Base Case', costMult: 1.0, revMult: 1.0 },
  { label: 'Revenue −10%', costMult: 1.0, revMult: 0.9 },
  { label: 'Revenue −20%', costMult: 1.0, revMult: 0.8 },
  { label: 'Costs +10%', costMult: 1.1, revMult: 1.0 },
  { label: 'Costs +20%', costMult: 1.2, revMult: 1.0 },
  { label: 'Worst Case', costMult: 1.2, revMult: 0.8 },
];

export function StageFIRR({ wizard }: StageFIRRProps) {
  const { formData, updateField, projectId, documents, refreshDocuments } = wizard;

  const costTable: CostTableRow[] = formData.cost_table_data || [];

  // Calculate FIRR in real-time
  const firrResult = useMemo(() => {
    if (!costTable.length) return null;
    return calculateFIRR(costTable);
  }, [costTable]);

  // Run sensitivity analysis
  const sensitivityResults = useMemo(() => {
    if (!costTable.length) return [];
    return SENSITIVITY_SCENARIOS.map(scenario => {
      const adjusted = costTable.map(row => ({
        ...row,
        capex: (row.capex || 0) * scenario.costMult,
        opex: (row.opex || 0) * scenario.costMult,
        revenue: (row.revenue || 0) * scenario.revMult,
      }));
      const result = calculateFIRR(adjusted);
      return { label: scenario.label, firr: result.firr, npv: result.npv_at_10 };
    });
  }, [costTable]);

  // Store FIRR result in form data whenever it changes
  useMemo(() => {
    if (firrResult) {
      updateField('firr', firrResult.firr);
      updateField('firr_date', new Date().toISOString().slice(0, 10));
      updateField('firr_calculation_data', {
        ...firrResult,
        sensitivity: sensitivityResults,
        calculated_at: new Date().toISOString(),
      });
    }
  }, [firrResult?.firr]);

  const ndpAligned = !!formData.ndp_aligned;
  const routing = determineFullRouting(firrResult?.firr ?? null, null, ndpAligned);

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

  // Prepare chart data for stacked bar
  const stackedBarData = costTable.map(row => ({
    year: row.year,
    CAPEX: row.capex || 0,
    OPEX: row.opex || 0,
    Revenue: row.revenue || 0,
  }));

  // Prepare tornado chart data
  const baseFirr = sensitivityResults.length > 0 ? sensitivityResults[0].firr : null;
  const tornadoData = sensitivityResults.slice(1).map(s => ({
    scenario: s.label,
    deviation: s.firr !== null && baseFirr !== null ? s.firr - baseFirr : 0,
    firr: s.firr,
  })).sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Financial Analysis (FIRR)</h3>
        <p className="text-sm text-muted-foreground">
          Review and adjust the cost table from Stage 2. The Financial Internal Rate of Return is calculated in real-time.
        </p>
      </div>

      {/* Results Panel — left sidebar layout on large screens */}
      {firrResult && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Left: Hero cards */}
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">FIRR <HelpTooltip text="Financial Internal Rate of Return — the discount rate at which NPV equals zero." /></div>
              <div className={cn(
                'text-3xl font-bold font-mono mt-1',
                firrResult.firr !== null && firrResult.firr >= 10 ? 'text-green-600' : 'text-amber-600',
              )}>
                {firrResult.firr !== null ? `${firrResult.firr.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {firrResult.firr !== null && firrResult.firr >= 10 ? 'Commercially viable' : 'Below threshold'}
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">NPV @ 10% <HelpTooltip text="Net Present Value discounted at 10% — positive means the project adds value." /></div>
              <div className={cn(
                'text-xl font-bold font-mono mt-1',
                firrResult.npv_at_10 >= 0 ? 'text-green-600' : 'text-red-600',
              )}>
                {formatCurrency(firrResult.npv_at_10)}
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Payback Year <HelpTooltip text="The year cumulative net cash flows become positive." /></div>
              <div className="text-xl font-bold font-mono mt-1 text-foreground">
                {firrResult.payback_year || '—'}
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Total Investment <HelpTooltip text="Sum of all CAPEX and OPEX over the project life." /></div>
              <div className="text-xl font-bold font-mono mt-1 text-foreground">
                {formatCurrency(firrResult.total_investment)}
              </div>
            </div>
          </div>

          {/* Right: Cash Flow Table */}
          <div>
            <Label className="mb-2 block">Cash Flow Table</Label>
            <CashFlowTable
              rows={costTable}
              onChange={rows => updateField('cost_table_data', rows)}
              constructionYears={formData.construction_period_years}
              operationalYears={formData.operational_period_years}
            />
          </div>
        </div>
      )}

      {/* If no results yet, show just the table */}
      {!firrResult && (
        <div>
          <Label className="mb-2 block">Cash Flow Table</Label>
          <CashFlowTable
            rows={costTable}
            onChange={rows => updateField('cost_table_data', rows)}
            constructionYears={formData.construction_period_years}
            operationalYears={formData.operational_period_years}
          />
        </div>
      )}

      {/* CAPEX / OPEX / Revenue Stacked Bar Chart */}
      {stackedBarData.length > 0 && (
        <div>
          <Label className="mb-2 block">Cost & Revenue Breakdown <HelpTooltip text="Visual comparison of capital expenditure, operating costs, and revenue over the project lifetime." /></Label>
          <div className="border rounded-lg p-4 bg-background">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stackedBarData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
                <RechartsTooltip
                  formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}
                  labelFormatter={(label: string) => `Year ${label}`}
                />
                <Legend />
                <Bar dataKey="CAPEX" stackId="costs" fill={CHART_COLOR_PALETTE[0]} />
                <Bar dataKey="OPEX" stackId="costs" fill={CHART_COLOR_PALETTE[2]} />
                <Bar dataKey="Revenue" fill={CHART_COLOR_PALETTE[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sensitivity Analysis — Tornado Chart + Table */}
      {sensitivityResults.length > 0 && (
        <div>
          <Label className="mb-2 block">Sensitivity Analysis <HelpTooltip text="Shows how FIRR changes under different cost and revenue scenarios." /></Label>

          {/* Tornado Chart */}
          {tornadoData.length > 0 && baseFirr !== null && (
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
                Deviation from base case FIRR ({baseFirr.toFixed(1)}%) in percentage points
              </p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="text-left p-2 font-medium text-xs">Scenario</th>
                  <th className="text-right p-2 font-medium text-xs">FIRR</th>
                  <th className="text-right p-2 font-medium text-xs">NPV @ 10%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sensitivityResults.map((s, i) => (
                  <tr key={i} className={i === 0 ? 'font-medium' : ''}>
                    <td className="p-2 text-sm">{s.label}</td>
                    <td className={cn('p-2 text-right font-mono text-sm', s.firr !== null && s.firr >= 10 ? 'text-green-600' : 'text-amber-600')}>
                      {s.firr !== null ? `${s.firr.toFixed(1)}%` : 'N/A'}
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

      {/* Routing Decision Banner */}
      {firrResult && (
        <div className={cn('p-4 rounded-lg border', COLOR_MAP[routing.color] || COLOR_MAP.blue)}>
          <div className={cn('text-sm font-bold mb-1', TEXT_COLOR_MAP[routing.color])}>
            {routing.label}
          </div>
          <div className="text-sm text-muted-foreground">{routing.description}</div>
          <div className="text-xs text-muted-foreground mt-2 italic">{routing.nextSteps}</div>
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
