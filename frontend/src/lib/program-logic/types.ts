/**
 * Shared types for the Program Logic feature (rows + composed graph + validation).
 */
import type { FrameworkPreset, IatiResultType } from './presets';

export type ProgramLogicStatus = 'draft' | 'baselined' | 'active' | 'closed';
export type NodeScope = 'investment' | 'activity';
export type EdgeLinkType = 'attribution' | 'contribution';
export type SnapshotType = 'baseline' | 'revision';

export interface ProgramLogicRow {
  id: string;
  investment_id: string;
  framework_preset: FrameworkPreset;
  title: string;
  description: string | null;
  status: ProgramLogicStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogicTierRow {
  id: string;
  program_logic_id: string;
  name: string;
  short_code: string;
  level_order: number;
  iati_result_type: IatiResultType;
  attribution_boundary: boolean;
  created_at: string;
}

export interface LogicNodeRow {
  id: string;
  program_logic_id: string;
  tier_id: string;
  scope: NodeScope;
  activity_id: string | null;
  statement: string;
  description: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogicEdgeRow {
  id: string;
  program_logic_id: string;
  from_node_id: string;
  to_node_id: string;
  link_type: EdgeLinkType;
  rationale: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LogicIndicatorLinkRow {
  id: string;
  node_id: string;
  indicator_id: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LogicSnapshotRow {
  id: string;
  program_logic_id: string;
  version_label: string;
  snapshot_type: SnapshotType;
  reason: string | null;
  payload: SnapshotPayload;
  created_by: string | null;
  created_at: string;
}

/** Serialized full graph stored in logic_snapshots.payload. */
export interface SnapshotPayload {
  tiers: LogicTierRow[];
  nodes: LogicNodeRow[];
  edges: LogicEdgeRow[];
  indicator_links: LogicIndicatorLinkRow[];
}

/** The full graph returned by the graph endpoint. */
export interface ProgramLogicGraph {
  logic: ProgramLogicRow;
  tiers: LogicTierRow[];
  nodes: LogicNodeRow[];
  edges: LogicEdgeRow[];
  indicator_links: LogicIndicatorLinkRow[];
}

// --- Validation report -----------------------------------------------------

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationFinding {
  code:
    | 'cycle'
    | 'orphan_node'
    | 'attribution_only_above_ceiling'
    | 'same_tier_or_downward_edge'
    | 'cross_scope_reverse_rollup';
  severity: ValidationSeverity;
  message: string;
  node_ids?: string[];
  edge_ids?: string[];
}

export interface ValidationReport {
  ok: boolean;
  findings: ValidationFinding[];
}

// --- Snapshot diff ----------------------------------------------------------

export interface DiffField {
  field: string;
  from: unknown;
  to: unknown;
}

export interface NodeDiffEntry {
  id: string;
  statement: string;
  changes?: DiffField[];
}

export interface EdgeDiffEntry {
  id: string;
  from_node_id: string;
  to_node_id: string;
  changes?: DiffField[];
}

export interface SnapshotDiff {
  from: { id: string; version_label: string; created_at: string };
  to: { id: string; version_label: string; created_at: string };
  nodes: {
    added: NodeDiffEntry[];
    removed: NodeDiffEntry[];
    changed: NodeDiffEntry[];
  };
  edges: {
    added: EdgeDiffEntry[];
    removed: EdgeDiffEntry[];
    changed: EdgeDiffEntry[];
  };
}
