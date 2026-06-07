/**
 * Config-driven Data Clinic entity tables.
 *
 * Each entry describes a child entity that the Data Clinic surfaces as its own
 * tab: which table to read, how to join the parent activity (for the title and
 * recycle-bin filtering), which columns to display, which count as a "data gap"
 * (so a row is only shown when at least one is missing), and which are editable.
 *
 * The API route uses this to query + flatten rows; the generic client component
 * renders whatever columns the route returns. Keep this module server-only
 * friendly (no JSX).
 */
import { getGeographicLocationReachName } from '@/data/iati-geographic-location-reach'
import { getGeographicExactnessName } from '@/data/iati-geographic-exactness'
import { getGeographicLocationClassName } from '@/data/iati-geographic-location-class'
import { getSectorVocabularyName } from '@/data/iati-sector-vocabulary'

export type ClinicColumnType = 'text' | 'code' | 'date' | 'money' | 'percent' | 'org'

export interface ClinicSelectOption {
  value: string
  label: string
}

export interface ClinicColumn {
  /** key in the flattened row object */
  key: string
  label: string
  type?: ClinicColumnType
  /** counts toward gap detection — an empty value here flags the row */
  gap?: boolean
  /** for money columns: the row key holding the 3-letter currency code */
  currencyKey?: string
  /** editable inline — the key must be a real column on the table */
  editable?: boolean
  editor?: 'select' | 'number' | 'text'
  options?: ClinicSelectOption[]
  /** for 'org' columns: the DB columns holding the linked org id + free-text name */
  orgIdField?: string
  orgNameField?: string
}

export interface ClinicEntityConfig {
  slug: string
  label: string
  table: string
  /** does the child table have its own deleted_at column? */
  hasOwnDeletedAt: boolean
  /** supabase select string (must inner-join activities for title + deleted_at) */
  select: string
  columns: ClinicColumn[]
  /** flatten a raw (possibly nested) row into { _id, _activity, ...colValues } */
  mapRow: (row: any) => Record<string, any>
  /** optional async pass to add human-readable `${key}_name` fields from the DB */
  enrich?: (rows: Record<string, any>[], supabase: any) => Promise<void>
}

const ACTIVITY_JOIN = 'activities!activity_id!inner ( title_narrative, deleted_at )'
const activityTitle = (row: any) => row.activities?.title_narrative || 'Unknown Activity'

// IATI PolicySignificance codelist
const SIGNIFICANCE_LABELS: Record<string, string> = {
  '0': 'Not targeted',
  '1': 'Significant objective',
  '2': 'Principal objective',
  '3': 'Principal objective AND in support of an action programme',
  '4': 'Explicit primary objective',
}

