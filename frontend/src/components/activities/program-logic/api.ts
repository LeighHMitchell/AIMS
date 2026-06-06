/**
 * Thin client-side fetch helpers for the Program Logic API. Same-origin fetch
 * auto-includes the auth cookie. Each helper throws an Error carrying the
 * server's message so callers can surface it via toast.
 */
import type {
  ProgramLogicGraph,
  ProgramLogicRow,
  LogicTierRow,
  LogicNodeRow,
  LogicEdgeRow,
  LogicSnapshotRow,
  SnapshotDiff,
  ValidationReport,
  NodeScope,
  EdgeLinkType,
} from '@/lib/program-logic/types';
import type { FrameworkPreset, PresetTier } from '@/lib/program-logic/presets';

export interface InvestmentActivity {
  id: string;
  title: string;
  iati_identifier: string | null;
  activity_status: string | null;
  is_umbrella: boolean;
}

export interface IndicatorSearchResult {
  id: string;
  result_id: string;
  title: string;
  measure: string | null;
  ascending: boolean | null;
  reference_code: string | null;
  activity_id: string | null;
  result_type: string | null;
  result_title: string;
}

export interface LinkedIndicator {
  link: { id: string; node_id: string; indicator_id: string; note: string | null };
  indicator: { id: string; title: any; measure: string | null; ascending: boolean | null } | null;
  baseline: { baseline_year: number | null; iso_date: string | null; value: number | null } | null;
  periods: {
    period_start: string;
    period_end: string;
    target_value: number | null;
    actual_value: number | null;
  }[];
}

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err: any = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data as T;
}

const BASE = '/api/program-logics';

// --- logic lifecycle -------------------------------------------------------

export function getGraphForActivity(
  activityId: string
): Promise<{ logic: null } | ProgramLogicGraph> {
  return j(`${BASE}?activityId=${encodeURIComponent(activityId)}`);
}

export function getGraph(logicId: string): Promise<ProgramLogicGraph> {
  return j(`${BASE}/${logicId}`);
}

export function createLogic(body: {
  activityId: string;
  framework_preset: FrameworkPreset;
  title: string;
  description?: string;
  tiers?: PresetTier[];
}): Promise<{ logic: ProgramLogicRow; tiers: LogicTierRow[] }> {
  return j(BASE, { method: 'POST', body: JSON.stringify(body) });
}

