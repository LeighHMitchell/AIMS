import { useEffect } from "react";

export interface YearDataRange {
  minYear: number;
  maxYear: number;
}

/**
 * Compute a chart's actual data-year range and default its year picker to it.
 *
 * Analytics charts default their year-range picker to the full span of years
 * that actually have data (min → max), rather than the dashboard's rolling
 * 5-year window or an empty selection. Pass the Gregorian (calendar) years
 * present in the chart's data; the hook returns the derived range (for the
 * picker's "Data" quick-select) and seeds `selectedYears` once — leaving any
 * later user selection untouched.
 *
 * @param dataYears  Gregorian calendar years present in the chart's data.
 * @param selectedYears  The current picker selection (controlled by the chart).
 * @param onYearsChange  Setter for the picker selection.
 */
export function useYearRangeDefault(
  dataYears: number[],
  selectedYears: number[],
  onYearsChange: (years: number[]) => void
): YearDataRange | null {
  let minYear = Infinity;
  let maxYear = -Infinity;
  for (const y of dataYears) {
    if (!Number.isFinite(y)) continue;
    if (y < minYear) minYear = y;
    if (y > maxYear) maxYear = y;
  }
  const hasData = minYear !== Infinity;
  const actualDataRange: YearDataRange | null = hasData ? { minYear, maxYear } : null;

  // Seed the selection with the data range the first time we know it. Once the
  // user has a selection we never override it.
  useEffect(() => {
    if (selectedYears.length === 0 && hasData) {
      onYearsChange([minYear, maxYear]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minYear, maxYear, hasData]);

  return actualDataRange;
}