// IATI BudgetType codelist (reused for planned-disbursement type)
const PD_TYPE_OPTIONS: ClinicSelectOption[] = [
  { value: '1', label: 'Original' },
  { value: '2', label: 'Revised' },
]
const PD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PD_TYPE_OPTIONS.map((o) => [o.value, o.label])
)

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export const CLINIC_ENTITIES: Record<string, ClinicEntityConfig> = {
  'planned-disbursements': {
    slug: 'planned-disbursements',
    label: 'Planned Disbursements',
    table: 'planned_disbursements',
    hasOwnDeletedAt: true,
    select: `id, type, period_start, period_end, amount, currency, usd_amount, provider_org_id, provider_org_name, receiver_org_id, receiver_org_name, status, value_date, ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'type', label: 'Type', type: 'code', gap: true, editable: true, editor: 'select', options: PD_TYPE_OPTIONS },
      { key: 'period_start', label: 'Period Start', type: 'date', gap: true },
      { key: 'period_end', label: 'Period End', type: 'date', gap: true },
      { key: 'amount', label: 'Amount', type: 'money', currencyKey: 'currency', gap: true },
      { key: 'usd_amount', label: 'USD Value', type: 'money', currencyKey: 'usd_currency', gap: true },
      { key: 'provider', label: 'Provider', type: 'org', gap: true, orgIdField: 'provider_org_id', orgNameField: 'provider_org_name' },
      { key: 'receiver', label: 'Receiver', type: 'org', gap: true, orgIdField: 'receiver_org_id', orgNameField: 'receiver_org_name' },
      { key: 'status', label: 'Status', type: 'text' },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      type: r.type,
      type_name: PD_TYPE_LABELS[String(r.type)] || '',
      period_start: r.period_start,
      period_end: r.period_end,
      amount: r.amount,
      currency: r.currency,
      usd_amount: r.usd_amount,
      usd_currency: 'USD',
      provider: r.provider_org_name || null,
      provider_id: r.provider_org_id || null,
      receiver: r.receiver_org_name || null,
      receiver_id: r.receiver_org_id || null,
      status: r.status,
    }),
  },

  people: {
    slug: 'people',
    label: 'People',
    table: 'activity_contacts',
    hasOwnDeletedAt: true,
    select: `id, type, first_name, last_name, position, organisation, email, phone, role, ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'type', label: 'Type', type: 'text', gap: true },
      { key: 'first_name', label: 'First Name', type: 'text', gap: true },
      { key: 'last_name', label: 'Last Name', type: 'text', gap: true },
      { key: 'position', label: 'Position', type: 'text', gap: true },
      { key: 'organisation', label: 'Organisation', type: 'text', gap: true },
      { key: 'email', label: 'Email', type: 'text', gap: true },
      { key: 'phone', label: 'Phone', type: 'text' },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      type: r.type,
      first_name: r.first_name,
      last_name: r.last_name,
      position: r.position,
      organisation: r.organisation,
      email: r.email,
      phone: r.phone,
    }),
  },

  sdg: {
    slug: 'sdg',
    label: 'SDGs',
    table: 'activity_sdg_mappings',
    hasOwnDeletedAt: false,
    select: `id, sdg_goal, sdg_target, contribution_percent, alignment_strength, ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'sdg_goal', label: 'SDG Goal', type: 'code', gap: true },
      { key: 'sdg_target', label: 'SDG Target', type: 'code', gap: true },
      { key: 'contribution_percent', label: 'Contribution %', type: 'percent', gap: true },
      { key: 'alignment_strength', label: 'Alignment', type: 'text' },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      sdg_goal: r.sdg_goal != null ? String(r.sdg_goal) : null,
      sdg_target: r.sdg_target,
      contribution_percent: r.contribution_percent,
      alignment_strength: cap(r.alignment_strength),
    }),
    enrich: async (rows, supabase) => {
      const { data: goals } = await supabase.from('sdg_goals').select('id, goal_name')
      const { data: targets } = await supabase.from('sdg_targets').select('id, target_text')
      const goalName = new Map<string, string>((goals || []).map((g: any) => [String(g.id), g.goal_name]))
      const targetName = new Map<string, string>((targets || []).map((t: any) => [String(t.id), t.target_text]))
      for (const row of rows) {
        if (row.sdg_goal) row.sdg_goal_name = goalName.get(String(row.sdg_goal)) || ''
        if (row.sdg_target) row.sdg_target_name = targetName.get(String(row.sdg_target)) || ''
      }
    },
  },

  sectors: {
    slug: 'sectors',
    label: 'Sectors',
    table: 'activity_sectors',
    hasOwnDeletedAt: true,
    select: `id, sector_code, sector_name, category_code, category_name, percentage, sector_vocabulary, level, ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'sector_code', label: 'Sector Code', type: 'code', gap: true },
      { key: 'sector_name', label: 'Sector Name', type: 'text', gap: true },
      { key: 'category_code', label: 'Category', type: 'code', gap: true },
      { key: 'percentage', label: 'Percentage', type: 'percent', gap: true },
      { key: 'sector_vocabulary', label: 'Vocabulary', type: 'code', gap: true },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      sector_code: r.sector_code,
      sector_name: r.sector_name,
      category_code: r.category_code,
      category_code_name: r.category_name || '',
      percentage: r.percentage,
      sector_vocabulary: r.sector_vocabulary != null ? String(r.sector_vocabulary) : null,
      sector_vocabulary_name: getSectorVocabularyName(r.sector_vocabulary != null ? String(r.sector_vocabulary) : undefined),
    }),
  },

  locations: {
    slug: 'locations',
    label: 'Locations',
    table: 'activity_locations',
    hasOwnDeletedAt: true,
    select: `id, location_name, location_type, latitude, longitude, location_reach, exactness, location_class, feature_designation, percentage_allocation, ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'location_name', label: 'Name', type: 'text', gap: true },
      { key: 'location_type', label: 'Type', type: 'text' },
      { key: 'latitude', label: 'Latitude', type: 'text', gap: true, editable: true, editor: 'number' },
      { key: 'longitude', label: 'Longitude', type: 'text', gap: true, editable: true, editor: 'number' },
      { key: 'location_reach', label: 'Reach', type: 'code', gap: true },
      { key: 'exactness', label: 'Exactness', type: 'code', gap: true },
      { key: 'location_class', label: 'Class', type: 'code', gap: true },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      location_name: r.location_name,
      location_type: r.location_type,
      latitude: r.latitude,
      longitude: r.longitude,
      location_reach: r.location_reach != null ? String(r.location_reach) : null,
      location_reach_name: getGeographicLocationReachName(r.location_reach != null ? String(r.location_reach) : undefined),
      exactness: r.exactness != null ? String(r.exactness) : null,
      exactness_name: getGeographicExactnessName(r.exactness != null ? String(r.exactness) : undefined),
      location_class: r.location_class != null ? String(r.location_class) : null,
      location_class_name: getGeographicLocationClassName(r.location_class != null ? String(r.location_class) : undefined),
    }),
  },

  'policy-markers': {
    slug: 'policy-markers',
    label: 'Policy Markers',
    table: 'activity_policy_markers',
    hasOwnDeletedAt: true,
    select: `id, significance, rationale, policy_markers ( name, code ), ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'marker', label: 'Policy Marker', type: 'text' },
      { key: 'code', label: 'Code', type: 'code' },
      { key: 'significance', label: 'Significance', type: 'code', gap: true },
      { key: 'rationale', label: 'Rationale', type: 'text', gap: true },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      marker: r.policy_markers?.name,
      code: r.policy_markers?.code,
      significance: r.significance != null ? String(r.significance) : null,
      significance_name: SIGNIFICANCE_LABELS[String(r.significance)] || '',
      rationale: r.rationale,
    }),
  },

  tags: {
    slug: 'tags',
    label: 'Tags',
    table: 'activity_tags',
    hasOwnDeletedAt: true,
    select: `id, tags ( name, code, vocabulary ), ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'name', label: 'Tag', type: 'text' },
      { key: 'code', label: 'Code', type: 'code', gap: true },
      { key: 'vocabulary', label: 'Vocabulary', type: 'code', gap: true },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      name: r.tags?.name,
      code: r.tags?.code,
      vocabulary: r.tags?.vocabulary,
    }),
  },

  'working-groups': {
    slug: 'working-groups',
    label: 'Working Groups',
    table: 'activity_working_groups',
    hasOwnDeletedAt: false,
    select: `id, vocabulary, working_groups ( label, code ), ${ACTIVITY_JOIN}`,
    columns: [
      { key: 'group', label: 'Working Group', type: 'text' },
      { key: 'code', label: 'Code', type: 'code' },
      { key: 'vocabulary', label: 'Vocabulary', type: 'code', gap: true },
    ],
    mapRow: (r) => ({
      _id: r.id,
      _activity: activityTitle(r),
      group: r.working_groups?.label,
      code: r.working_groups?.code,
      vocabulary: r.vocabulary,
    }),
  },
}

/** Public column shape returned to the client. */
export function publicColumns(cfg: ClinicEntityConfig): ClinicColumn[] {
  return cfg.columns
}
