/**
 * Program Logic service helpers: graph assembly, snapshot serialize/diff,
 * validation, and the edge "altitude" rules (attribution ceiling default,
 * same-tier/downward warnings, cross-scope reverse-rollup warning).
 *
 * Pure functions where possible so they are easy to unit-test and reuse from the
 * (future) UI. DB access is confined to fetchGraph / buildSnapshotPayload.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProgramLogicRow,
  ProgramLogicGraph,
  LogicTierRow,
  LogicNodeRow,
  LogicEdgeRow,
  LogicIndicatorLinkRow,
  SnapshotPayload,
  SnapshotDiff,
  ValidationReport,
  ValidationFinding,
  EdgeLinkType,
  NodeScope,
} from './types';

// ---------------------------------------------------------------------------
// Graph fetch
// ---------------------------------------------------------------------------

export interface GraphFilter {
  scope?: NodeScope;
  activityId?: string;
}

export async function fetchGraph(
  admin: SupabaseClient,
  logic: ProgramLogicRow,
  filter: GraphFilter = {}
): Promise<ProgramLogicGraph> {
  const [tiersRes, nodesRes, edgesRes] = await Promise.all([
    admin
      .from('logic_tiers')
      .select('*')
      .eq('program_logic_id', logic.id)
      .order('level_order', { ascending: true }),
    admin
      .from('logic_nodes')
      .select('*')
      .eq('program_logic_id', logic.id)
      .order('sort_order', { ascending: true }),
    admin.from('logic_edges').select('*').eq('program_logic_id', logic.id),
  ]);

  const tiers = (tiersRes.data as LogicTierRow[]) ?? [];
  const allNodes = (nodesRes.data as LogicNodeRow[]) ?? [];
  const allEdges = (edgesRes.data as LogicEdgeRow[]) ?? [];

  // Apply node filter
  let nodes = allNodes;
  if (filter.scope) nodes = nodes.filter((n) => n.scope === filter.scope);
  if (filter.activityId)
    nodes = nodes.filter((n) => n.activity_id === filter.activityId);

  // When filtering, keep edges that touch a visible node (so roll-up links into
  // the investment logic remain visible from an activity sub-logic view).
  const visibleIds = new Set(nodes.map((n) => n.id));
  const filtered = !!(filter.scope || filter.activityId);
  const edges = filtered
    ? allEdges.filter(
        (e) => visibleIds.has(e.from_node_id) || visibleIds.has(e.to_node_id)
      )
    : allEdges;

  // Indicator links for the visible nodes
  const nodeIds = nodes.map((n) => n.id);
  let indicator_links: LogicIndicatorLinkRow[] = [];
  if (nodeIds.length > 0) {
    const { data } = await admin
      .from('logic_indicator_links')
      .select('*')
      .in('node_id', nodeIds);
    indicator_links = (data as LogicIndicatorLinkRow[]) ?? [];
  }

  return { logic, tiers, nodes, edges, indicator_links };
}

export async function buildSnapshotPayload(
  admin: SupabaseClient,
  logicId: string
): Promise<SnapshotPayload> {
  const [tiers, nodes, edges, links] = await Promise.all([
    admin.from('logic_tiers').select('*').eq('program_logic_id', logicId),
    admin.from('logic_nodes').select('*').eq('program_logic_id', logicId),
    admin.from('logic_edges').select('*').eq('program_logic_id', logicId),
    admin
      .from('logic_indicator_links')
      .select('*, logic_nodes!inner(program_logic_id)')
      .eq('logic_nodes.program_logic_id', logicId),
  ]);
  return {
    tiers: (tiers.data as LogicTierRow[]) ?? [],
    nodes: (nodes.data as LogicNodeRow[]) ?? [],
    edges: (edges.data as LogicEdgeRow[]) ?? [],
    // strip the join helper column
    indicator_links: ((links.data as any[]) ?? []).map((l) => ({
      id: l.id,
      node_id: l.node_id,
      indicator_id: l.indicator_id,
      note: l.note,
      created_by: l.created_by,
      created_at: l.created_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// Tier / edge altitude rules
// ---------------------------------------------------------------------------

function tierOf(tiers: LogicTierRow[], tierId: string): LogicTierRow | undefined {
  return tiers.find((t) => t.id === tierId);
}

export function boundaryOrder(tiers: LogicTierRow[]): number | null {
  const b = tiers.find((t) => t.attribution_boundary);
  return b ? b.level_order : null;
}

export interface CeilingDecision {
  link_type: EdgeLinkType;
  crosses_ceiling: boolean;
  defaulted: boolean;
  explanation: string;
}

/**
 * Decide the link_type for a new edge given the tiers of its endpoints.
 * Crossing from at/below the attribution-boundary tier to a tier above it
 * defaults to 'contribution'. A caller-supplied link_type always wins (the rule
 * is a default with an explanation, never a hard block).
 */
