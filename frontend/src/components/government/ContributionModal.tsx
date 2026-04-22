'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Check, Loader2, Info, CalendarRange, SplitSquareHorizontal, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CurrencySelector } from '@/components/forms/CurrencySelector';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { convertToUSD } from '@/lib/currency-conversion-api';
import { cn } from '@/lib/utils';
import type {
  Contribution,
  ContributionType,
  FinancialContribution,
  InKindContribution,
  OtherContribution,
  InKindCategory,
  OtherCategory,
} from './contribution-types';
import {
  IN_KIND_CATEGORY_LABELS,
  OTHER_CATEGORY_LABELS,
  fiscalYearFor,
  fiscalYearStartDate,
  fiscalYearLabel,
} from './contribution-types';
import { useCustomYears } from '@/hooks/useCustomYears';
import { CustomYearSelector } from '@/components/ui/custom-year-selector';
import { getCustomYearLabel, getCustomYearRange } from '@/types/custom-years';
import { LabelWithInfoAndSave } from '@/components/ui/info-tooltip-with-save-indicator';
import { RequiredDot } from '@/components/ui/required-dot';

/** Renders a form field label with a (?) info tooltip and optional red required dot. */
function FieldLabel({
  children,
  help,
  required,
}: {
  children: React.ReactNode;
  help: string;
  required?: boolean;
}) {
  return (
    <LabelWithInfoAndSave helpText={help} isSaving={false} isSaved={false} hasValue={false}>
      <span>
        {children}
        {required && <RequiredDot />}
      </span>
    </LabelWithInfoAndSave>
  );
}

interface ContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Contribution | null;
  defaultCurrency?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  onSave: (contribution: Contribution) => void;
}

type Step = 'pickType' | 'edit';

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function emptyForType(type: ContributionType, defaultCurrency?: string): Contribution {
  const base = { id: newId(), description: '' };
  if (type === 'financial') {
    return {
      ...base,
      type: 'financial',
      currency: defaultCurrency,
      distributionMode: 'lump_sum',
      annual: [],
    };
  }
  if (type === 'in_kind') {
    return {
      ...base,
      type: 'in_kind',
      category: 'staff',
      currency: defaultCurrency,
      period: 'one_time',
    };
  }
  return {
    ...base,
    type: 'other',
    category: 'tax_exemption',
    currency: defaultCurrency,
  };
}