export function updateLogic(
  logicId: string,
  body: Partial<{ title: string; description: string; status: string; framework_preset: string }>
): Promise<{ logic: ProgramLogicRow; warning?: string }> {
  return j(`${BASE}/${logicId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteLogic(logicId: string): Promise<{ success: boolean }> {
  return j(`${BASE}/${logicId}`, { method: 'DELETE' });
}

export function getInvestmentActivities(
  logicId: string
): Promise<{ activities: InvestmentActivity[] }> {
  return j(`${BASE}/${logicId}/activities`);
}

// --- tiers ------------------------------------------------------------------

export function createTier(
  logicId: string,
  body: Partial<PresetTier> & { name: string; short_code: string; level_order: number }
): Promise<{ tier: LogicTierRow }> {
  return j(`${BASE}/${logicId}/tiers`, { method: 'POST', body: JSON.stringify(body) });
}

export function updateTier(
  logicId: string,
  tierId: string,
  body: Partial<PresetTier>
): Promise<{ tier: LogicTierRow }> {
  return j(`${BASE}/${logicId}/tiers/${tierId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteTier(logicId: string, tierId: string): Promise<{ success: boolean }> {
  return j(`${BASE}/${logicId}/tiers/${tierId}`, { method: 'DELETE' });
}

// --- nodes ------------------------------------------------------------------

export function createNode(
  logicId: string,
  body: {
    tier_id: string;
    statement: string;
    scope?: NodeScope;
    activity_id?: string | null;
    description?: string | null;
    sort_order?: number;
  }
): Promise<{ node: LogicNodeRow; revision_recommended?: boolean }> {
  return j(`${BASE}/${logicId}/nodes`, { method: 'POST', body: JSON.stringify(body) });
}

export function updateNode(
  logicId: string,
  nodeId: string,
  body: Record<string, unknown>
): Promise<{ node: LogicNodeRow; snapshot?: unknown }> {
  return j(`${BASE}/${logicId}/nodes/${nodeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteNode(
  logicId: string,
  nodeId: string,
  revisionReason?: string
): Promise<{ success: boolean }> {
  return j(`${BASE}/${logicId}/nodes/${nodeId}`, {
    method: 'DELETE',
    body: JSON.stringify(revisionReason ? { revision_reason: revisionReason } : {}),
  });
}

export function getRollup(
  logicId: string,
  nodeId: string
): Promise<{ target_node_id: string; contributors: LogicNodeRow[]; activity_contributors: LogicNodeRow[] }> {
  return j(`${BASE}/${logicId}/nodes/${nodeId}/rollup`);
}

// --- edges ------------------------------------------------------------------

export interface EdgeCreateResult {
  edge: LogicEdgeRow;
  link_type_decision: {
    link_type: EdgeLinkType;
    crosses_ceiling: boolean;
    defaulted: boolean;
    explanation: string;
  };
  warnings: string[];
}

export function createEdge(
  logicId: string,
  body: { from_node_id: string; to_node_id: string; link_type?: EdgeLinkType; rationale?: string }
): Promise<EdgeCreateResult> {
  return j(`${BASE}/${logicId}/edges`, { method: 'POST', body: JSON.stringify(body) });
}

export function updateEdge(
  logicId: string,
  edgeId: string,
  body: { link_type?: EdgeLinkType; rationale?: string | null }
): Promise<{ edge: LogicEdgeRow }> {
  return j(`${BASE}/${logicId}/edges/${edgeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteEdge(logicId: string, edgeId: string): Promise<{ success: boolean }> {
  return j(`${BASE}/${logicId}/edges/${edgeId}`, { method: 'DELETE' });
}

// --- indicators -------------------------------------------------------------

export function searchIndicators(
  logicId: string,
  q: string,
  activityId?: string
): Promise<{ indicators: IndicatorSearchResult[] }> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (activityId) params.set('activity', activityId);
  return j(`${BASE}/${logicId}/indicators/search?${params.toString()}`);
}

export function getNodeIndicators(
  logicId: string,
  nodeId: string
): Promise<{ links: LinkedIndicator[] }> {
  return j(`${BASE}/${logicId}/nodes/${nodeId}/indicators`);
}

export function linkIndicator(
  logicId: string,
  nodeId: string,
  indicatorId: string,
  note?: string
): Promise<{ link: unknown }> {
  return j(`${BASE}/${logicId}/nodes/${nodeId}/indicators`, {
    method: 'POST',
    body: JSON.stringify({ indicator_id: indicatorId, note }),
  });
}

export function unlinkIndicator(
  logicId: string,
  nodeId: string,
  linkId: string
): Promise<{ success: boolean }> {
  return j(`${BASE}/${logicId}/nodes/${nodeId}/indicators/${linkId}`, {
    method: 'DELETE',
  });
}

// --- snapshots + validation -------------------------------------------------

export function listSnapshots(logicId: string): Promise<{ snapshots: LogicSnapshotRow[] }> {
  return j(`${BASE}/${logicId}/snapshots`);
}

export function createSnapshot(
  logicId: string,
  body: { snapshot_type: 'baseline' | 'revision'; version_label?: string; reason?: string }
): Promise<{ snapshot: LogicSnapshotRow; logic?: ProgramLogicRow }> {
  return j(`${BASE}/${logicId}/snapshots`, { method: 'POST', body: JSON.stringify(body) });
}

export function diffSnapshots(
  logicId: string,
  from: string,
  to: string
): Promise<SnapshotDiff> {
  return j(`${BASE}/${logicId}/snapshots/diff?from=${from}&to=${to}`);
}

export function validate(logicId: string): Promise<ValidationReport> {
  return j(`${BASE}/${logicId}/validate`);
}
