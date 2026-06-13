/**
 * Shared helpers for the public, versioned read-only API (`/api/v1/public/*`).
 *
 * These endpoints are intentionally UNAUTHENTICATED and serve ONLY published,
 * non-deleted data. Every query that touches `activities` (directly or via a
 * child table) MUST go through {@link applyPublishedFilter} so we never leak a
 * draft, a soft-deleted record, or any of the sensitive fields enumerated below.
 *
 * The `Database` type in `@/lib/supabase` is stale for several tables (notably
 * `transactions`), so the mappers below read columns defensively (`?? null`)
 * rather than trusting compile-time shapes.
 */
import { NextResponse } from 'next/server';

/** Max page size a caller may request. Keeps a single response bounded. */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * The three predicates that define a "publicly safe" activity. Applied to a
 * Supabase query builder for the `activities` table. Mirrors the canonical
 * publish gate documented in the data-model audit:
 *   publication_status = 'published' AND deleted_at IS NULL AND submission_status != 'rejected'
 */
export function applyPublishedFilter<T extends { eq: Function; is: Function; or: Function }>(query: T): T {
  return query
    .eq('publication_status', 'published')
    .is('deleted_at', null)
    // NULL-safe: a plain `neq('rejected')` would drop rows where the column is
    // NULL (Postgres `<>` against NULL is not TRUE). Published activities often
    // have a NULL submission_status, so keep those and exclude only explicit
    // rejections.
    .or('submission_status.is.null,submission_status.neq.rejected') as T;
}

/** Parse & clamp pagination params from a URL search params object. */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/** Public projection of an organization (name/ref only, never contact PII). */
export interface PublicOrg {
  id: string;
  name: string | null;
  acronym: string | null;
  iatiOrgId: string | null;
}

export function mapPublicOrg(org: any): PublicOrg | null {
  if (!org) return null;
  return {
    id: org.id,
    name: org.name ?? null,
    acronym: org.acronym ?? null,
    iatiOrgId: org.iati_org_id ?? null,
  };
}

/**
 * Allow-list mapper for an activity row. Only fields safe for public
 * consumption are emitted. Deliberately omits: deleted_at, deleted_by,
 * last_edited_by, created_by, submission_status, search_vector, general_info,
 * internal JSON config, and any contact PII.
 */
export function mapPublicActivity(a: any, reportingOrg?: PublicOrg | null) {
  return {
    id: a.id,
    iatiIdentifier: a.iati_identifier ?? null,
    title: a.title_narrative ?? null,
    acronym: a.acronym ?? null,
    description: a.description_narrative ?? null,
    objectives: a.description_objectives ?? null,
    targetGroups: a.description_target_groups ?? null,
    activityStatus: a.activity_status ?? null,
    activityScope: a.activity_scope ?? null,
    collaborationType: a.collaboration_type ?? null,
    language: a.language ?? null,
    hierarchy: a.hierarchy ?? null,
    plannedStartDate: a.planned_start_date ?? null,
    plannedEndDate: a.planned_end_date ?? null,
    actualStartDate: a.actual_start_date ?? null,
    actualEndDate: a.actual_end_date ?? null,
    defaultCurrency: a.default_currency ?? null,
    defaultAidType: a.default_aid_type ?? null,
    defaultFinanceType: a.default_finance_type ?? null,
    defaultFlowType: a.default_flow_type ?? null,
    defaultTiedStatus: a.default_tied_status ?? null,
    isPooledFund: a.is_pooled_fund ?? null,
    reportingOrg: reportingOrg ?? null,
    createdAt: a.created_at ?? null,
    updatedAt: a.updated_at ?? null,
  };
}

/** Allow-list mapper for a sector allocation row. */
export function mapPublicSector(s: any) {
  return {
    code: s.sector_code ?? null,
    name: s.sector_name ?? null,
    percentage: s.sector_percentage ?? s.percentage ?? null,
    categoryCode: s.sector_category_code ?? s.category_code ?? null,
    categoryName: s.sector_category_name ?? s.category_name ?? null,
  };
}

/**
 * Allow-list mapper for a transaction row. Reads columns defensively because
 * the live `transactions` table is wider than the stale `Database` type and
 * its PK is `uuid` (not `id`). Emits org NAMES, never internal org UUIDs.
 */
export function mapPublicTransaction(t: any) {
  return {
    id: t.uuid ?? t.id ?? null,
    activityId: t.activity_id ?? null,
    type: t.transaction_type ?? null,
    date: t.transaction_date ?? null,
    value: t.value ?? null,
    currency: t.currency ?? null,
    valueUsd: t.value_usd ?? null,
    providerOrg: t.provider_org_name ?? t.provider_org ?? null,
    receiverOrg: t.receiver_org_name ?? t.receiver_org ?? null,
    aidType: t.aid_type ?? null,
    financeType: t.finance_type ?? null,
    flowType: t.flow_type ?? null,
    tiedStatus: t.tied_status ?? null,
    disbursementChannel: t.disbursement_channel ?? null,
    description: t.description ?? null,
  };
}

/**
 * Attach the standard public-API headers (CORS + edge cache) to a response.
 * Mirrors the existing `/api/iati/field-registry` convention.
 */
export function withPublicHeaders(response: NextResponse, maxAgeSeconds = 300) {
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`
  );
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

/** Standard JSON error helper for the public API. */
export function publicApiError(message: string, status = 500, details?: string) {
  return withPublicHeaders(
    NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status })
  );
}