export function ContributionModal({
  open,
  onOpenChange,
  initial,
  defaultCurrency,
  plannedStartDate,
  plannedEndDate,
  onSave,
}: ContributionModalProps) {
  const [step, setStep] = useState<Step>('pickType');
  const [draft, setDraft] = useState<Contribution | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDraft(initial);
      setStep('edit');
    } else {
      setDraft(null);
      setStep('pickType');
    }
  }, [open, initial]);

  // Workaround for known Radix bug: after a Radix Select inside a Dialog closes,
  // body.style.pointerEvents can linger as "none", blocking subsequent clicks on
  // other triggers (e.g., our custom CurrencySelector). Use a MutationObserver to
  // catch and clear this the instant it happens — faster and less intrusive than
  // polling.
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const reset = () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
    const observer = new MutationObserver(reset);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => {
      observer.disconnect();
      reset();
    };
  }, [open]);

  const pickType = (type: ContributionType) => {
    setDraft(emptyForType(type, defaultCurrency));
    setStep('edit');
  };

  const handleSave = () => {
    if (!draft) return;
    onSave(draft);
    onOpenChange(false);
  };

  const canSave = (() => {
    if (!draft) return false;
    if (draft.type === 'financial') {
      return !!draft.description?.trim() && !!draft.currency && (draft.amountLocal ?? 0) > 0;
    }
    if (draft.type === 'in_kind') {
      return !!draft.description?.trim() && !!draft.category;
    }
    return !!draft.description?.trim() && !!draft.category;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 mx-0 mt-0 bg-surface-muted px-6 py-4 rounded-t-lg border-b">
          <DialogTitle>
            {step === 'pickType' ? 'Add Government Contribution' : (
              <div className="flex items-center gap-2">
                {!initial && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { setDraft(null); setStep('pickType'); }}
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <span>
                  {initial ? 'Edit ' : 'New '}
                  {draft?.type === 'financial' && 'Financial Contribution'}
                  {draft?.type === 'in_kind' && 'In-Kind Contribution'}
                  {draft?.type === 'other' && 'Other Contribution'}
                </span>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'pickType'
              ? 'Choose the kind of contribution the government is making to this activity.'
              : 'Record the details of this contribution. You can edit or remove it later.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'pickType' && <TypePicker onPick={pickType} />}

          {step === 'edit' && draft?.type === 'financial' && (
            <FinancialForm
              value={draft}
              onChange={(next) => setDraft(next)}
              plannedStartDate={plannedStartDate}
              plannedEndDate={plannedEndDate}
            />
          )}
          {step === 'edit' && draft?.type === 'in_kind' && (
            <InKindForm value={draft} onChange={(next) => setDraft(next)} />
          )}
          {step === 'edit' && draft?.type === 'other' && (
            <OtherForm value={draft} onChange={(next) => setDraft(next)} />
          )}
        </div>

        {step === 'edit' && (
          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              Save contribution
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Step 1: Type picker ───────────────────────────────────────────────────

function TypePicker({ onPick }: { onPick: (t: ContributionType) => void }) {
  const cards: Array<{
    type: ContributionType;
    title: string;
    description: string;
    image: string;
  }> = [
    {
      type: 'financial',
      title: 'Financial Contribution',
      description: 'Cash transferred or co-funded from a government budget line.',
      image: '/images/contribution-financial.png',
    },
    {
      type: 'in_kind',
      title: 'In-Kind Contribution',
      description: 'Goods, services, staff time, land, buildings, or facilities.',
      image: '/images/contribution-in-kind.png',
    },
    {
      type: 'other',
      title: 'Other Contribution',
      description: 'Tax exemptions, waivers, or policy concessions.',
      image: '/images/contribution-other.png',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2">
      {cards.map((card) => (
        <button
          key={card.type}
          type="button"
          onClick={() => onPick(card.type)}
          className="relative flex flex-col justify-end h-[220px] rounded-lg ring-1 ring-inset ring-border bg-background hover:bg-muted transition-all text-left overflow-hidden"
        >
          <Image
            src={card.image}
            alt={card.title}
            fill
            className="object-contain object-top p-3 opacity-70 mix-blend-multiply"
          />
          <div className="relative z-10 p-3">
            <h4 className="text-body font-semibold">{card.title}</h4>
            <p className="mt-1 text-helper text-muted-foreground">{card.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Step 2a: Financial form ───────────────────────────────────────────────

function FinancialForm({
  value,
  onChange,
  plannedStartDate,
  plannedEndDate,
}: {
  value: FinancialContribution;
  onChange: (next: FinancialContribution) => void;
  plannedStartDate?: string;
  plannedEndDate?: string;
}) {
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editingValueDisplay, setEditingValueDisplay] = useState('');

  const patch = (p: Partial<FinancialContribution>) => onChange({ ...value, ...p });

  const fetchRate = async () => {
    if (!value.currency || value.currency === 'USD') {
      patch({ exchangeRate: 1 });
      setRateError(null);
      return;
    }
    if (!value.valueDate) {
      setRateError('Please set a value date first');
      return;
    }
    setIsLoadingRate(true);
    setRateError(null);
    try {
      const result = await convertToUSD(1, value.currency, new Date(value.valueDate));
      if (result.success && result.exchange_rate) {
        patch({ exchangeRate: result.exchange_rate });
      } else {
        setRateError(result.error || 'Failed to fetch exchange rate');
      }
    } catch {
      setRateError('Failed to fetch exchange rate');
    } finally {
      setIsLoadingRate(false);
    }
  };

  useEffect(() => {
    if (!value.exchangeRateManual && value.currency && value.currency !== 'USD' && value.valueDate) {
      fetchRate();
    } else if (value.currency === 'USD') {
      patch({ exchangeRate: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.currency, value.valueDate, value.exchangeRateManual]);

  const computedUSD = value.amountLocal && value.exchangeRate
    ? Math.round(value.amountLocal * value.exchangeRate * 100) / 100
    : null;

  const annualTotalUSD = (value.annual || []).reduce((sum, r) => {
    const rowUSD = r.amountLocal && r.exchangeRate
      ? Math.round(r.amountLocal * r.exchangeRate * 100) / 100
      : r.amountUSD || 0;
    return sum + rowUSD;
  }, 0);
  const isAnnual = value.distributionMode === 'annual';

  const effectiveStart = value.breakdownStart || plannedStartDate;
  const effectiveEnd = value.breakdownEnd || plannedEndDate;

  // Fiscal year: pick from shared CustomYear list (admin-managed). Fall back to legacy
  // fiscalYearStartMonth, then to calendar year.
  const { customYears, selectedId: defaultCustomYearId, loading: customYearsLoading } = useCustomYears();
  const activeCustomYearId = value.customYearId ?? defaultCustomYearId ?? null;
  const selectedCustomYear = activeCustomYearId
    ? customYears.find((cy) => cy.id === activeCustomYearId) || null
    : null;
  const fyMonth = selectedCustomYear?.startMonth ?? value.fiscalYearStartMonth ?? 1;
  const labelForYear = (year: number) =>
    selectedCustomYear
      ? getCustomYearLabel(selectedCustomYear, year)
      : fiscalYearLabel(year, fyMonth);

  const generateYearRows = () => {
    if (!effectiveStart || !effectiveEnd) return;
    if (isNaN(new Date(effectiveStart).getTime()) || isNaN(new Date(effectiveEnd).getTime())) return;

    const startFY = fiscalYearFor(effectiveStart, fyMonth);
    const endFY = fiscalYearFor(effectiveEnd, fyMonth);
    if (endFY < startFY) return;

    const existing = value.annual || [];
    const generated: NonNullable<FinancialContribution['annual']> = [];
    for (let y = startFY; y <= endFY; y++) {
      const prev = existing.find(r => r.year === y);
      generated.push(prev || {
        year: y,
        amountLocal: 0,
        amountUSD: 0,
        valueDate: fiscalYearStartDate(y, fyMonth),
      });
    }
    patch({ annual: generated });
  };

  // When the user picks a different CustomYear, re-align each row's valueDate to the new
  // FY start (unless the user already set a custom manual date for that row).
  const applyCustomYear = (newCustomYearId: string | null) => {
    const newCY = newCustomYearId ? customYears.find((cy) => cy.id === newCustomYearId) : null;
    const newMonth = newCY?.startMonth ?? 1;

    const next = (value.annual || []).map((row) => {
      const oldStart = fiscalYearStartDate(row.year, fyMonth);
      if (row.valueDate === oldStart || !row.valueDate) {
        return {
          ...row,
          valueDate: fiscalYearStartDate(row.year, newMonth),
          ...(row.exchangeRateManual ? {} : { exchangeRate: undefined }),
        };
      }
      return row;
    });
    patch({
      customYearId: newCustomYearId || undefined,
      // Clear the legacy field so it doesn't shadow the new setting
      fiscalYearStartMonth: undefined,
      annual: next,
    });
  };

  const distributeEvenly = () => {
    const rows = value.annual || [];
    if (!rows.length || !value.amountLocal) return;
    const perYear = Math.round((value.amountLocal / rows.length) * 100) / 100;
    const next = rows.map(r => ({
      ...r,
      amountLocal: perYear,
      amountUSD: r.exchangeRate ? Math.round(perYear * r.exchangeRate * 100) / 100 : 0,
    }));
    patch({ annual: next });
  };

  // Auto-fetch per-row exchange rates when in Annual mode
  useEffect(() => {
    if (value.distributionMode !== 'annual') return;
    if (!value.currency) return;

    const rows = value.annual || [];
    // Find rows needing a rate (not manual, have a value date, no rate yet)
    const needsFetch = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) =>
        !r.exchangeRateManual &&
        !!r.valueDate &&
        (r.exchangeRate === undefined || r.exchangeRate === null)
      );

    if (needsFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      // Fetch all needed rates in parallel
      const results = await Promise.all(
        needsFetch.map(async ({ idx, r }) => {
          if (value.currency === 'USD') {
            return { idx, rate: 1 };
          }
          try {
            const res = await convertToUSD(1, value.currency!, new Date(r.valueDate!));
            if (res.success && res.exchange_rate) {
              return { idx, rate: res.exchange_rate };
            }
          } catch {}
          return { idx, rate: null };
        })
      );

      if (cancelled) return;
      const next = [...(value.annual || [])];
      let changed = false;
      for (const { idx, rate } of results) {
        if (rate == null) continue;
        const row = next[idx];
        if (!row) continue;
        const amtUSD = row.amountLocal ? Math.round(row.amountLocal * rate * 100) / 100 : 0;
        next[idx] = { ...row, exchangeRate: rate, amountUSD: amtUSD };
        changed = true;
      }
      if (changed) patch({ annual: next });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.distributionMode, value.currency, JSON.stringify((value.annual || []).map(r => [r.year, r.valueDate, r.exchangeRateManual, r.exchangeRate]))]);

  return (
    <div className="space-y-4 py-2">
      {/* Row 1: Value | Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldLabel help="Total financial contribution committed by the government, in the specified currency. For annual breakdowns this is the sum across all years." required>Value</FieldLabel>
          <Input
            type="text"
            placeholder="0.00"
            value={isEditingValue
              ? editingValueDisplay
              : (value.amountLocal ? value.amountLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.]/g, '');
              const parts = raw.split('.');
              const intPart = parts[0] ? parseInt(parts[0], 10) : 0;
              const formatted = isNaN(intPart)
                ? ''
                : intPart.toLocaleString() + (parts.length > 1 ? '.' + parts[1] : '');
              setEditingValueDisplay(formatted);
              const num = parseFloat(raw);
              const local = !isNaN(num) ? num : (raw === '' || raw === '.') ? 0 : value.amountLocal ?? 0;
              patch({
                amountLocal: local,
                amountUSD: value.exchangeRate ? Math.round(local * value.exchangeRate * 100) / 100 : undefined,
              });
            }}
            onFocus={() => {
              setIsEditingValue(true);
              if (value.amountLocal && value.amountLocal > 0) {
                const raw = value.amountLocal.toString();
                const parts = raw.split('.');
                const intPart = parseInt(parts[0], 10);
                setEditingValueDisplay(intPart.toLocaleString() + (parts.length > 1 ? '.' + parts[1] : ''));
              } else {
                setEditingValueDisplay('');
              }
            }}
            onBlur={() => setIsEditingValue(false)}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel help="The currency the government has committed. The USD equivalent is auto-calculated from the value date's exchange rate." required>Currency</FieldLabel>
          <CurrencySelector
            value={value.currency || null}
            onValueChange={(v) => patch({ currency: v || undefined })}
            placeholder="Select currency"
          />
        </div>
      </div>

      {/* Row 2: Value Date | Exchange Rate (hidden in Annual mode — each year has its own) */}
      {!isAnnual && (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldLabel help="The date used to anchor the exchange rate for converting the value to USD. Usually the date the commitment was made.">Value Date</FieldLabel>
          <DatePicker
            value={value.valueDate || ''}
            onChange={(v) => patch({ valueDate: v })}
            placeholder="Select date"
            dropdownId={`contribution-financial-value-date-${value.id}`}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between min-h-[24px]">
            <FieldLabel help="Historical exchange rate from the value date, used to convert the amount to USD. Toggle Auto/Manual to enter your own rate.">Exchange Rate</FieldLabel>
            {value.currency && value.currency !== 'USD' && (
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-helper",
                  value.exchangeRateManual ? "text-orange-500 font-medium" : "text-muted-foreground"
                )}>
                  {value.exchangeRateManual ? 'Manual' : 'Auto'}
                </span>
                <Switch
                  checked={!value.exchangeRateManual}
                  onCheckedChange={(checked) => {
                    patch({ exchangeRateManual: !checked });
                    if (checked) fetchRate();
                  }}
                />
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              step="0.000001"
              value={value.currency === 'USD' ? 1 : (value.exchangeRate ?? '')}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                patch({ exchangeRate: isNaN(v) ? undefined : v });
              }}
              disabled={
                !value.currency ||
                value.currency === 'USD' ||
                !value.exchangeRateManual ||
                isLoadingRate
              }
              className={cn('h-10', (!value.exchangeRateManual || value.currency === 'USD') && 'bg-muted')}
              placeholder={isLoadingRate ? 'Loading...' : !value.currency ? 'Select currency' : 'Enter rate'}
            />
            {isLoadingRate && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {rateError && <p className="text-helper text-destructive">{rateError}</p>}
        </div>
      </div>
      )}

      {/* Row 3: USD Value (top-level). In Annual mode, this is the sum of per-year rows. */}
      <div className="space-y-2">
        <FieldLabel help="Value converted to USD using the value-date exchange rate. Computed automatically — no manual entry.">USD Value</FieldLabel>
        <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center font-medium text-foreground">
          {isAnnual ? (
            annualTotalUSD > 0
              ? <>$ {annualTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
              : <span className="text-muted-foreground font-normal text-body">
                  {!value.currency ? 'Select a currency' : 'Enter amounts in the annual breakdown below'}
                </span>
          ) : (
            computedUSD !== null
              ? <>$ {computedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
              : <span className="text-muted-foreground font-normal text-body">
                  {!value.currency ? 'Select a currency' : !value.exchangeRate ? 'Set value date for rate' : 'Enter amount'}
                </span>
          )}
        </div>
      </div>

      {/* Row 4: Description */}
      <div className="space-y-2">
        <FieldLabel help="Short label explaining what this contribution is for (e.g., which ministry, which budget line, or the purpose of the funding)." required>Description</FieldLabel>
        <Textarea
          placeholder="e.g., Counterpart cash funding from Ministry of Finance"
          value={value.description ?? ''}
          onChange={(e) => patch({ description: e.target.value })}
          rows={2}
          className="resize-y min-h-[40px]"
        />
      </div>

      <div className="space-y-2">
        <FieldLabel help="Lump Sum records a single total. Annual Breakdown splits it across years with per-year exchange rates.">Distribution Mode</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          {/* Lump Sum Card */}
          <button
            type="button"
            onClick={() => patch({ distributionMode: 'lump_sum' })}
            aria-pressed={(value.distributionMode || 'lump_sum') === 'lump_sum'}
            className={cn(
              "relative flex flex-col justify-end h-[180px] rounded-lg ring-1 ring-inset text-left p-3 transition-all overflow-hidden",
              (value.distributionMode || 'lump_sum') === 'lump_sum'
                ? "ring-border bg-primary/5"
                : "ring-border bg-background hover:bg-muted"
            )}
          >
            <Image
              src="/images/distribution-lump-sum.png"
              alt="Lump Sum"
              fill
              className="object-contain object-top p-3 opacity-70 mix-blend-multiply"
            />
            {(value.distributionMode || 'lump_sum') === 'lump_sum' && (
              <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="relative z-10">
              <h4 className="text-body font-semibold">Lump Sum</h4>
              <p className="mt-1 text-helper text-muted-foreground">
                Single total amount for the whole activity
              </p>
            </div>
          </button>

          {/* Annual Breakdown Card */}
          <button
            type="button"
            onClick={() => patch({ distributionMode: 'annual' })}
            aria-pressed={value.distributionMode === 'annual'}
            className={cn(
              "relative flex flex-col justify-end h-[180px] rounded-lg ring-1 ring-inset text-left p-3 transition-all overflow-hidden",
              value.distributionMode === 'annual'
                ? "ring-border bg-primary/5"
                : "ring-border bg-background hover:bg-muted"
            )}
          >
            <Image
              src="/images/distribution-annual.png"
              alt="Annual Breakdown"
              fill
              className="object-contain object-top p-3 opacity-70 mix-blend-multiply"
            />
            {value.distributionMode === 'annual' && (
              <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="relative z-10">
              <h4 className="text-body font-semibold flex items-center gap-1.5">
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                Annual Breakdown
              </h4>
              <p className="mt-1 text-helper text-muted-foreground">
                Split the total across individual years
              </p>
            </div>
          </button>
        </div>
      </div>

      {value.distributionMode === 'annual' && (
        <div className="p-3 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Annual Breakdown</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateYearRows}
                disabled={!effectiveStart || !effectiveEnd}
                className="gap-1.5"
              >
                <CalendarRange className="h-3.5 w-3.5" />
                Generate Years
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={distributeEvenly}
                disabled={!value.amountLocal || !(value.annual?.length)}
                className="gap-1.5"
              >
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                Distribute Evenly
              </Button>
            </div>
          </div>

          {/* Breakdown period + Fiscal year convention */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-helper font-medium text-muted-foreground">Breakdown start</Label>
              <DatePicker
                value={effectiveStart || ''}
                onChange={(v) => patch({ breakdownStart: v })}
                placeholder="Select start"
                dropdownId={`contribution-breakdown-start-${value.id}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-helper font-medium text-muted-foreground">Breakdown end</Label>
              <DatePicker
                value={effectiveEnd || ''}
                onChange={(v) => patch({ breakdownEnd: v })}
                placeholder="Select end"
                dropdownId={`contribution-breakdown-end-${value.id}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-helper font-medium text-muted-foreground">Fiscal year</Label>
              <CustomYearSelector
                customYears={customYears}
                selectedId={activeCustomYearId}
                onSelect={applyCustomYear}
                loading={customYearsLoading}
                className="h-10 w-full"
                placeholder="Calendar year"
              />
            </div>
          </div>

          <p className="text-helper text-muted-foreground -mt-1">
            Defaults to the activity's planned dates and calendar-year reporting. Change the fiscal year if the government books in a different FY, then click “Generate Years”. Existing amounts are preserved for years that stay in range.
          </p>

          {(value.annual?.length ?? 0) > 0 && (
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-body">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className="text-left p-2 font-medium text-helper w-28">Year</th>
                    <th className="text-left p-2 font-medium text-helper w-52">Value Date</th>
                    <th className="text-right p-2 font-medium text-helper w-36">
                      Amount {value.currency ? `(${value.currency})` : '(Local)'}
                    </th>
                    <th className="text-right p-2 font-medium text-helper w-24">Rate</th>
                    <th className="text-right p-2 font-medium text-helper w-36">USD Value</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(value.annual || []).map((row, idx) => {
                    const rowUSD = row.amountLocal && row.exchangeRate
                      ? Math.round(row.amountLocal * row.exchangeRate * 100) / 100
                      : row.amountUSD || 0;
                    return (
                      <tr key={idx}>
                        <td className="p-1.5 tabular-nums font-medium">{labelForYear(row.year)}</td>
                        <td className="p-1.5">
                          <DatePicker
                            value={row.valueDate || ''}
                            onChange={(v) => {
                              const next = [...(value.annual || [])];
                              next[idx] = {
                                ...row,
                                valueDate: v,
                                // Clear the rate so the auto-fetch effect re-fetches for the new date
                                ...(row.exchangeRateManual ? {} : { exchangeRate: undefined }),
                              };
                              patch({ annual: next });
                            }}
                            placeholder={`Jan 1, ${row.year}`}
                            dropdownId={`contribution-annual-date-${value.id}-${idx}`}
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={row.amountLocal ? row.amountLocal.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d.]/g, '');
                              const amt = parseFloat(raw) || 0;
                              const next = [...(value.annual || [])];
                              next[idx] = {
                                ...row,
                                amountLocal: amt,
                                amountUSD: row.exchangeRate ? Math.round(amt * row.exchangeRate * 100) / 100 : 0,
                              };
                              patch({ annual: next });
                            }}
                            className="h-7 text-right tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <Input
                            type="number"
                            step="0.000001"
                            placeholder={value.currency === 'USD' ? '1' : '—'}
                            value={value.currency === 'USD' ? 1 : (row.exchangeRate ?? '')}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              const next = [...(value.annual || [])];
                              const rate = isNaN(v) ? undefined : v;
                              next[idx] = {
                                ...row,
                                exchangeRate: rate,
                                exchangeRateManual: true,
                                amountUSD: rate && row.amountLocal
                                  ? Math.round(row.amountLocal * rate * 100) / 100
                                  : 0,
                              };
                              patch({ annual: next });
                            }}
                            disabled={!value.currency || value.currency === 'USD'}
                            className={cn(
                              'h-7 text-right tabular-nums',
                              (value.currency === 'USD' || !row.exchangeRateManual) && 'bg-muted/50'
                            )}
                          />
                        </td>
                        <td className="p-1.5 text-right tabular-nums text-foreground font-medium">
                          {rowUSD ? `$ ${rowUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="p-1.5">
                          <button
                            onClick={() => {
                              const next = (value.annual || []).filter((_, i) => i !== idx);
                              patch({ annual: next });
                            }}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-medium bg-muted/30">
                    <td className="p-2 text-helper" colSpan={4}>Total</td>
                    <td className="p-2 text-right tabular-nums text-foreground">
                      {annualTotalUSD > 0
                        ? `$ ${annualTotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const current = value.annual || [];
              const lastYear = current.length
                ? Math.max(...current.map(r => r.year))
                : new Date().getFullYear() - 1;
              const newYear = lastYear + 1;
              patch({
                annual: [
                  ...current,
                  {
                    year: newYear,
                    amountLocal: 0,
                    amountUSD: 0,
                    valueDate: fiscalYearStartDate(newYear, fyMonth),
                  },
                ],
              });
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Year
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel help="Which government budget line, ministry, or fund the money comes from. Auditors use this to trace the commitment back to an official source.">Source of Funding</FieldLabel>
        <Textarea
          placeholder="Specify the government budget line or funding source"
          value={value.sourceOfFunding ?? ''}
          onChange={(e) => patch({ sourceOfFunding: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}

// ─── Step 2b: In-Kind form ─────────────────────────────────────────────────

function InKindForm({
  value,
  onChange,
}: {
  value: InKindContribution;
  onChange: (next: InKindContribution) => void;
}) {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editingValueDisplay, setEditingValueDisplay] = useState('');
  const patch = (p: Partial<InKindContribution>) => onChange({ ...value, ...p });

  const categoryEntries = Object.entries(IN_KIND_CATEGORY_LABELS) as [InKindCategory, string][];
  const periodEntries: Array<['one_time' | 'annual', string]> = [
    ['one_time', 'One-time'],
    ['annual', 'Annual / recurring'],
  ];

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldLabel help="The kind of in-kind contribution: staff time, office space, land, equipment, utilities, services, or other." required>Category</FieldLabel>
          <Select
            value={value.category}
            onValueChange={(v) => patch({ category: v as InKindCategory })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categoryEntries.map(([v, l], i) => (
                <SelectItem key={v} value={v}>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{i + 1}</span>
                    {l}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <FieldLabel help="One-time means a single contribution delivered once. Annual / recurring means the same contribution is provided every year of the activity.">Period</FieldLabel>
          <Select
            value={value.period || 'one_time'}
            onValueChange={(v) => patch({ period: v as 'one_time' | 'annual' })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodEntries.map(([v, l], i) => (
                <SelectItem key={v} value={v}>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{i + 1}</span>
                    {l}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel help="Describe what is being contributed in kind, how many units, and any relevant details (e.g., 200 sqm of office space on the ground floor of the Ministry of Finance HQ)." required>Description</FieldLabel>
        <Textarea
          placeholder="e.g., Office space in the ministry HQ (200 sqm)"
          value={value.description ?? ''}
          onChange={(e) => patch({ description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldLabel help="Currency used for the estimated value (e.g., AUD, MMK). The USD equivalent will be calculated on save.">Currency</FieldLabel>
          <CurrencySelector
            value={value.currency || null}
            onValueChange={(v) => patch({ currency: v || undefined })}
            placeholder="Select currency"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel help="Estimated fair-market value of the in-kind contribution. Base the estimate on rental, salary, or procurement cost for an equivalent item. Record how you estimated it in the description.">Value</FieldLabel>
          <Input
            type="text"
            placeholder="0.00"
            value={isEditingValue
              ? editingValueDisplay
              : (value.estimatedValueLocal ? value.estimatedValueLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.]/g, '');
              const parts = raw.split('.');
              const intPart = parts[0] ? parseInt(parts[0], 10) : 0;
              const formatted = isNaN(intPart)
                ? ''
                : intPart.toLocaleString() + (parts.length > 1 ? '.' + parts[1] : '');
              setEditingValueDisplay(formatted);
              const num = parseFloat(raw);
              patch({ estimatedValueLocal: !isNaN(num) ? num : (raw === '' || raw === '.') ? undefined : value.estimatedValueLocal });
            }}
            onFocus={() => {
              setIsEditingValue(true);
              if (value.estimatedValueLocal && value.estimatedValueLocal > 0) {
                const raw = value.estimatedValueLocal.toString();
                const parts = raw.split('.');
                const intPart = parseInt(parts[0], 10);
                setEditingValueDisplay(intPart.toLocaleString() + (parts.length > 1 ? '.' + parts[1] : ''));
              } else {
                setEditingValueDisplay('');
              }
            }}
            onBlur={() => setIsEditingValue(false)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2c: Other form ───────────────────────────────────────────────────

function OtherForm({
  value,
  onChange,
}: {
  value: OtherContribution;
  onChange: (next: OtherContribution) => void;
}) {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editingValueDisplay, setEditingValueDisplay] = useState('');
  const patch = (p: Partial<OtherContribution>) => onChange({ ...value, ...p });

  const categoryEntries = Object.entries(OTHER_CATEGORY_LABELS) as [OtherCategory, string][];

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <FieldLabel help="The kind of other contribution: tax exemption, import duty waiver, fee waiver, policy concession, or other." required>Category</FieldLabel>
        <Select
          value={value.category}
          onValueChange={(v) => patch({ category: v as OtherCategory })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {categoryEntries.map(([v, l], i) => (
              <SelectItem key={v} value={v}>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{i + 1}</span>
                  {l}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <FieldLabel help="Describe what the government is contributing (e.g., duty waiver on imported equipment, exemption from VAT on services)." required>Description</FieldLabel>
        <Textarea
          placeholder="e.g., Import duty waiver on project equipment"
          value={value.description ?? ''}
          onChange={(e) => patch({ description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <FieldLabel help="Currency for the estimated fiscal value. Leave blank if the value can't be quantified.">Currency</FieldLabel>
          <CurrencySelector
            value={value.currency || null}
            onValueChange={(v) => patch({ currency: v || undefined })}
            placeholder="Select currency"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel help="Estimated fiscal value of the waiver or concession (e.g., amount of duty or tax forgone). Optional — leave blank if not quantifiable.">Value</FieldLabel>
          <Input
            type="text"
            placeholder="0.00"
            value={isEditingValue
              ? editingValueDisplay
              : (value.estimatedValueLocal ? value.estimatedValueLocal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d.]/g, '');
              const parts = raw.split('.');
              const intPart = parts[0] ? parseInt(parts[0], 10) : 0;
              const formatted = isNaN(intPart)
                ? ''
                : intPart.toLocaleString() + (parts.length > 1 ? '.' + parts[1] : '');
              setEditingValueDisplay(formatted);
              const num = parseFloat(raw);
              patch({ estimatedValueLocal: !isNaN(num) ? num : (raw === '' || raw === '.') ? undefined : value.estimatedValueLocal });
            }}
            onFocus={() => {
              setIsEditingValue(true);
              if (value.estimatedValueLocal && value.estimatedValueLocal > 0) {
                const raw = value.estimatedValueLocal.toString();
                const parts = raw.split('.');
                const intPart = parseInt(parts[0], 10);
                setEditingValueDisplay(intPart.toLocaleString() + (parts.length > 1 ? '.' + parts[1] : ''));
              } else {
                setEditingValueDisplay('');
              }
            }}
            onBlur={() => setIsEditingValue(false)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel help="Reference to the official government decree, circular, gazette notice, or decision that authorized this contribution. Used for audit and reporting.">Legal Reference</FieldLabel>
        <Input
          placeholder="e.g., MoF Circular 12/2026 / Gazette No. 48"
          value={value.legalReference ?? ''}
          onChange={(e) => patch({ legalReference: e.target.value })}
        />
      </div>
    </div>
  );
}