export function decideLinkType(
  tiers: LogicTierRow[],
  fromTierId: string,
  toTierId: string,
  requested?: EdgeLinkType | null
): CeilingDecision {
  const from = tierOf(tiers, fromTierId);
  const to = tierOf(tiers, toTierId);
  const bo = boundaryOrder(tiers);
  const crosses =
    bo !== null &&
    !!from &&
    !!to &&
    from.level_order <= bo &&
    to.level_order > bo;

  if (requested) {
    let explanation = '';
    if (crosses && requested === 'attribution') {
      explanation =
        'This edge crosses the attribution ceiling; contribution is the recommended link type, but your explicit choice of attribution was kept.';
    }
    return {
      link_type: requested,
      crosses_ceiling: crosses,
      defaulted: false,
      explanation,
    };
  }

  // Default is always 'contribution' (the safe, schema default); the meaningful
  // signal is whether the edge crosses the ceiling, surfaced via crosses_ceiling.
  return {
    link_type: 'contribution',
    crosses_ceiling: crosses,
    defaulted: true,
    explanation: crosses
      ? 'Defaulted to contribution: this edge crosses above the attribution-boundary tier (the accountability ceiling).'
      : 'Defaulted to contribution.',
  };
}

/** Warning (non-blocking) if an edge runs same-tier or downward. */
export function levelWarning(
  tiers: LogicTierRow[],
  fromTierId: string,
  toTierId: string
): string | null {
  const from = tierOf(tiers, fromTierId);
  const to = tierOf(tiers, toTierId);
  if (!from || !to) return null;
  if (to.level_order < from.level_order)
    return `This edge runs downward (from "${from.name}" to the lower "${to.name}"). Roll-up normally flows toward higher tiers.`;
  if (to.level_order === from.level_order)
    return `This edge is same-tier (both "${from.name}"). Frameworks vary, but contribution normally flows up a tier.`;
  return null;
}

/** Warning (non-blocking) if an investment node tries to roll up into an activity node. */
export function crossScopeWarning(
  fromNode: LogicNodeRow,
  toNode: LogicNodeRow
): string | null {
  if (fromNode.scope === 'investment' && toNode.scope === 'activity')
    return 'This edge points from an investment-scoped node into an activity-scoped node. Roll-up normally flows activity → investment, not the reverse.';
  return null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateGraph(graph: ProgramLogicGraph): ValidationReport {
  const { tiers, nodes, edges } = graph;
  const findings: ValidationFinding[] = [];
  const tierById = new Map(tiers.map((t) => [t.id, t]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // --- Cycles (DFS over from -> to adjacency) ---
  const adj = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!adj.has(e.from_node_id)) adj.set(e.from_node_id, []);
    adj.get(e.from_node_id)!.push(e.to_node_id);
  });
  const WHITE = 0,
    GREY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const cycleNodes = new Set<string>();
  const visit = (u: string, stack: string[]) => {
    color.set(u, GREY);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v) ?? WHITE;
      if (c === GREY) {
        // back-edge: everything from v's first occurrence in the stack is a cycle
        const idx = stack.indexOf(v);
        if (idx >= 0) stack.slice(idx).forEach((id) => cycleNodes.add(id));
      } else if (c === WHITE) {
        visit(v, stack);
      }
    }
    stack.pop();
    color.set(u, BLACK);
  };
  nodes.forEach((n) => {
    if ((color.get(n.id) ?? WHITE) === WHITE) visit(n.id, []);
  });
  if (cycleNodes.size > 0) {
    findings.push({
      code: 'cycle',
      severity: 'error',
      message: `The graph contains a cycle involving ${cycleNodes.size} node(s). A program logic must stay acyclic.`,
      node_ids: Array.from(cycleNodes),
    });
  }

  // --- Orphan nodes (no edges in or out) ---
  const connected = new Set<string>();
  edges.forEach((e) => {
    connected.add(e.from_node_id);
    connected.add(e.to_node_id);
  });
  const orphans = nodes.filter((n) => !connected.has(n.id));
  if (orphans.length > 0) {
    findings.push({
      code: 'orphan_node',
      severity: 'warning',
      message: `${orphans.length} node(s) have no contribution edges in or out.`,
      node_ids: orphans.map((n) => n.id),
    });
  }

  // --- Same-tier / downward edges ---
  const badLevelEdges = edges.filter((e) => {
    const f = nodeById.get(e.from_node_id);
    const t = nodeById.get(e.to_node_id);
    if (!f || !t) return false;
    const ft = tierById.get(f.tier_id);
    const tt = tierById.get(t.tier_id);
    if (!ft || !tt) return false;
    return tt.level_order <= ft.level_order;
  });
  if (badLevelEdges.length > 0) {
    findings.push({
      code: 'same_tier_or_downward_edge',
      severity: 'warning',
      message: `${badLevelEdges.length} edge(s) run same-tier or downward. Frameworks vary, but roll-up normally flows up a tier.`,
      edge_ids: badLevelEdges.map((e) => e.id),
    });
  }

  // --- Cross-scope reverse roll-up (investment -> activity) ---
  const reverseEdges = edges.filter((e) => {
    const f = nodeById.get(e.from_node_id);
    const t = nodeById.get(e.to_node_id);
    return f?.scope === 'investment' && t?.scope === 'activity';
  });
  if (reverseEdges.length > 0) {
    findings.push({
      code: 'cross_scope_reverse_rollup',
      severity: 'warning',
      message: `${reverseEdges.length} edge(s) point from an investment node into an activity node. Roll-up normally flows activity → investment.`,
      edge_ids: reverseEdges.map((e) => e.id),
    });
  }

  // --- Nodes above the attribution ceiling reached only by attribution edges ---
  const bo = boundaryOrder(tiers);
  if (bo !== null) {
    const incoming = new Map<string, typeof edges>();
    edges.forEach((e) => {
      if (!incoming.has(e.to_node_id)) incoming.set(e.to_node_id, []);
      incoming.get(e.to_node_id)!.push(e);
    });
    const flagged: string[] = [];
    nodes.forEach((n) => {
      const tier = tierById.get(n.tier_id);
      if (!tier || tier.level_order <= bo) return; // not above ceiling
      const inc = incoming.get(n.id) ?? [];
      if (inc.length === 0) return; // orphan handled separately
      if (inc.every((e) => e.link_type === 'attribution')) flagged.push(n.id);
    });
    if (flagged.length > 0) {
      findings.push({
        code: 'attribution_only_above_ceiling',
        severity: 'warning',
        message: `${flagged.length} node(s) above the attribution ceiling are reached only by attribution edges; contribution is expected above the ceiling.`,
        node_ids: flagged,
      });
    }
  }

  return { ok: !findings.some((f) => f.severity === 'error'), findings };
}

