"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, ChevronDown, DollarSign, Search, X } from "lucide-react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api-fetch";
import {
  CustomYear,
  getCustomYearRange,
  getCustomYearLabel,
  sortCustomYearsCalendarFirst,
} from "@/types/custom-years";
import {
  SectorHierarchyFilter,
  SectorFilterSelection,
} from "@/components/maps/SectorHierarchyFilter";
import aidTypesJson from "@/data/aid-types.json";
import financeTypesJson from "@/data/finance-types.json";
import { CoordinationCirclePack } from "@/components/analytics/CoordinationCirclePack";
import { useChartExpansion } from "@/lib/chart-expansion-context";
import type {
  CoordinationLevel,
  CoordinationMeasure,
  CoordinationResponse,
} from "@/types/coordination";

// ── Static option lists ──────────────────────────────────────────────────────
const AID_TYPE_OPTIONS: Array<{ code: string; name: string }> = (() => {
  const out: Array<{ code: string; name: string }> = [];
  (aidTypesJson as any[]).forEach((parent) => {
    (parent.children || []).forEach((c: any) => {
      if (c.code) out.push({ code: c.code, name: c.name });
    });
  });
  return out;
})();

const FINANCE_TYPE_OPTIONS: Array<{ code: string; name: string }> = (() => {
  const out: Array<{ code: string; name: string }> = [];
  const walk = (node: any) => {
    if (!node) return;
    if (!node.children || node.children.length === 0) {
      if (node.code) out.push({ code: node.code, name: node.name });
    }
    (node.children || []).forEach(walk);
  };
  (financeTypesJson as any[]).forEach(walk);
  return out.sort((a, b) => a.code.localeCompare(b.code));
})();

const MEASURE_DEFS: Array<{
  key: CoordinationMeasure;
  label: string;
  code?: string;
  group: 'financial' | 'count';
}> = [
  { key: 'budgets', label: 'Total Budgets', group: 'financial' },
  { key: 'planned', label: 'Total Planned Disbursements', group: 'financial' },
  { key: 'tx_1', label: 'Incoming Funds', code: '1', group: 'financial' },
  { key: 'tx_2', label: 'Outgoing Commitments', code: '2', group: 'financial' },
  { key: 'tx_3', label: 'Disbursements', code: '3', group: 'financial' },
  { key: 'tx_4', label: 'Expenditures', code: '4', group: 'financial' },
  { key: 'tx_5', label: 'Interest Payments', code: '5', group: 'financial' },
  { key: 'tx_6', label: 'Loan Repayments', code: '6', group: 'financial' },
  { key: 'tx_7', label: 'Reimbursements', code: '7', group: 'financial' },
  { key: 'tx_8', label: 'Purchases of Equity', code: '8', group: 'financial' },
  { key: 'tx_9', label: 'Sales of Equity', code: '9', group: 'financial' },
  { key: 'tx_10', label: 'Credit Guarantees', code: '10', group: 'financial' },
  { key: 'tx_11', label: 'Incoming Commitments', code: '11', group: 'financial' },
  { key: 'tx_12', label: 'Outgoing Pledges', code: '12', group: 'financial' },
  { key: 'tx_13', label: 'Incoming Pledges', code: '13', group: 'financial' },
  { key: 'activities', label: 'Number of Activities', group: 'count' },
  { key: 'donors', label: 'Number of Development Partners', group: 'count' },
  { key: 'avgSize', label: 'Average Activity Size (Disbursed)', group: 'count' },
];
const MEASURE_LABEL: Record<CoordinationMeasure, string> = MEASURE_DEFS.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.label }),
  {} as Record<CoordinationMeasure, string>,
);

const HIERARCHY_LEVELS: Array<{ key: CoordinationLevel; short: string }> = [
  { key: 'category', short: 'Category' },
  { key: 'sector', short: 'Sector' },
  { key: 'subSector', short: 'Sub-Sector' },
];

const currentYear = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from({ length: currentYear + 10 - 2010 + 1 }, (_, i) => 2010 + i);

