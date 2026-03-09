"use client"

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, X, Zap, ChevronDown } from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';
import { FormattedNumberInput } from './FormattedNumberInput';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { BarChart3, LineChart as LineChartIcon, Download } from 'lucide-react';
import type { CostTableRow } from '@/types/project-bank';
import { cn } from '@/lib/utils';

interface CashFlowTableProps {
  rows: CostTableRow[];
  onChange: (rows: CostTableRow[]) => void;
  columns?: ('capex' | 'opex' | 'revenue')[];
  showNet?: boolean;
  showTotals?: boolean;
  readOnly?: boolean;
  chartFirst?: boolean;
  startYear?: number;
  constructionYears?: number;
  operationalYears?: number;
}

const COLUMN_LABELS: Record<string, string> = {
  capex: 'CAPEX',
  opex: 'OPEX',
  revenue: 'Revenue',
};

const COLUMN_HELP: Record<string, string> = {
  capex: 'Capital Expenditure — one-time costs for construction, equipment, land acquisition, and other upfront investments. Enter the total amount in your project currency (e.g. USD). In Quick Entry mode, use the toggle to choose whether to distribute across construction years, operational years, or all years.',
  opex: 'Operating Expenditure — recurring annual costs to run and maintain the project, including staffing, maintenance, utilities, and supplies. Enter the total amount in your project currency. In Quick Entry mode, use the toggle to choose the distribution period.',
  revenue: 'Projected income the project is expected to generate from user fees, tolls, lease payments, or other revenue streams. Enter the total amount in your project currency. In Quick Entry mode, use the toggle to choose the distribution period. Leave blank or zero if the project does not generate revenue.',
};