// ---------------------------------------------------------------------------
// Snapshot diff
// ---------------------------------------------------------------------------

const NODE_FIELDS: (keyof LogicNodeRow)[] = [
  'statement',
  'description',
  'tier_id',
  'scope',
  'activity_id',
  'sort_order',
];
const EDGE_FIELDS: (keyof LogicEdgeRow)[] = [
  'from_node_id',
  'to_node_id',
  'link_type',
  'rationale',
];

export function diffSnapshots(
  from: { id: string; version_label: string; created_at: string; payload: SnapshotPayload },
  to: { id: string; version_label: string; created_at: string; payload: SnapshotPayload }
): SnapshotDiff {
  const fromNodes = new Map(from.payload.nodes.map((n) => [n.id, n]));
  const toNodes = new Map(to.payload.nodes.map((n) => [n.id, n]));
  const fromEdges = new Map(from.payload.edges.map((e) => [e.id, e]));
  const toEdges = new Map(to.payload.edges.map((e) => [e.id, e]));

  const nodesAdded = Array.from(toNodes.values())
    .filter((n) => !fromNodes.has(n.id))
    .map((n) => ({ id: n.id, statement: n.statement }));
  const nodesRemoved = Array.from(fromNodes.values())
    .filter((n) => !toNodes.has(n.id))
    .map((n) => ({ id: n.id, statement: n.statement }));
  const nodesChanged = Array.from(toNodes.values())
    .filter((n) => fromNodes.has(n.id))
    .map((n) => {
      const prev = fromNodes.get(n.id)!;
      const changes = NODE_FIELDS.filter((f) => prev[f] !== n[f]).map((f) => ({
        field: f as string,
        from: prev[f],
        to: n[f],
      }));
      return changes.length ? { id: n.id, statement: n.statement, changes } : null;
    })
    .filter(Boolean) as { id: string; statement: string; changes: any[] }[];

  const edgesAdded = Array.from(toEdges.values())
    .filter((e) => !fromEdges.has(e.id))
    .map((e) => ({ id: e.id, from_node_id: e.from_node_id, to_node_id: e.to_node_id }));
  const edgesRemoved = Array.from(fromEdges.values())
    .filter((e) => !toEdges.has(e.id))
    .map((e) => ({ id: e.id, from_node_id: e.from_node_id, to_node_id: e.to_node_id }));
  const edgesChanged = Array.from(toEdges.values())
    .filter((e) => fromEdges.has(e.id))
    .map((e) => {
      const prev = fromEdges.get(e.id)!;
      const changes = EDGE_FIELDS.filter((f) => prev[f] !== e[f]).map((f) => ({
        field: f as string,
        from: prev[f],
        to: e[f],
      }));
      return changes.length
        ? { id: e.id, from_node_id: e.from_node_id, to_node_id: e.to_node_id, changes }
        : null;
    })
    .filter(Boolean) as {
    id: string;
    from_node_id: string;
    to_node_id: string;
    changes: any[];
  }[];

  return {
    from: { id: from.id, version_label: from.version_label, created_at: from.created_at },
    to: { id: to.id, version_label: to.version_label, created_at: to.created_at },
    nodes: { added: nodesAdded, removed: nodesRemoved, changed: nodesChanged },
    edges: { added: edgesAdded, removed: edgesRemoved, changed: edgesChanged },
  };
}
