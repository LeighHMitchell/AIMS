/**
 * Outlier / distribution statistics — pure functions shared by the
 * analytics "Outliers" endpoint and (potentially) any client-side recompute.
 *
 * Money data in this app spans many orders of magnitude, so the default
 * scale for monetary distributions is logarithmic and the default fence is
 * the robust modified z-score (MAD), not standard deviation — financial data
 * is heavy-tailed and a plain z-score over-flags.
 */

export interface HistogramBin {
  /** Lower edge of the bin in the ORIGINAL units (e.g. USD), inclusive. */
  x0: number;
  /** Upper edge of the bin in the ORIGINAL units (e.g. USD), exclusive (inclusive on the last bin). */
  x1: number;
  /** Number of values that fell in this bin. */
  count: number;
  /** True when the bin lies entirely beyond a fence (flagged as outlier territory). */
  isOutlier: boolean;
}

export interface Fences {
  /** Lower fence in ORIGINAL units, or null when not applicable. */
  lower: number | null;
  /** Upper fence in ORIGINAL units, or null when not applicable. */
  upper: number | null;
  method: 'mad' | 'iqr' | 'ratio';
}

export interface DistributionSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
}

const SORT_ASC = (a: number, b: number) => a - b;

/** Quantile via linear interpolation. `sorted` must already be ascending. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
}

export function median(sorted: number[]): number {
  return quantile(sorted, 0.5);
}

export function summarize(values: number[]): DistributionSummary {
  if (values.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, p25: 0, p75: 0 };
  }
  const sorted = [...values].sort(SORT_ASC);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
    median: median(sorted),
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
  };
}

/**
 * Robust fences via the modified z-score (Iglewicz & Hoaglin).
 *   z_i = 0.6745 * (x_i - median) / MAD,   flag |z_i| > threshold (default 3.5)
 * Returns the fence VALUES in the same units as `values` (so the caller can
 * map them back to dollars after a log transform). When MAD is 0 (e.g. more
 * than half the values are identical) the fences are null — there is no spread
 * to flag against.
 */
export function madFences(values: number[], threshold = 3.5): Fences {
  if (values.length < 4) return { lower: null, upper: null, method: 'mad' };
  const sorted = [...values].sort(SORT_ASC);
  const med = median(sorted);
  const absDev = sorted.map((v) => Math.abs(v - med)).sort(SORT_ASC);
  const mad = median(absDev);
  if (mad === 0) return { lower: null, upper: null, method: 'mad' };
  const delta = (threshold * mad) / 0.6745;
  return { lower: med - delta, upper: med + delta, method: 'mad' };
}

/** Tukey IQR fences: [Q1 - k·IQR, Q3 + k·IQR], default k = 1.5. */
export function iqrFences(values: number[], k = 1.5): Fences {
  if (values.length < 4) return { lower: null, upper: null, method: 'iqr' };
  const sorted = [...values].sort(SORT_ASC);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return { lower: null, upper: null, method: 'iqr' };
  return { lower: q1 - k * iqr, upper: q3 + k * iqr, method: 'iqr' };
}

/**
 * Build an equal-width histogram over `values` in the chosen `space`.
 *  - 'linear': bins computed directly on the values.
 *  - 'log10':  bins computed on log10(value); ONLY positive values participate
 *              (callers should bucket non-positive values separately). Edges are
 *              mapped back to original units so x0/x1 are real dollar amounts.
 *
 * `fences` (in the SAME space as binning) are used only to mark which bins fall
 * entirely beyond a fence. Pass null to mark nothing.
 */
export function buildHistogram(
  values: number[],
  opts: {
    space: 'linear' | 'log10';
    nbins?: number;
    fencesInSpace?: { lower: number | null; upper: number | null } | null;
  }
): HistogramBin[] {
  const { space, nbins = 24, fencesInSpace = null } = opts;
  const xs = space === 'log10' ? values.filter((v) => v > 0).map((v) => Math.log10(v)) : values;
  if (xs.length === 0) return [];

  let min = Math.min(...xs);
  let max = Math.max(...xs);
  if (min === max) {
    // Degenerate: pad so we still emit a single visible bin.
    min -= 0.5;
    max += 0.5;
  }
  const width = (max - min) / nbins;

  const bins: HistogramBin[] = Array.from({ length: nbins }, (_, i) => {
    const e0 = min + i * width;
    const e1 = min + (i + 1) * width;
    return {
      x0: space === 'log10' ? Math.pow(10, e0) : e0,
      x1: space === 'log10' ? Math.pow(10, e1) : e1,
      count: 0,
      isOutlier:
        !!fencesInSpace &&
        ((fencesInSpace.upper != null && e0 >= fencesInSpace.upper) ||
          (fencesInSpace.lower != null && e1 <= fencesInSpace.lower)),
    };
  });

  for (const x of xs) {
    let idx = Math.floor((x - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= nbins) idx = nbins - 1; // include the max in the last bin
    bins[idx].count += 1;
  }
  return bins;
}

/** Map a fence value from log10 space back to original units (or pass through). */
export function fenceToOriginal(fence: Fences, space: 'linear' | 'log10'): Fences {
  if (space !== 'log10') return fence;
  return {
    method: fence.method,
    lower: fence.lower != null ? Math.pow(10, fence.lower) : null,
    upper: fence.upper != null ? Math.pow(10, fence.upper) : null,
  };
}
