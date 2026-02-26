"use client"

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import type { ProjectBankSetting } from '@/types/project-bank';

export interface ComplianceResult {
  passed: boolean;
  enforcement: 'enforce' | 'warn' | 'off';
  message: string;
}

export function useComplianceRules() {
  const [settings, setSettings] = useState<ProjectBankSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiFetch('/api/project-bank-settings');
        if (res.ok) setSettings(await res.json());
      } catch {} finally { setLoading(false); }
    }
    fetch();
  }, []);

  const getSetting = useCallback((key: string): ProjectBankSetting | undefined => {
    return settings.find(s => s.key === key);
  }, [settings]);

  const validateMinimumSize = useCallback((costUSD: number | null, currency: string): ComplianceResult | null => {
    const rule = getSetting('minimum_project_size_mmk');
    if (!rule || rule.enforcement === 'off' || costUSD === null) return null;

    const thresholdMMK = rule.value?.amount || 2_000_000_000;
    // Approximate conversion: 1 USD ~ 2,100 MMK (for threshold comparison)
    const costInMMK = currency === 'MMK' ? costUSD : costUSD * 2100;

    if (costInMMK < thresholdMMK) {
      return {
        passed: false,
        enforcement: rule.enforcement as 'enforce' | 'warn',
        message: `Project cost (${currency === 'MMK' ? '' : '~'}MMK ${(costInMMK / 1e9).toFixed(1)}B) is below the minimum threshold of MMK ${(thresholdMMK / 1e9).toFixed(0)}B.`,
      };
    }
    return { passed: true, enforcement: rule.enforcement as 'enforce' | 'warn', message: '' };
  }, [getSetting]);

  const validateEquityRatio = useCallback((ratio: number | null, costUSD: number | null): ComplianceResult | null => {
    if (ratio === null || costUSD === null) return null;

    const isLarge = costUSD > 50_000_000;
    const ruleKey = isLarge ? 'equity_ratio_threshold_large' : 'equity_ratio_threshold_small';
    const rule = getSetting(ruleKey);
    if (!rule || rule.enforcement === 'off') return null;

    const threshold = rule.value?.percentage || (isLarge ? 20 : 30);

    if (ratio < threshold) {
      return {
        passed: false,
        enforcement: rule.enforcement as 'enforce' | 'warn',
        message: `Equity ratio ${ratio}% is below the required ${threshold}% for projects ${isLarge ? '> $50M' : '<= $50M'}.`,
      };
    }
    return { passed: true, enforcement: rule.enforcement as 'enforce' | 'warn', message: '' };
  }, [getSetting]);

  const validateCabinetApproval = useCallback((costUSD: number | null, hasCabinetDoc: boolean): ComplianceResult | null => {
    const rule = getSetting('cabinet_approval_threshold_usd');
    if (!rule || rule.enforcement === 'off' || costUSD === null) return null;

    const threshold = rule.value?.amount || 100_000_000;

    if (costUSD > threshold && !hasCabinetDoc) {
      return {
        passed: false,
        enforcement: rule.enforcement as 'enforce' | 'warn',
        message: `Projects exceeding $${(threshold / 1e6).toFixed(0)}M require a Cabinet Approval document before advancing to approved status.`,
      };
    }
    return { passed: true, enforcement: rule.enforcement as 'enforce' | 'warn', message: '' };
  }, [getSetting]);

  return {
    settings,
    loading,
    validateMinimumSize,
    validateEquityRatio,
    validateCabinetApproval,
  };
}
