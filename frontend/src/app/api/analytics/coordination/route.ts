import { NextResponse, NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type {
  CoordinationLevel,
  CoordinationMeasure,
  CoordinationHierarchy,
  CoordinationParentNode,
  CoordinationTopDonor,
  CoordinationResponse,
} from '@/types/coordination';
import sectorGroupData from '@/data/SectorGroup.json';

export const dynamic = 'force-dynamic';

// IATI participating-org role codes. Only role 1 (Funding) is credited for
// the dollar value attached to an activity — implementers/accountable/etc.
// are still counted as participants for donor & activity counts but do not
// claim a share of the funder's commitment. This is the fix for activities
// where, e.g., UNFPA appears as an implementing partner and was previously
// diluted across every participating org regardless of role.
const ROLE_FUNDING = 1;
const ROLE_TYPE_TO_CODE: Record<string, number> = {
  funding: 1,
  funder: 1,
  accountable: 2,
  extending: 3,
  implementing: 4,
  implementer: 4,
  responsible: 4,
};

// Build sector lookups once at module load — small data (~200 rows),
// purely static. Lets us map 5-digit purpose code → 3-digit category →
// 3-digit group, in any direction, without re-walking the JSON.
type SectorRow = {
  code: string;
  name: string;
  'codeforiati:category-code': string;
  'codeforiati:category-name': string;
  'codeforiati:group-code': string;
  'codeforiati:group-name': string;
  status?: string;
};
const sectorRows = (sectorGroupData as { data: SectorRow[] }).data;

const categoryToGroup = new Map<string, { code: string; name: string }>();
const categoryNameByCode = new Map<string, string>();
const subSectorMeta = new Map<string, { categoryCode: string; categoryName: string; groupCode: string; groupName: string; name: string }>();
sectorRows.forEach((r) => {
  const catCode = r['codeforiati:category-code'];
  const catName = r['codeforiati:category-name'];
  const groupCode = r['codeforiati:group-code'];
  const groupName = r['codeforiati:group-name'];
  if (catCode && !categoryToGroup.has(catCode)) {
    categoryToGroup.set(catCode, { code: groupCode, name: groupName });
  }
  if (catCode && !categoryNameByCode.has(catCode)) {
    categoryNameByCode.set(catCode, catName);
  }
  if (r.code) {
    subSectorMeta.set(r.code, {
      categoryCode: catCode,
      categoryName: catName,
      groupCode,
      groupName,
      name: r.name,
    });
  }
});

const MEASURE_LABEL: Record<CoordinationMeasure, string> = {
  budgets: 'Total Budgets',
  planned: 'Planned Disbursements',
  tx_1: 'Incoming Funds',
  tx_2: 'Commitments',
  tx_3: 'Disbursements',
  tx_4: 'Expenditures',
  tx_5: 'Interest Payments',
  tx_6: 'Loan Repayments',
  tx_7: 'Reimbursements',
  tx_8: 'Purchases of Equity',
  tx_9: 'Sales of Equity',
  tx_10: 'Credit Guarantees',
  tx_11: 'Incoming Commitments',
  tx_12: 'Outgoing Pledges',
  tx_13: 'Incoming Pledges',
  activities: 'Number of Activities',
  donors: 'Number of Development Partners',
  avgSize: 'Average Activity Size (Disbursed)',
};

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function periodLabel(from: Date | null, to: Date | null): string | undefined {
  if (!from || !to) return undefined;
  const fy = from.getUTCFullYear();
  const ty = to.getUTCFullYear();
  return fy === ty ? `${fy}` : `${fy} – ${ty}`;
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

// Pro-rate a period-spanning amount across the requested date window by
// overlap days. Returns the portion of `value` that falls inside [winFrom, winTo].
function prorate(value: number, periodFrom: Date, periodTo: Date, winFrom: Date | null, winTo: Date | null): number {
  if (!winFrom || !winTo) return value;
  const from = periodFrom.getTime();
  const to = periodTo.getTime();
  const wf = winFrom.getTime();
  const wt = winTo.getTime();
  if (to < wf || from > wt) return 0;
  const overlapStart = Math.max(from, wf);
  const overlapEnd = Math.min(to, wt);
  const totalDays = Math.max(1, (to - from) / 86400000);
  const overlapDays = Math.max(0, (overlapEnd - overlapStart) / 86400000);
  return (value * overlapDays) / totalDays;
}

export async function GET(request: NextRequest) {
  const { supabase, response: authResponse } = await requireAuth();
  if (authResponse) return authResponse;
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const level = (searchParams.get('level') || 'category') as CoordinationLevel;
    const measure = (searchParams.get('measure') || 'tx_3') as CoordinationMeasure;
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const dateFrom = dateFromStr ? new Date(dateFromStr) : null;
    const dateTo = dateToStr ? new Date(dateToStr) : null;

    const aidTypeFilter = new Set(parseCsv(searchParams.get('aidType')));
    const financeTypeFilter = new Set(parseCsv(searchParams.get('financeType')));
    const donorFilter = new Set(parseCsv(searchParams.get('donor')));
    const sectorGroupFilter = new Set(parseCsv(searchParams.get('sectorGroups')));
    const sectorCategoryFilter = new Set(parseCsv(searchParams.get('sectorCategories')));
    const sectorSubFilter = new Set(parseCsv(searchParams.get('sectorSubSectors')));

    const hasSectorFilter = sectorGroupFilter.size + sectorCategoryFilter.size + sectorSubFilter.size > 0;
    const hasAidTypeFilter = aidTypeFilter.size > 0;
    const hasFinanceTypeFilter = financeTypeFilter.size > 0;
    const hasDonorFilter = donorFilter.size > 0;

    // Multi-measure support: when `measures` (comma-separated) is supplied, the
    // bubble size is the SUM of the selected financial metrics. Falls back to
    // the single `measure` param for back-compat (which also covers the count
    // measures activities / donors / avgSize). Only financial keys are summed.
    const isFinancialMeasure = (m: string) => m === 'budgets' || m === 'planned' || m.startsWith('tx_');
    const measuresParam = parseCsv(searchParams.get('measures')).filter(isFinancialMeasure);
    const multiMeasure = measuresParam.length > 0;
    const selectedMeasures = multiMeasure ? measuresParam : [measure];
    const primaryMeasure = (selectedMeasures[0] || measure) as CoordinationMeasure;
    const measuresLabel = multiMeasure && selectedMeasures.length > 1
      ? `${selectedMeasures.length} metrics`
      : (MEASURE_LABEL[primaryMeasure] || MEASURE_LABEL[measure]);

    // 1. Published activities + their defaults (for fallback aid/finance/flow type).
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, default_aid_type, default_finance_type, reporting_org_id')
      .eq('publication_status', 'published');

    if (activitiesError) {
      console.error('[coordination] activities query failed:', activitiesError);
      return NextResponse.json({ success: false, error: 'Failed to fetch activities' }, { status: 500 });
    }

    const activityIds = (activities || []).map((a: any) => a.id);
    const activityDefaults = new Map<string, { aid: string | null; finance: string | null; reportingOrg: string | null }>();
    (activities || []).forEach((a: any) => {
      activityDefaults.set(a.id, {
        aid: a.default_aid_type ?? null,
        finance: a.default_finance_type ?? null,
        reportingOrg: a.reporting_org_id ?? null,
      });
    });

    if (activityIds.length === 0) {
      const empty: CoordinationResponse = {
        success: true,
        level,
        measure: primaryMeasure,
        measureLabel: measuresLabel,
        periodLabel: periodLabel(dateFrom, dateTo),
        data: { name: 'Aid Distribution by Sector', children: [] },
        summary: {
          totalValue: 0,
          measureLabel: measuresLabel,
          categoryCount: 0,
          sectorCount: 0,
          subSectorCount: 0,
          organizationCount: 0,
          activityCount: 0,
        },
      };
      return NextResponse.json(empty);
    }

    // 2. Activity sectors with percentages.
    const { data: actSectors, error: sectorsError } = await supabase
      .from('activity_sectors')
      .select('activity_id, sector_code, sector_name, category_code, category_name, percentage')
      .in('activity_id', activityIds);
    if (sectorsError) {
      console.error('[coordination] activity_sectors query failed:', sectorsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch activity sectors' }, { status: 500 });
    }

    // 3. Participating orgs with roles.
    const { data: pOrgs, error: pOrgsError } = await supabase
      .from('activity_participating_organizations')
      .select('activity_id, organization_id, role_type, iati_role_code')
      .in('activity_id', activityIds);
    if (pOrgsError) {
      console.error('[coordination] participating orgs query failed:', pOrgsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch participating orgs' }, { status: 500 });
    }

    // 4. Organisation directory (id, name, acronym) for all participants and reporting orgs.
    const orgIds = new Set<string>();
    (pOrgs || []).forEach((p: any) => { if (p.organization_id) orgIds.add(p.organization_id); });
    activityDefaults.forEach((d) => { if (d.reportingOrg) orgIds.add(d.reportingOrg); });
    const orgMap = new Map<string, { name: string; acronym: string | null }>();
    if (orgIds.size > 0) {
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name, acronym')
        .in('id', Array.from(orgIds));
      (orgsData || []).forEach((o: any) => {
        orgMap.set(o.id, { name: o.name || 'Unknown Organisation', acronym: o.acronym || null });
      });
    }

    // 5. Build activity → { funders[], allParticipants[] }. Funder = role 1.
    //    Resolve role from iati_role_code first, fall back to role_type text.
    const activityFunders = new Map<string, string[]>();
    const activityParticipants = new Map<string, Set<string>>();
    (pOrgs || []).forEach((p: any) => {
      if (!p.organization_id) return;
      let role: number | null = null;
      if (typeof p.iati_role_code === 'number') role = p.iati_role_code;
      else if (typeof p.iati_role_code === 'string' && /^[0-9]+$/.test(p.iati_role_code)) role = parseInt(p.iati_role_code, 10);
      if (!role && p.role_type) role = ROLE_TYPE_TO_CODE[String(p.role_type).toLowerCase()] || null;
      if (!activityParticipants.has(p.activity_id)) activityParticipants.set(p.activity_id, new Set());
      activityParticipants.get(p.activity_id)!.add(p.organization_id);
      if (role === ROLE_FUNDING) {
        if (!activityFunders.has(p.activity_id)) activityFunders.set(p.activity_id, []);
        const arr = activityFunders.get(p.activity_id)!;
        if (!arr.includes(p.organization_id)) arr.push(p.organization_id);
      }
    });
    // Reporting org is the last-resort funder for activities with no explicit funding role.
    const fundersForActivity = (activityId: string): string[] => {
      const explicit = activityFunders.get(activityId);
      if (explicit && explicit.length > 0) return explicit;
      const reporting = activityDefaults.get(activityId)?.reportingOrg;
      return reporting ? [reporting] : [];
    };

    // 6. Compute activity-level value for the chosen measure, with date/aid/finance filters.
    //    Returns activity_id → financial value (USD-equivalent).
    const activityValue = new Map<string, number>();

    // Accumulate one financial measure's per-activity value into activityValue.
    // Called once per selected measure so multi-select sums them.
    const accumulateFinancial = async (m: string) => {
      if (m.startsWith('tx_')) {
        const code = m.slice(3);
        const { data: txs, error: txError } = await supabase
          .from('transactions')
          .select('activity_id, value, value_usd, transaction_date, transaction_type, aid_type, finance_type')
          .in('activity_id', activityIds)
          .eq('transaction_type', code);
        if (txError) {
          console.error('[coordination] transactions query failed:', txError);
          return;
        }
        (txs || []).forEach((t: any) => {
          const date = t.transaction_date ? new Date(t.transaction_date) : null;
          if (dateFrom && date && date < dateFrom) return;
          if (dateTo && date && date > dateTo) return;
          const defaults = activityDefaults.get(t.activity_id);
          const effAid = t.aid_type || defaults?.aid || null;
          const effFin = t.finance_type || defaults?.finance || null;
          if (hasAidTypeFilter && (!effAid || !aidTypeFilter.has(String(effAid)))) return;
          if (hasFinanceTypeFilter && (!effFin || !financeTypeFilter.has(String(effFin)))) return;
          const v = num(t.value_usd) || num(t.value);
          if (v <= 0) return;
          activityValue.set(t.activity_id, (activityValue.get(t.activity_id) || 0) + v);
        });
      } else if (m === 'budgets') {
        const { data: budgets, error: budgetsError } = await supabase
          .from('activity_budgets')
          .select('activity_id, value, usd_value, period_start, period_end')
          .in('activity_id', activityIds);
        if (budgetsError) {
          console.error('[coordination] activity_budgets query failed:', budgetsError);
        }
        (budgets || []).forEach((b: any) => {
          const defaults = activityDefaults.get(b.activity_id);
          if (hasAidTypeFilter && (!defaults?.aid || !aidTypeFilter.has(String(defaults.aid)))) return;
          if (hasFinanceTypeFilter && (!defaults?.finance || !financeTypeFilter.has(String(defaults.finance)))) return;
          const raw = num(b.usd_value) || num(b.value);
          if (raw <= 0) return;
          const ps = b.period_start ? new Date(b.period_start) : null;
          const pe = b.period_end ? new Date(b.period_end) : null;
          const portion = ps && pe ? prorate(raw, ps, pe, dateFrom, dateTo) : raw;
          if (portion <= 0) return;
          activityValue.set(b.activity_id, (activityValue.get(b.activity_id) || 0) + portion);
        });
      } else if (m === 'planned') {
        // planned_disbursements uses `amount` / `usd_amount` (not value / usd_value).
        const { data: pds, error: pdError } = await supabase
          .from('planned_disbursements')
          .select('activity_id, amount, usd_amount, period_start, period_end')
          .in('activity_id', activityIds);
        if (pdError) {
          console.error('[coordination] planned_disbursements query failed:', pdError);
        }
        (pds || []).forEach((pd: any) => {
          const defaults = activityDefaults.get(pd.activity_id);
          if (hasAidTypeFilter && (!defaults?.aid || !aidTypeFilter.has(String(defaults.aid)))) return;
          if (hasFinanceTypeFilter && (!defaults?.finance || !financeTypeFilter.has(String(defaults.finance)))) return;
          const raw = num(pd.usd_amount) || num(pd.amount);
          if (raw <= 0) return;
          const ps = pd.period_start ? new Date(pd.period_start) : null;
          const pe = pd.period_end ? new Date(pd.period_end) : null;
          const portion = ps && pe ? prorate(raw, ps, pe, dateFrom, dateTo) : raw;
          if (portion <= 0) return;
          activityValue.set(pd.activity_id, (activityValue.get(pd.activity_id) || 0) + portion);
        });
      }
    };

    if (measure === 'avgSize' && !multiMeasure) {
      // Use disbursements for the dollar component; the average is computed per bucket below.
      const { data: txs } = await supabase
        .from('transactions')
        .select('activity_id, value, value_usd, transaction_date, transaction_type, aid_type, finance_type')
        .in('activity_id', activityIds)
        .eq('transaction_type', '3');
      (txs || []).forEach((t: any) => {
        const date = t.transaction_date ? new Date(t.transaction_date) : null;
        if (dateFrom && date && date < dateFrom) return;
        if (dateTo && date && date > dateTo) return;
        const defaults = activityDefaults.get(t.activity_id);
        const effAid = t.aid_type || defaults?.aid || null;
        const effFin = t.finance_type || defaults?.finance || null;
        if (hasAidTypeFilter && (!effAid || !aidTypeFilter.has(String(effAid)))) return;
        if (hasFinanceTypeFilter && (!effFin || !financeTypeFilter.has(String(effFin)))) return;
        const v = num(t.value_usd) || num(t.value);
        if (v <= 0) return;
        activityValue.set(t.activity_id, (activityValue.get(t.activity_id) || 0) + v);
      });
    } else if (measure === 'activities' || measure === 'donors') {
      // Count measures don't need a dollar value per activity.
    } else {
      // Financial measure(s): sum each selected metric into activityValue.
      for (const m of selectedMeasures) {
        await accumulateFinancial(m);
      }
    }

    // 7. Apply donor filter — drop activities whose participants don't intersect the filter.
    const donorFilterList = Array.from(donorFilter);
    const passesDonorFilter = (activityId: string): boolean => {
      if (!hasDonorFilter) return true;
      const parts = activityParticipants.get(activityId);
      if (!parts) return false;
      for (let i = 0; i < donorFilterList.length; i++) {
        if (parts.has(donorFilterList[i])) return true;
      }
      return false;
    };

    // 8. Decide the bucket key/name/code for an activity_sectors row at the chosen level,
    //    and whether the row passes the sector filter.
    const bucketFor = (row: { sector_code: string | null; sector_name: string | null; category_code: string | null; category_name: string | null }): { key: string; code: string; name: string } | null => {
      const subCode = row.sector_code || '';
      const subMeta = subCode ? subSectorMeta.get(subCode) : undefined;
      const catCode = row.category_code || subMeta?.categoryCode || (subCode ? subCode.substring(0, 3) : '');
      const catName = row.category_name || subMeta?.categoryName || categoryNameByCode.get(catCode) || (catCode ? `Sector ${catCode}` : 'Unspecified');
      const groupInfo = catCode ? categoryToGroup.get(catCode) : undefined;
      const groupCode = groupInfo?.code || (subMeta?.groupCode ?? '');
      const groupName = groupInfo?.name || subMeta?.groupName || 'Unspecified';

      // Sector filter: a row passes if ANY of its hierarchy levels are explicitly in the filter,
      // OR if no filter is set at all.
      if (hasSectorFilter) {
        const matches =
          (sectorGroupFilter.size > 0 && groupCode && sectorGroupFilter.has(groupCode)) ||
          (sectorCategoryFilter.size > 0 && catCode && sectorCategoryFilter.has(catCode)) ||
          (sectorSubFilter.size > 0 && subCode && sectorSubFilter.has(subCode));
        if (!matches) return null;
      }

      if (level === 'subSector') {
        if (!subCode) return null;
        const name = row.sector_name || subMeta?.name || `Purpose ${subCode}`;
        return { key: subCode, code: subCode, name };
      }
      if (level === 'sector') {
        if (!catCode) return null;
        return { key: catCode, code: catCode, name: catName };
      }
      // 'category' (DAC group, e.g. 110 Education)
      if (!groupCode) return null;
      return { key: groupCode, code: groupCode, name: groupName };
    };

    // 9. Walk activity_sectors, allocating each activity's value across its sector rows.
    type BucketState = {
      code: string;
      name: string;
      value: number;
      activityIds: Set<string>;
      donorIds: Set<string>;
      // Funder org → attributed value, used both for Top Donors in the tooltip
      // and to size the inner partner bubbles in financial-measure views.
      donorValues: Map<string, number>;
      // Participating org → distinct activity ids in this bucket. Powers the
      // inner partner bubbles when a count-based measure is selected.
      donorActivityIds: Map<string, Set<string>>;
    };
    const buckets = new Map<string, BucketState>();
    const ensure = (key: string, code: string, name: string): BucketState => {
      let b = buckets.get(key);
      if (!b) {
        b = {
          code,
          name,
          value: 0,
          activityIds: new Set(),
          donorIds: new Set(),
          donorValues: new Map(),
          donorActivityIds: new Map(),
        };
        buckets.set(key, b);
      }
      return b;
    };

    (actSectors || []).forEach((row: any) => {
      if (!passesDonorFilter(row.activity_id)) return;
      const bucket = bucketFor(row);
      if (!bucket) return;
      const pct = num(row.percentage) || 0;
      const fraction = pct > 0 ? pct / 100 : 0;
      const actVal = activityValue.get(row.activity_id) || 0;
      const allocated = actVal * fraction;

      const b = ensure(bucket.key, bucket.code, bucket.name);
      b.activityIds.add(row.activity_id);
      const parts = activityParticipants.get(row.activity_id);
      if (parts) {
        parts.forEach((id) => {
          b.donorIds.add(id);
          if (!b.donorActivityIds.has(id)) b.donorActivityIds.set(id, new Set());
          b.donorActivityIds.get(id)!.add(row.activity_id);
        });
      }

      if (allocated > 0) {
        b.value += allocated;
        const funders = fundersForActivity(row.activity_id);
        if (funders.length > 0) {
          const each = allocated / funders.length;
          funders.forEach((fid) => {
            b.donorValues.set(fid, (b.donorValues.get(fid) || 0) + each);
          });
        }
      }
    });

    // 10. Resolve per-bucket display value based on measure, and build the inner
    //     "partner" bubbles users see inside each sector. For financial measures
    //     the inner bubbles are sized by attributed funder value (so non-funder
    //     participants don't pollute the view); for count measures they're sized
    //     by per-org activity count in this sector (so every participant shows).
    const isCountMeasure = !multiMeasure && (measure === 'activities' || measure === 'donors');

    const buildBubble = (state: BucketState): CoordinationParentNode => {
      const topDonorIds = Array.from(state.donorValues.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const topDonors: CoordinationTopDonor[] = topDonorIds.map(([id, v]) => {
        const meta = orgMap.get(id);
        return { id, name: meta?.name || 'Unknown Organisation', acronym: meta?.acronym ?? null, value: v };
      });

      let value = state.value;
      // Count/avg measures only apply in single-measure mode; multi-measure is
      // always a financial sum (state.value).
      if (!multiMeasure) {
        if (measure === 'activities') value = state.activityIds.size;
        else if (measure === 'donors') value = state.donorIds.size;
        else if (measure === 'avgSize') value = state.activityIds.size > 0 ? state.value / state.activityIds.size : 0;
      }

      // Build inner bubbles (the "partners shown as smaller circles" in the
      // dashboard description). Sized by funder attribution for financial
      // measures, or by per-org activity count for count measures. Capped at
      // 30 per sector so the pack stays readable; remaining partners stay
      // counted in donorCount and accessible via tooltip top-donors.
      const partnerEntries: Array<{ id: string; value: number; activityCount: number }> = [];
      if (isCountMeasure) {
        state.donorActivityIds.forEach((set, id) => {
          if (set.size > 0) partnerEntries.push({ id, value: set.size, activityCount: set.size });
        });
      } else {
        state.donorValues.forEach((v, id) => {
          if (v > 0) {
            const ac = state.donorActivityIds.get(id)?.size || 0;
            partnerEntries.push({ id, value: v, activityCount: ac });
          }
        });
      }
      partnerEntries.sort((a, b) => b.value - a.value);
      const children = partnerEntries.slice(0, 30).map((p) => {
        const meta = orgMap.get(p.id);
        const name = meta?.acronym ? `${meta.name} (${meta.acronym})` : (meta?.name || 'Unknown Organisation');
        return {
          id: p.id,
          name,
          value: p.value,
          activityCount: p.activityCount,
          donorCount: 1,
          topDonors: [] as CoordinationTopDonor[],
        };
      });

      return {
        id: state.code,
        name: state.name,
        code: state.code,
        value,
        totalValue: value,
        activityCount: state.activityIds.size,
        donorCount: state.donorIds.size,
        topDonors,
        children,
      };
    };

    const children: CoordinationParentNode[] = Array.from(buckets.values())
      .map(buildBubble)
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value);

    const allActivityIds = new Set<string>();
    const allDonorIds = new Set<string>();
    const uniqueCategoryCodes = new Set<string>();
    const uniqueSectorCodes = new Set<string>();
    const uniqueSubSectorCodes = new Set<string>();
    buckets.forEach((s) => {
      s.activityIds.forEach((id) => allActivityIds.add(id));
      s.donorIds.forEach((id) => allDonorIds.add(id));
    });
    (actSectors || []).forEach((row: any) => {
      const subCode: string | null = row.sector_code;
      const subMeta = subCode ? subSectorMeta.get(subCode) : undefined;
      const catCode = row.category_code || subMeta?.categoryCode;
      const groupInfo = catCode ? categoryToGroup.get(catCode) : undefined;
      if (groupInfo?.code) uniqueCategoryCodes.add(groupInfo.code);
      if (catCode) uniqueSectorCodes.add(catCode);
      if (subCode) uniqueSubSectorCodes.add(subCode);
    });

    const summaryTotal = children.reduce((sum, c) => sum + c.value, 0);

    const response: CoordinationResponse = {
      success: true,
      level,
      measure: primaryMeasure,
      measureLabel: measuresLabel,
      periodLabel: periodLabel(dateFrom, dateTo),
      data: { name: 'Aid Distribution by Sector', children },
      summary: {
        totalValue: summaryTotal,
        measureLabel: measuresLabel,
        categoryCount: uniqueCategoryCodes.size,
        sectorCount: uniqueSectorCodes.size,
        subSectorCount: uniqueSubSectorCodes.size,
        organizationCount: allDonorIds.size,
        activityCount: allActivityIds.size,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[coordination] unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
