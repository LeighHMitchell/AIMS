/**
 * Coordination Analytics Types
 * Types for the circle-pack coordination visualization
 */

export type CoordinationView = 'sectors' | 'organizations';

export interface CoordinationFilters {
  view: CoordinationView;
  organizationId?: string;
  fiscalYear?: number;
}

export interface CoordinationSummary {
  totalBudget: number;
  sectorCount: number;
  organizationCount: number;
  activityCount: number;
}

export interface CoordinationBubble {
  id: string;
  name: string;
  code?: string;
  value: number;
  activityCount: number;
}

export interface CoordinationParentNode {
  id: string;
  name: string;
  code?: string;
  totalValue: number;
  children: CoordinationBubble[];
}

export interface CoordinationHierarchy {
  name: string;
  children: CoordinationParentNode[];
}

export interface CoordinationResponse {
  success: boolean;
  view: CoordinationView;
  data: CoordinationHierarchy;
  summary: CoordinationSummary;
  error?: string;
}
