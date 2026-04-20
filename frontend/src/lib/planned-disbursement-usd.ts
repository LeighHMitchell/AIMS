import { fixedCurrencyConverter, ConversionResult } from './currency-converter-fixed';

export interface PlannedDisbursementUsdFields {
  usd_amount: number | null;
  exchange_rate_used: number | null;
  usd_rate_source: string | null;
  usd_convertible: boolean;
  usd_conversion_date: string | null;
}

export function isFutureFxDate(valueDate: string | Date | null | undefined): boolean {
  if (!valueDate) return false;
  const d = typeof valueDate === 'string' ? new Date(valueDate) : valueDate;
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  return cmp.getTime() > today.getTime();
}

export function resolveFxDate(
  valueDate: string | Date | null | undefined,
  periodStart: string | Date | null | undefined
): string | null {
  const chosen = valueDate || periodStart;
  if (!chosen) return null;
  const d = typeof chosen === 'string' ? new Date(chosen) : chosen;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

const EXACT_SOURCES = new Set(['direct', 'cache', 'api', 'manual']);

export function isEstimatedSource(source: string | null | undefined): boolean {
  if (!source) return false;
  return !EXACT_SOURCES.has(source);
}

export async function computePlannedDisbursementUsd(params: {
  amount: number;
  currency: string;
  valueDate: string | Date | null | undefined;
  periodStart?: string | Date | null | undefined;
  manualRate?: { usd_amount: number; exchange_rate_used: number } | null;
}): Promise<PlannedDisbursementUsdFields> {
  const { amount, currency, valueDate, periodStart, manualRate } = params;
  const currencyCode = (currency || 'USD').toUpperCase();
  const effectiveDate = valueDate || periodStart || null;

  if (currencyCode === 'USD') {
    return {
      usd_amount: amount,
      exchange_rate_used: 1.0,
      usd_rate_source: 'direct',
      usd_convertible: true,
      usd_conversion_date: new Date().toISOString(),
    };
  }

  if (manualRate && manualRate.exchange_rate_used && manualRate.usd_amount != null) {
    return {
      usd_amount: manualRate.usd_amount,
      exchange_rate_used: manualRate.exchange_rate_used,
      usd_rate_source: 'manual',
      usd_convertible: true,
      usd_conversion_date: new Date().toISOString(),
    };
  }

  // Future-dated: don't guess. Leave blank; cron will backfill once date passes.
  if (isFutureFxDate(effectiveDate)) {
    return {
      usd_amount: null,
      exchange_rate_used: null,
      usd_rate_source: null,
      usd_convertible: true,
      usd_conversion_date: null,
    };
  }

  const conversionDate = new Date(effectiveDate || new Date());
  let result: ConversionResult;
  try {
    result = await fixedCurrencyConverter.convertToUSD(amount, currencyCode, conversionDate);
  } catch (error) {
    console.error('[planned-disbursement-usd] convertToUSD threw:', error);
    return {
      usd_amount: null,
      exchange_rate_used: null,
      usd_rate_source: null,
      usd_convertible: false,
      usd_conversion_date: null,
    };
  }

  if (result.success && result.usd_amount != null) {
    return {
      usd_amount: result.usd_amount,
      exchange_rate_used: result.exchange_rate,
      usd_rate_source: result.source ?? null,
      usd_convertible: true,
      usd_conversion_date: new Date().toISOString(),
    };
  }

  return {
    usd_amount: null,
    exchange_rate_used: null,
    usd_rate_source: null,
    usd_convertible: false,
    usd_conversion_date: null,
  };
}