type OpenFilter =
  | 'calendar'
  | 'year'
  | 'measure'
  | 'aidType'
  | 'financeType'
  | 'donor'
  | 'sector'
  | null;

interface OrgRow {
  id: string;
  name: string;
  acronym: string | null;
}

interface CoordinationChartWithControlsProps {
  width?: number;
  height?: number;
  /** When inside a CompactChartCard's compact view, hide the filter bar and
   *  level toggle so the small card stays uncluttered. */
  compact?: boolean;
  /** Initial measure — defaults to disbursements. */
  initialMeasure?: CoordinationMeasure;
  /** Initial hierarchy level — defaults to category. */
  initialLevel?: CoordinationLevel;
  /** Called whenever the chart's data is refreshed, with a flat row list
   *  suitable for CompactChartCard's table view + CSV export. The first
   *  column key is rendered as the leading column header. */
  onDataChange?: (rows: Array<Record<string, string | number>>) => void;
}

export function CoordinationChartWithControls({
  width,
  height,
  compact: compactProp,
  initialMeasure = 'tx_3',
  initialLevel = 'category',
  onDataChange,
}: CoordinationChartWithControlsProps) {
  // CompactChartCard provides ChartExpansionProvider; honour it as well so we
  // hide controls in the dashboard tile but show them in the expanded modal.
  const isExpanded = useChartExpansion();
  const showControls = compactProp === false || isExpanded || compactProp === undefined;

  // ── State ─────────────────────────────────────────────────────────────────
  const [level, setLevel] = useState<CoordinationLevel>(initialLevel);
  const [measure, setMeasure] = useState<CoordinationMeasure>(initialMeasure);
  const [calendarType, setCalendarType] = useState<string>('');
  const [customYears, setCustomYears] = useState<CustomYear[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const [aidTypes, setAidTypes] = useState<string[]>([]);
  const [financeTypes, setFinanceTypes] = useState<string[]>([]);
  const [donorIds, setDonorIds] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState<SectorFilterSelection>({
    sectorCategories: [],
    sectors: [],
    subSectors: [],
  });
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const filterOpenHandler = (key: Exclude<OpenFilter, null>) => (open: boolean) => {
    setOpenFilter((prev) => (open ? key : prev === key ? null : prev));
  };

  const [aidTypeSearch, setAidTypeSearch] = useState('');
  const [financeTypeSearch, setFinanceTypeSearch] = useState('');
  const [donorSearch, setDonorSearch] = useState('');
  const [measureSearch, setMeasureSearch] = useState('');

  const [orgList, setOrgList] = useState<OrgRow[]>([]);
  const [sectorActivityCounts, setSectorActivityCounts] = useState<Record<string, number>>({});
  const [showOnlyActiveSectors, setShowOnlyActiveSectors] = useState(true);

  const [data, setData] = useState<CoordinationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Bootstrap data ───────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch('/api/custom-years')
      .then((r) => r.json())
      .then((result) => {
        const years: CustomYear[] = result.data || [];
        setCustomYears(years);
        let selected = result.defaultId ? years.find((cy) => cy.id === result.defaultId) : undefined;
        if (!selected && years.length > 0) selected = years[0];
        if (selected) setCalendarType(selected.id);
      })
      .catch(() => undefined);
    const yr = new Date().getFullYear();
    setSelectedYears([yr - 5, yr]);

    apiFetch('/api/organizations')
      .then((r) => r.json())
      .then((rows: any) => {
        if (Array.isArray(rows)) {
          setOrgList(rows.map((o: any) => ({ id: o.id, name: o.name || 'Unknown', acronym: o.acronym || null })));
        }
      })
      .catch(() => undefined);

    apiFetch('/api/sectors/summary')
      .then((r) => r.json())
      .then((result) => {
        const counts: Record<string, number> = {};
        (result.groups || []).forEach((g: any) => {
          if (g?.code) counts[g.code] = g.activityCount || 0;
          (g.categories || []).forEach((c: any) => {
            if (c?.code) counts[c.code] = c.activityCount || 0;
            (c.sectors || []).forEach((s: any) => {
              if (s?.code) counts[s.code] = s.activityCount || 0;
            });
          });
        });
        setSectorActivityCounts(counts);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!calendarType || selectedYears.length === 0 || customYears.length === 0) return;
    const cy = customYears.find((c) => c.id === calendarType);
    if (!cy) return;
    const sortedYears = [...selectedYears].sort((a, b) => a - b);
    const firstRange = getCustomYearRange(cy, sortedYears[0]);
    const lastRange = getCustomYearRange(cy, sortedYears[sortedYears.length - 1]);
    setDateRange({ from: firstRange.start, to: lastRange.end });
  }, [calendarType, selectedYears, customYears]);

  const sectorFilterKey = useMemo(
    () =>
      [
        sectorFilter.sectorCategories.slice().sort().join(','),
        sectorFilter.sectors.slice().sort().join(','),
        sectorFilter.subSectors.slice().sort().join(','),
      ].join('|'),
    [sectorFilter],
  );

  useEffect(() => {
    if (!dateRange) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ level, measure });
        if (dateRange.from) params.set('dateFrom', dateRange.from.toISOString());
        if (dateRange.to) params.set('dateTo', dateRange.to.toISOString());
        if (aidTypes.length > 0) params.set('aidType', aidTypes.join(','));
        if (financeTypes.length > 0) params.set('financeType', financeTypes.join(','));
        if (donorIds.length > 0) params.set('donor', donorIds.join(','));
        if (sectorFilter.sectorCategories.length > 0) params.set('sectorGroups', sectorFilter.sectorCategories.join(','));
        if (sectorFilter.sectors.length > 0) params.set('sectorCategories', sectorFilter.sectors.join(','));
        if (sectorFilter.subSectors.length > 0) params.set('sectorSubSectors', sectorFilter.subSectors.join(','));
        const response = await apiFetch(`/api/analytics/coordination?${params}`);
        const result = await response.json();
        if (!cancelled && response.ok && result.success) {
          setData(result);
          if (onDataChange) {
            const measureCol = result.measureLabel || MEASURE_LABEL[measure];
            const isCount = measure === 'activities' || measure === 'donors';
            const rows: Array<Record<string, string | number>> = (result.data?.children || []).map((c: any) => {
              const topDonor = (c.topDonors && c.topDonors[0]) || null;
              const topDonorLabel = topDonor
                ? topDonor.acronym
                  ? `${topDonor.name} (${topDonor.acronym})`
                  : topDonor.name
                : '';
              return {
                Code: c.code || '',
                Sector: c.name || '',
                [measureCol]: isCount ? Math.round(c.value || 0) : Number(c.value || 0),
                Activities: c.activityCount || 0,
                Donors: c.donorCount || 0,
                'Top Donor': topDonorLabel,
              };
            });
            onDataChange(rows);
          }
        }
      } catch (err) {
        console.error('[CoordinationChart] fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, measure, dateRange?.from, dateRange?.to, aidTypes.join(','), financeTypes.join(','), donorIds.join(','), sectorFilterKey]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const handleYearClick = (year: number, shiftKey: boolean) => {
    if (shiftKey && selectedYears.length === 1) {
      setSelectedYears([Math.min(selectedYears[0], year), Math.max(selectedYears[0], year)]);
    } else if (selectedYears.length === 0) {
      setSelectedYears([year]);
    } else if (selectedYears.length === 1) {
      if (selectedYears[0] === year) setSelectedYears([]);
      else setSelectedYears([Math.min(selectedYears[0], year), Math.max(selectedYears[0], year)]);
    } else {
      setSelectedYears([year]);
    }
  };
  const isYearInRange = (year: number) => {
    if (selectedYears.length < 2) return false;
    return year > Math.min(...selectedYears) && year < Math.max(...selectedYears);
  };
  const yearLabel = (year: number) => {
    const cy = customYears.find((c) => c.id === calendarType);
    return cy ? getCustomYearLabel(cy, year) : `${year}`;
  };

  const filteredAidTypes = useMemo(() => {
    const q = aidTypeSearch.trim().toLowerCase();
    if (!q) return AID_TYPE_OPTIONS;
    return AID_TYPE_OPTIONS.filter((t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [aidTypeSearch]);
  const filteredFinanceTypes = useMemo(() => {
    const q = financeTypeSearch.trim().toLowerCase();
    if (!q) return FINANCE_TYPE_OPTIONS;
    return FINANCE_TYPE_OPTIONS.filter((t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [financeTypeSearch]);
  const filteredDonors = useMemo(() => {
    const q = donorSearch.trim().toLowerCase();
    if (!q) return orgList;
    return orgList.filter((o) => o.name.toLowerCase().includes(q) || (o.acronym || '').toLowerCase().includes(q));
  }, [donorSearch, orgList]);
  const filteredMeasures = useMemo(() => {
    const q = measureSearch.trim().toLowerCase();
    if (!q) return MEASURE_DEFS;
    return MEASURE_DEFS.filter((m) => m.label.toLowerCase().includes(q) || (m.code ?? '').toLowerCase().includes(q));
  }, [measureSearch]);

  // Short labels so all six controls (hierarchy toggle + five dropdowns) fit
  // on a single right-aligned line in the dashboard modal at typical widths.
  const aidTypeLabel = aidTypes.length === 0 ? 'Aid type' : aidTypes.length === 1 ? AID_TYPE_OPTIONS.find((t) => t.code === aidTypes[0])?.code || aidTypes[0] : `${aidTypes.length} aid`;
  const financeTypeLabel = financeTypes.length === 0 ? 'Finance' : financeTypes.length === 1 ? FINANCE_TYPE_OPTIONS.find((t) => t.code === financeTypes[0])?.code || financeTypes[0] : `${financeTypes.length} finance`;
  const donorLabel = donorIds.length === 0 ? 'Partners' : donorIds.length === 1 ? orgList.find((o) => o.id === donorIds[0])?.acronym || orgList.find((o) => o.id === donorIds[0])?.name || 'Partner' : `${donorIds.length} partners`;

  // ── Render ───────────────────────────────────────────────────────────────
  if (!showControls) {
    // Compact mode (inside dashboard tile) — just the chart, no controls.
    return (
      <CoordinationCirclePack
        data={data?.data || null}
        measure={measure}
        measureLabel={data?.measureLabel || MEASURE_LABEL[measure]}
        periodLabel={data?.periodLabel}
        width={width}
        height={height}
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar — calendar/year on the first row (left-aligned), then a
          second row with the hierarchy toggle + dropdowns right-aligned. */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          {customYears.length > 0 && (
            <>
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <DropdownMenu open={openFilter === 'calendar'} onOpenChange={filterOpenHandler('calendar')}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      {customYears.find((cy) => cy.id === calendarType)?.name || 'Select calendar'}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {sortCustomYearsCalendarFirst(customYears).map((cy) => (
                      <DropdownMenuItem
                        key={cy.id}
                        className={calendarType === cy.id ? 'bg-muted font-medium' : ''}
                        onClick={() => setCalendarType(cy.id)}
                      >
                        <span className="flex items-center gap-2">
                          {cy.shortName && (
                            <span className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                              {cy.shortName.trim()}
                            </span>
                          )}
                          {cy.name}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex gap-1 border rounded-lg p-1 bg-white">
                <DropdownMenu open={openFilter === 'year'} onOpenChange={filterOpenHandler('year')}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      title={dateRange?.from && dateRange?.to ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}` : undefined}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {selectedYears.length === 0
                        ? 'Select years'
                        : selectedYears.length === 1
                          ? yearLabel(selectedYears[0])
                          : `${yearLabel(Math.min(...selectedYears))} – ${yearLabel(Math.max(...selectedYears))}`}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="p-3 w-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-helper font-medium text-foreground">Select Year Range</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedYears([AVAILABLE_YEARS[0], AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]])}
                          className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 hover:bg-muted rounded"
                        >
                          All
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {AVAILABLE_YEARS.map((year) => {
                        const isStartOrEnd =
                          selectedYears.length > 0 && (year === Math.min(...selectedYears) || year === Math.max(...selectedYears));
                        const inRange = isYearInRange(year);
                        return (
                          <button
                            key={year}
                            onClick={(e) => handleYearClick(year, e.shiftKey)}
                            className={`px-2 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                              isStartOrEnd ? 'bg-muted text-foreground' : inRange ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted'
                            }`}
                            title="Click to select start, then click another to select end"
                          >
                            {yearLabel(year)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">Click start year, then click end year</p>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>

        {/* Filter row A — hierarchy toggle + the three narrow dropdowns,
            right-aligned. */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            {HIERARCHY_LEVELS.map((l) => (
              <Button
                key={l.key}
                variant={level === l.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLevel(l.key)}
                className="h-8"
              >
                {l.short}
              </Button>
            ))}
          </div>
          <FilterDropdown
            open={openFilter === 'aidType'}
            onOpenChange={filterOpenHandler('aidType')}
            triggerLabel={aidTypeLabel}
            heading="Aid Types"
            search={aidTypeSearch}
            setSearch={setAidTypeSearch}
            onSelectAll={() => setAidTypes(AID_TYPE_OPTIONS.map((t) => t.code))}
            onClear={() => setAidTypes([])}
            selectionEmpty={aidTypes.length === 0}
            selectionFull={aidTypes.length === AID_TYPE_OPTIONS.length}
            items={filteredAidTypes.map((t) => ({
              code: t.code,
              label: t.name,
              checked: aidTypes.includes(t.code),
              onToggle: () =>
                setAidTypes((prev) => (prev.includes(t.code) ? prev.filter((c) => c !== t.code) : [...prev, t.code])),
            }))}
          />
          <FilterDropdown
            open={openFilter === 'financeType'}
            onOpenChange={filterOpenHandler('financeType')}
            triggerLabel={financeTypeLabel}
            heading="Finance Types"
            search={financeTypeSearch}
            setSearch={setFinanceTypeSearch}
            onSelectAll={() => setFinanceTypes(FINANCE_TYPE_OPTIONS.map((t) => t.code))}
            onClear={() => setFinanceTypes([])}
            selectionEmpty={financeTypes.length === 0}
            selectionFull={financeTypes.length === FINANCE_TYPE_OPTIONS.length}
            items={filteredFinanceTypes.map((t) => ({
              code: t.code,
              label: t.name,
              checked: financeTypes.includes(t.code),
              onToggle: () =>
                setFinanceTypes((prev) =>
                  prev.includes(t.code) ? prev.filter((c) => c !== t.code) : [...prev, t.code],
                ),
            }))}
          />
          <FilterDropdown
            open={openFilter === 'donor'}
            onOpenChange={filterOpenHandler('donor')}
            triggerLabel={donorLabel}
            heading="Development Partners"
            search={donorSearch}
            setSearch={setDonorSearch}
            onSelectAll={() => setDonorIds(orgList.map((o) => o.id))}
            onClear={() => setDonorIds([])}
            selectionEmpty={donorIds.length === 0}
            selectionFull={donorIds.length === orgList.length && orgList.length > 0}
            items={filteredDonors.slice(0, 200).map((o) => ({
              code: o.acronym || undefined,
              label: o.acronym ? `${o.name} (${o.acronym})` : o.name,
              checked: donorIds.includes(o.id),
              onToggle: () =>
                setDonorIds((prev) => (prev.includes(o.id) ? prev.filter((x) => x !== o.id) : [...prev, o.id])),
            }))}
          />
        </div>

        {/* Filter row B — the two wider controls (sector picker + measure),
            kept together right-aligned underneath row A. */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <SectorHierarchyFilter
            selected={sectorFilter}
            onChange={setSectorFilter}
            open={openFilter === 'sector'}
            onOpenChange={filterOpenHandler('sector')}
            activityCounts={sectorActivityCounts}
            showOnlyActiveSectors={showOnlyActiveSectors}
            onShowOnlyActiveSectorsChange={setShowOnlyActiveSectors}
            className="h-9 shrink-0"
          />
          <DropdownMenu open={openFilter === 'measure'} onOpenChange={filterOpenHandler('measure')}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 justify-between shrink-0">
                <span className="flex items-center gap-2 truncate text-body">
                  <DollarSign className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{MEASURE_LABEL[measure]}</span>
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[320px] max-h-[420px] overflow-y-auto p-1"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="sticky top-0 z-10 bg-card border-b border-border mb-1">
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <span className="text-helper font-semibold text-foreground">Measure</span>
                </div>
                <div className="flex items-center px-3 py-2 border-t border-border">
                  <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                  <Input
                    placeholder="Search measures..."
                    value={measureSearch}
                    onChange={(e) => setMeasureSearch(e.target.value)}
                    className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                  />
                  {measureSearch && (
                    <X
                      className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                      onClick={() => setMeasureSearch('')}
                    />
                  )}
                </div>
              </div>
              {filteredMeasures.length === 0 && (
                <div className="px-3 py-4 text-helper text-muted-foreground text-center">No matching measures.</div>
              )}
              {filteredMeasures.map((m, idx) => {
                const prev = idx > 0 ? filteredMeasures[idx - 1] : null;
                const showSep = !!prev && prev.group !== m.group;
                return (
                  <React.Fragment key={m.key}>
                    {showSep && <div className="my-1 border-t border-border" />}
                    <button
                      type="button"
                      onClick={() => {
                        setMeasure(m.key);
                        setOpenFilter(null);
                      }}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body ${
                        measure === m.key ? 'bg-muted font-medium' : ''
                      }`}
                    >
                      {m.code && (
                        <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">
                          {m.code}
                        </code>
                      )}
                      <span className="text-foreground truncate">{m.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart */}
      {loading && !data ? (
        <div className="flex items-center justify-center h-[500px] text-muted-foreground">Loading…</div>
      ) : (
        <CoordinationCirclePack
          data={data?.data || null}
          measure={measure}
          measureLabel={data?.measureLabel || MEASURE_LABEL[measure]}
          periodLabel={data?.periodLabel}
          width={width}
          height={height}
        />
      )}
    </div>
  );
}

interface FilterDropdownItem {
  code?: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}
interface FilterDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  heading: string;
  search: string;
  setSearch: (v: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  selectionEmpty: boolean;
  selectionFull: boolean;
  items: FilterDropdownItem[];
}
function FilterDropdown({
  open,
  onOpenChange,
  triggerLabel,
  heading,
  search,
  setSearch,
  onSelectAll,
  onClear,
  selectionEmpty,
  selectionFull,
  items,
}: FilterDropdownProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 justify-between shrink-0">
          <span className="truncate text-body">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] max-h-[420px] overflow-y-auto p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border mb-1">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <span className="text-helper font-semibold text-foreground">{heading}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onSelectAll}
                disabled={selectionFull}
                className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Select all
              </button>
              <span className="text-muted-foreground/40">·</span>
              <button
                type="button"
                onClick={onClear}
                disabled={selectionEmpty}
                className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-muted"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex items-center px-3 py-2 border-t border-border">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            {search && (
              <X
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground shrink-0"
                onClick={() => setSearch('')}
              />
            )}
          </div>
        </div>
        {items.length === 0 && (
          <div className="px-3 py-4 text-helper text-muted-foreground text-center">No matches.</div>
        )}
        {items.map((item, idx) => (
          <button
            key={`${item.code ?? ''}-${idx}-${item.label}`}
            type="button"
            onClick={item.onToggle}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-muted rounded text-body"
          >
            <Checkbox checked={item.checked} className="pointer-events-none flex-shrink-0" />
            {item.code && (
              <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs flex-shrink-0">
                {item.code}
              </code>
            )}
            <span className="text-foreground truncate">{item.label}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