function formatNum(n: number): string {
  if (!n) return '';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function CashFlowTable({
  rows,
  onChange,
  columns = ['capex', 'opex', 'revenue'],
  showNet = true,
  showTotals = true,
  readOnly = false,
  chartFirst = false,
  startYear,
  constructionYears,
  operationalYears,
}: CashFlowTableProps) {
  const [chartMode, setChartMode] = useState<'annual' | 'cumulative'>('annual');
  const [tableExpanded, setTableExpanded] = useState(false);
  const [quickEntry, setQuickEntry] = useState(false);
  const [quickTotals, setQuickTotals] = useState({ capex: null as number | null, opex: null as number | null, revenue: null as number | null });
  type DistPeriod = 'construction' | 'operational' | 'all';
  const [quickDist, setQuickDist] = useState<Record<string, DistPeriod>>({
    capex: 'construction',
    opex: 'all',
    revenue: 'all',
  });

  const addRow = () => {
    const lastYear = rows.length > 0 ? Math.max(...rows.map(r => r.year)) : (startYear || new Date().getFullYear()) - 1;
    onChange([...rows, { year: lastYear + 1, capex: 0, opex: 0, revenue: 0 }]);
  };

  const addRowBefore = () => {
    const firstYear = rows.length > 0 ? Math.min(...rows.map(r => r.year)) : (startYear || new Date().getFullYear());
    onChange([{ year: firstYear - 1, capex: 0, opex: 0, revenue: 0 }, ...rows]);
  };

  const clearColumn = (col: string) => {
    onChange(rows.map(row => ({ ...row, [col]: 0 })));
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const generateYears = () => {
    const sy = startYear || new Date().getFullYear();
    const cYears = constructionYears || 2;
    const oYears = operationalYears || 10;
    const total = cYears + oYears;
    const generated: CostTableRow[] = [];

    for (let i = 0; i < total; i++) {
      const existing = rows.find(r => r.year === sy + i);
      generated.push(existing || { year: sy + i, capex: 0, opex: 0, revenue: 0 });
    }
    onChange(generated);
  };

  const applyQuickEntry = () => {
    if (rows.length === 0) return;
    const cYears = constructionYears || Math.max(1, Math.floor(rows.length / 4));
    const oYears = rows.length - cYears;

    const distribute = (total: number, period: DistPeriod, idx: number): number => {
      if (total === 0) return 0;
      switch (period) {
        case 'construction':
          return idx < cYears ? Math.round(total / cYears) : 0;
        case 'operational':
          return idx >= cYears ? Math.round(total / Math.max(1, oYears)) : 0;
        case 'all':
          return Math.round(total / rows.length);
      }
    };

    const updated = rows.map((row, idx) => ({
      ...row,
      capex: distribute(quickTotals.capex ?? 0, quickDist.capex, idx),
      opex: distribute(quickTotals.opex ?? 0, quickDist.opex, idx),
      revenue: distribute(quickTotals.revenue ?? 0, quickDist.revenue, idx),
    }));
    onChange(updated);
    setQuickEntry(false);
  };

  // Compute totals
  const totals = rows.reduce(
    (acc, row) => ({
      capex: acc.capex + (row.capex || 0),
      opex: acc.opex + (row.opex || 0),
      revenue: acc.revenue + (row.revenue || 0),
    }),
    { capex: 0, opex: 0, revenue: 0 }
  );

  const tableSection = (
    <>
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuickEntry(!quickEntry)}
            className="gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />
            {quickEntry ? 'Manual Entry' : 'Quick Entry'}
          </Button>
        </div>
      )}

      {quickEntry && !readOnly && (
        <div className="p-3 bg-[#f6f5f3] border border-[#5f7f7a]/20 rounded-lg space-y-2">
          <p className="text-xs text-foreground font-medium">
            Enter totals — they will be distributed across years automatically.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {columns.map(col => (
              <div key={col}>
                <label className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  Total {COLUMN_LABELS[col]}
                  {COLUMN_HELP[col] && <HelpTooltip text={COLUMN_HELP[col]} />}
                </label>
                <FormattedNumberInput
                  value={quickTotals[col as keyof typeof quickTotals]}
                  onChange={v => setQuickTotals(prev => ({ ...prev, [col]: v }))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
                <div className="flex gap-0.5 mt-1.5">
                  {(['construction', 'operational', 'all'] as const).map(period => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setQuickDist(prev => ({ ...prev, [col]: period }))}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded transition-colors whitespace-nowrap',
                        quickDist[col] === period
                          ? 'bg-[#5f7f7a] text-white font-medium'
                          : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20',
                      )}
                    >
                      {period === 'construction' ? 'Construction' : period === 'operational' ? 'Operational' : 'All years'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" onClick={applyQuickEntry}>
            Apply
          </Button>
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted">
              <th className="text-left p-2 font-medium text-xs w-20">Year</th>
              {columns.map(col => {
                const colHasData = !readOnly && rows.some(r => (r[col as keyof CostTableRow] as number) > 0);
                return (
                  <th key={col} className="text-right p-2 font-medium text-xs">
                    <span className="inline-flex items-center justify-end gap-1">
                      {COLUMN_LABELS[col]}
                      {COLUMN_HELP[col] && <HelpTooltip text={COLUMN_HELP[col]} />}
                      {colHasData && (
                        <button
                          type="button"
                          onClick={() => clearColumn(col)}
                          className="text-muted-foreground/50 hover:text-red-500 transition-colors"
                          title={`Clear all ${COLUMN_LABELS[col]} values`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  </th>
                );
              })}
              {showNet && (
                <th className="text-right p-2 font-medium text-xs">
                  <span className="inline-flex items-center justify-end gap-1">
                    Net
                    <HelpTooltip text="Net cash flow = Revenue minus CAPEX minus OPEX. A positive value means the project generates more income than it costs in that year." />
                  </span>
                </th>
              )}
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const net = (row.revenue || 0) - (row.capex || 0) - (row.opex || 0);
              return (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="p-1.5">
                    <span className="text-sm tabular-nums">{row.year}</span>
                  </td>
                  {columns.map(col => (
                    <td key={col} className="p-1.5 text-right">
                      {readOnly ? (
                        <span className="tabular-nums text-sm">{formatNum(row[col as keyof CostTableRow] as number)}</span>
                      ) : (
                        <FormattedNumberInput
                          value={(row[col as keyof CostTableRow] as number) || null}
                          onChange={v => {
                            const updated = [...rows];
                            updated[idx] = { ...updated[idx], [col]: v ?? 0 };
                            onChange(updated);
                          }}
                          placeholder="0"
                          className="h-7 text-sm text-right tabular-nums"
                        />
                      )}
                    </td>
                  ))}
                  {showNet && (
                    <td className={cn(
                      'p-1.5 text-right tabular-nums text-sm font-medium',
                      net >= 0 ? 'text-green-600' : 'text-red-600',
                    )}>
                      {formatNum(net)}
                    </td>
                  )}
                  {!readOnly && (
                    <td className="p-1.5">
                      <button
                        onClick={() => removeRow(idx)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {showTotals && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 font-medium bg-muted/30">
                <td className="p-2 text-xs">Total</td>
                {columns.map(col => (
                  <td key={col} className="p-2 text-right tabular-nums text-sm">
                    {formatNum(totals[col as keyof typeof totals])}
                  </td>
                ))}
                {showNet && (
                  <td className={cn(
                    'p-2 text-right tabular-nums text-sm',
                    totals.revenue - totals.capex - totals.opex >= 0 ? 'text-green-600' : 'text-red-600',
                  )}>
                    {formatNum(totals.revenue - totals.capex - totals.opex)}
                  </td>
                )}
                {!readOnly && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRowBefore} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Year Before
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Year After
          </Button>
        </div>
      )}
    </>
  );

  const chartSection = rows.length > 0 ? (
    <CashFlowChart rows={rows} columns={columns} chartMode={chartMode} onChartModeChange={setChartMode} />
  ) : null;

  if (chartFirst) {
    return (
      <div className="space-y-3">
        {chartSection}
        {rows.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setTableExpanded(!tableExpanded)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', tableExpanded && 'rotate-180')} />
              <span>{tableExpanded ? 'Hide' : 'Show'} detailed table ({rows.length} years)</span>
            </button>
            {tableExpanded && <div className="space-y-3 mt-2">{tableSection}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tableSection}
      {chartSection}
    </div>
  );
}

const CHART_COLORS: Record<string, string> = {
  capex: '#4c5568',
  opex: '#7b95a7',
  revenue: '#cfd0d5',
};

function CashFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const nonZero = payload.filter((entry: any) => entry.value !== 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
      <p className="font-semibold text-slate-900 mb-2">Year {label}</p>
      <div className="border-t pt-2 space-y-1">
        {nonZero.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.dataKey === 'Net' ? (entry.value >= 0 ? '#5f7f7a' : '#dc2625') : entry.color }}
              />
              <span className="text-sm text-slate-700">{entry.name}</span>
            </div>
            <span className={cn(
              'text-sm font-medium',
              entry.dataKey === 'Net' ? (entry.value >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-900',
            )}>
              {Math.abs(entry.value).toLocaleString('en-US')}
              {entry.value < 0 ? ' (deficit)' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashFlowChart({
  rows,
  columns,
  chartMode,
  onChartModeChange,
}: {
  rows: CostTableRow[];
  columns: ('capex' | 'opex' | 'revenue')[];
  chartMode: 'annual' | 'cumulative';
  onChartModeChange: (mode: 'annual' | 'cumulative') => void;
}) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const chartData = useMemo(() => {
    if (chartMode === 'annual') {
      return rows.map(row => {
        const net = (row.revenue || 0) - (row.capex || 0) - (row.opex || 0);
        return {
          year: row.year,
          ...(columns.includes('capex') ? { CAPEX: row.capex || 0 } : {}),
          ...(columns.includes('opex') ? { OPEX: row.opex || 0 } : {}),
          ...(columns.includes('revenue') ? { Revenue: row.revenue || 0 } : {}),
          Net: net,
        };
      });
    }
    let cumCapex = 0, cumOpex = 0, cumRevenue = 0;
    return rows.map(row => {
      cumCapex += row.capex || 0;
      cumOpex += row.opex || 0;
      cumRevenue += row.revenue || 0;
      const cumNet = cumRevenue - cumCapex - cumOpex;
      return {
        year: row.year,
        ...(columns.includes('capex') ? { CAPEX: cumCapex } : {}),
        ...(columns.includes('opex') ? { OPEX: cumOpex } : {}),
        ...(columns.includes('revenue') ? { Revenue: cumRevenue } : {}),
        Net: cumNet,
      };
    });
  }, [rows, columns, chartMode]);

  const chartKeys = [...columns.map(c => COLUMN_LABELS[c]), 'Net'];

  // Auto-rotate x-axis labels based on number of years
  const xAxisAngle = chartData.length <= 8 ? 0 : chartData.length <= 15 ? -45 : -90;
  const xAxisHeight = xAxisAngle === 0 ? 20 : xAxisAngle === -45 ? 50 : 60;
  const xAxisTextAnchor = xAxisAngle === 0 ? 'middle' : 'end';

  const downloadCsv = () => {
    const headers = ['Year', ...columns.map(c => COLUMN_LABELS[c]), 'Net'];
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      const net = (row.revenue || 0) - (row.capex || 0) - (row.opex || 0);
      const values = [
        row.year,
        ...columns.map(c => row[c as keyof CostTableRow] || 0),
        net,
      ];
      csvRows.push(values.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cash-flow.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLegendClick = (dataKey: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex items-center justify-center gap-4 mt-2">
        {payload.map((entry: any) => {
          const hidden = hiddenKeys.has(entry.dataKey);
          const color = entry.dataKey === 'Net' ? '#dc2625' : entry.color;
          return (
            <button
              key={entry.dataKey}
              type="button"
              onClick={() => handleLegendClick(entry.dataKey)}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-opacity',
                hidden ? 'opacity-30' : 'opacity-100',
              )}
            >
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-slate-700">{entry.value}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cash Flow Overview</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={cn('p-1 rounded', chartType === 'bar' ? 'bg-muted' : 'hover:bg-muted/50')}
              title="Bar chart"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={cn('p-1 rounded', chartType === 'line' ? 'bg-muted' : 'hover:bg-muted/50')}
              title="Line chart"
            >
              <LineChartIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-0.5">
            {(['annual', 'cumulative'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => onChartModeChange(mode)}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded transition-colors',
                  chartMode === mode
                    ? 'bg-slate-200 text-slate-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {mode === 'annual' ? 'Annual' : 'Cumulative'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border text-gray-600 hover:bg-gray-100 transition-colors"
            title="Download CSV"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        {chartType === 'bar' ? (
          <BarChart data={chartData} barGap={0} barCategoryGap="20%" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cfd0d5" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} angle={xAxisAngle} textAnchor={xAxisTextAnchor} height={xAxisHeight} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)} />
            <Tooltip content={<CashFlowTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <ReferenceLine y={0} stroke="#4c5568" strokeWidth={1} />
            <Legend content={renderLegend} />
            {chartKeys.map(key => {
              const isHidden = hiddenKeys.has(key);
              const isNet = key === 'Net';
              const baseColor = isNet ? '#dc2625' : CHART_COLORS[key === 'CAPEX' ? 'capex' : key === 'OPEX' ? 'opex' : 'revenue'];

              return (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={baseColor}
                  radius={[2, 2, 0, 0]}
                  hide={isHidden}
                >
                  {isNet && chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.Net >= 0 ? '#5f7f7a' : '#dc2625'}
                    />
                  ))}
                </Bar>
              );
            })}
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cfd0d5" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} angle={xAxisAngle} textAnchor={xAxisTextAnchor} height={xAxisHeight} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)} />
            <Tooltip content={<CashFlowTooltip />} />
            <ReferenceLine y={0} stroke="#4c5568" strokeWidth={1} />
            <Legend content={renderLegend} />
            {chartKeys.map(key => {
              const isHidden = hiddenKeys.has(key);
              const isNet = key === 'Net';
              const baseColor = isNet ? '#dc2625' : CHART_COLORS[key === 'CAPEX' ? 'capex' : key === 'OPEX' ? 'opex' : 'revenue'];

              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={baseColor}
                  strokeWidth={isNet ? 2.5 : 2}
                  strokeDasharray={isNet ? '5 3' : undefined}
                  dot={false}
                  hide={isHidden}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
