/**
 * EIRR/IRR Calculator utilities
 * Uses Newton-Raphson method with bisection fallback for IRR calculation
 */

/** Calculate Net Present Value given cash flows and discount rate */
export function calculateNPV(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
}

/** Calculate the derivative of NPV with respect to rate */
function calculateNPVDerivative(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((d, cf, t) => {
    if (t === 0) return d;
    return d - t * cf / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson with bisection fallback.
 * Returns the rate as a decimal (e.g. 0.15 = 15%).
 * Returns null if IRR cannot be determined.
 */
export function calculateIRR(cashFlows: number[], maxIterations: number = 100, tolerance: number = 1e-7): number | null {
  if (cashFlows.length < 2) return null;

  // Try Newton-Raphson first
  let rate = 0.1; // Initial guess 10%
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, rate);
    if (Math.abs(npv) < tolerance) return rate;

    const derivative = calculateNPVDerivative(cashFlows, rate);
    if (Math.abs(derivative) < 1e-12) break; // Avoid division by zero

    const newRate = rate - npv / derivative;
    if (Math.abs(newRate - rate) < tolerance) return newRate;
    rate = newRate;

    // Keep rate in reasonable bounds
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  // Fallback: bisection method
  let low = -0.99;
  let high = 10.0;
  let npvLow = calculateNPV(cashFlows, low);
  let npvHigh = calculateNPV(cashFlows, high);

  if (npvLow * npvHigh > 0) return null; // No sign change, no IRR in range

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = calculateNPV(cashFlows, mid);

    if (Math.abs(npvMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid;
    }

    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return null;
}

/** Calculate Benefit-Cost Ratio */
export function calculateBCR(benefits: number[], costs: number[], discountRate: number): number | null {
  const pvBenefits = benefits.reduce((sum, b, t) => sum + b / Math.pow(1 + discountRate, t), 0);
  const pvCosts = costs.reduce((sum, c, t) => sum + c / Math.pow(1 + discountRate, t), 0);
  if (pvCosts === 0) return null;
  return pvBenefits / pvCosts;
}

/**
 * Build net cash flows from cost and benefit streams, applying shadow pricing.
 */
export function buildCashFlows(
  costData: { year: number; amount: number }[],
  benefitData: { year: number; amount: number }[],
  shadowWageRate: number = 1,
  shadowExchangeRate: number = 1,
  standardConversionFactor: number = 1,
): number[] {
  const allYears = [...costData.map(c => c.year), ...benefitData.map(b => b.year)];
  if (allYears.length === 0) return [];

  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const flows: number[] = [];

  for (let y = minYear; y <= maxYear; y++) {
    const costEntry = costData.find(c => c.year === y);
    const benefitEntry = benefitData.find(b => b.year === y);

    // Apply shadow pricing to costs (economic cost = financial cost * SCF adjusted for labor/forex)
    const economicCost = (costEntry?.amount || 0) * standardConversionFactor;
    const economicBenefit = (benefitEntry?.amount || 0);

    flows.push(economicBenefit - economicCost);
  }

  return flows;
}

// ========================================================================
// Appraisal Wizard Calculator Functions
// ========================================================================

import type { CostTableRow, FIRRResult, EIRRResult, SensitivityResult, VGFResult } from '@/types/project-bank';

/**
 * Calculate Financial Internal Rate of Return from a cost table.
 * Net cash flow per year = Revenue - CAPEX - OPEX.
 */
export function calculateFIRR(costTable: CostTableRow[]): FIRRResult {
  if (!costTable || costTable.length === 0) {
    return { firr: null, npv_at_10: 0, payback_year: null, total_investment: 0, total_net_revenue: 0, cash_flows: [] };
  }

  const sorted = [...costTable].sort((a, b) => a.year - b.year);
  const cashFlows = sorted.map(row => (row.revenue || 0) - (row.capex || 0) - (row.opex || 0));

  const firr = calculateIRR(cashFlows);
  const npv_at_10 = calculateNPV(cashFlows, 0.10);

  const totalInvestment = sorted.reduce((sum, row) => sum + (row.capex || 0), 0);
  const totalNetRevenue = sorted.reduce((sum, row) => sum + (row.revenue || 0) - (row.opex || 0), 0);

  // Find payback year (first year cumulative cash flow turns positive)
  let cumulative = 0;
  let paybackYear: number | null = null;
  sorted.forEach((row, i) => {
    cumulative += cashFlows[i];
    if (cumulative >= 0 && paybackYear === null) {
      paybackYear = row.year;
    }
  });

  return {
    firr: firr !== null ? Math.round(firr * 10000) / 100 : null, // decimal→percentage, 2dp
    npv_at_10: Math.round(npv_at_10 * 100) / 100,
    payback_year: paybackYear,
    total_investment: totalInvestment,
    total_net_revenue: totalNetRevenue,
    cash_flows: cashFlows,
  };
}

interface EIRRCostItem {
  year: number;
  local_cost: number;
  imported_cost: number;
  labour_cost: number;
}

interface EIRRBenefitItem {
  year: number;
  amount: number;
}

interface ShadowPriceParams {
  standard_conversion_factor: number;
  shadow_exchange_rate: number;
  shadow_wage_rate: number;
  social_discount_rate: number;
}

/**
 * Calculate Economic Internal Rate of Return with full shadow pricing.
 * Costs are decomposed into local, imported, and labour components.
 */
export function calculateFullEIRR(
  costs: EIRRCostItem[],
  benefits: EIRRBenefitItem[],
  shadowPrices: ShadowPriceParams,
): EIRRResult {
  if (!costs.length && !benefits.length) {
    return { eirr: null, enpv: 0, bcr: null, economic_costs: [], economic_benefits: [] };
  }

  const allYears = [...costs.map(c => c.year), ...benefits.map(b => b.year)];
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);

  const economicCosts: number[] = [];
  const economicBenefits: number[] = [];
  const netFlows: number[] = [];

  for (let y = minYear; y <= maxYear; y++) {
    const costEntry = costs.find(c => c.year === y);
    const benefitEntry = benefits.find(b => b.year === y);

    const ecCost = costEntry
      ? (costEntry.local_cost * shadowPrices.standard_conversion_factor) +
        (costEntry.imported_cost * shadowPrices.shadow_exchange_rate) +
        (costEntry.labour_cost * shadowPrices.shadow_wage_rate)
      : 0;
    const ecBenefit = benefitEntry?.amount || 0;

    economicCosts.push(ecCost);
    economicBenefits.push(ecBenefit);
    netFlows.push(ecBenefit - ecCost);
  }

  const eirr = calculateIRR(netFlows);
  const discountRate = shadowPrices.social_discount_rate / 100;
  const enpv = calculateNPV(netFlows, discountRate);
  const bcr = calculateBCR(economicBenefits, economicCosts, discountRate);

  return {
    eirr: eirr !== null ? Math.round(eirr * 10000) / 100 : null,
    enpv: Math.round(enpv * 100) / 100,
    bcr: bcr !== null ? Math.round(bcr * 1000) / 1000 : null,
    economic_costs: economicCosts,
    economic_benefits: economicBenefits,
  };
}

interface SensitivityScenario {
  name: string;
  cost_multiplier: number;
  benefit_multiplier: number;
}

/**
 * Run sensitivity analysis across multiple scenarios.
 * Each scenario applies multipliers to base costs and benefits.
 */
export function runSensitivityAnalysis(
  baseCosts: EIRRCostItem[],
  baseBenefits: EIRRBenefitItem[],
  shadowPrices: ShadowPriceParams,
  scenarios?: SensitivityScenario[],
): SensitivityResult[] {
  const defaultScenarios: SensitivityScenario[] = [
    { name: 'Base Case', cost_multiplier: 1.0, benefit_multiplier: 1.0 },
    { name: 'Revenue −10%', cost_multiplier: 1.0, benefit_multiplier: 0.9 },
    { name: 'Revenue −20%', cost_multiplier: 1.0, benefit_multiplier: 0.8 },
    { name: 'Costs +10%', cost_multiplier: 1.1, benefit_multiplier: 1.0 },
    { name: 'Costs +20%', cost_multiplier: 1.2, benefit_multiplier: 1.0 },
    { name: 'Worst Case (Costs +20%, Revenue −20%)', cost_multiplier: 1.2, benefit_multiplier: 0.8 },
  ];

  const scenariosToRun = scenarios || defaultScenarios;

  return scenariosToRun.map(scenario => {
    const adjustedCosts = baseCosts.map(c => ({
      ...c,
      local_cost: c.local_cost * scenario.cost_multiplier,
      imported_cost: c.imported_cost * scenario.cost_multiplier,
      labour_cost: c.labour_cost * scenario.cost_multiplier,
    }));
    const adjustedBenefits = baseBenefits.map(b => ({
      ...b,
      amount: b.amount * scenario.benefit_multiplier,
    }));

    const result = calculateFullEIRR(adjustedCosts, adjustedBenefits, shadowPrices);
    return {
      scenario: scenario.name,
      firr_or_eirr: result.eirr,
      npv: result.enpv,
    };
  });
}

/**
 * Estimate Viability Gap Funding needed to bring FIRR to a target level.
 * Uses binary search to find the subsidy amount spread across construction years.
 */
export function estimateVGF(
  costTable: CostTableRow[],
  targetFIRR: number = 10,
  constructionYears: number = 3,
): VGFResult {
  if (!costTable || costTable.length === 0) {
    return { gap_amount: 0, vgf_as_pct_of_capex: 0 };
  }

  const totalCapex = costTable.reduce((sum, row) => sum + (row.capex || 0), 0);
  if (totalCapex === 0) return { gap_amount: 0, vgf_as_pct_of_capex: 0 };

  const targetRate = targetFIRR / 100;
  const sorted = [...costTable].sort((a, b) => a.year - b.year);
  const constructionCount = Math.min(constructionYears, sorted.length);

  // Check if project already meets target
  const baseFIRR = calculateFIRR(costTable);
  if (baseFIRR.firr !== null && baseFIRR.firr >= targetFIRR) {
    return { gap_amount: 0, vgf_as_pct_of_capex: 0 };
  }

  // Binary search for VGF amount
  let low = 0;
  let high = totalCapex * 2; // max subsidy = 200% of capex
  let bestVGF = 0;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const subsidyPerYear = mid / constructionCount;

    const adjustedTable = sorted.map((row, idx) => ({
      ...row,
      revenue: row.revenue + (idx < constructionCount ? subsidyPerYear : 0),
    }));

    const cashFlows = adjustedTable.map(row => (row.revenue || 0) - (row.capex || 0) - (row.opex || 0));
    const irr = calculateIRR(cashFlows);

    if (irr === null) {
      low = mid;
      continue;
    }

    if (irr >= targetRate) {
      bestVGF = mid;
      high = mid;
    } else {
      low = mid;
    }

    if (high - low < 100) break; // converged to within $100
  }

  return {
    gap_amount: Math.round(bestVGF),
    vgf_as_pct_of_capex: totalCapex > 0 ? Math.round((bestVGF / totalCapex) * 10000) / 100 : 0,
  };
}
