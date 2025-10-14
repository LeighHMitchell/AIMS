/**
 * TypeScript types for Activity Conditions
 * Supports IATI-compliant condition tracking with multi-language narratives
 */

export type ConditionType = '1' | '2' | '3';

export const CONDITION_TYPE_LABELS = {
  '1': 'Policy',
  '2': 'Performance',
  '3': 'Fiduciary'
} as const;

export const CONDITION_TYPE_DESCRIPTIONS = {
  '1': 'The condition attached requires a particular policy to be implemented by the recipient',
  '2': 'The condition attached requires certain outputs or outcomes to be achieved by the recipient',
  '3': 'The condition attached requires use of certain public financial management or public accountability measures by the recipient'
} as const;

export interface ActivityCondition {
  id: string;
  activity_id: string;
  type: ConditionType;
  narrative: Record<string, string>; // Multi-language support: {en: "text", fr: "text"}
  attached: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateConditionData {
  activity_id: string;
  type: ConditionType;
  narrative: Record<string, string>;
  attached: boolean;
}

export interface UpdateConditionData {
  type?: ConditionType;
  narrative?: Record<string, string>;
  attached?: boolean;
}

export interface ConditionsTabProps {
  activityId: string;
  readOnly?: boolean;
  defaultLanguage?: string;
  className?: string;
  onConditionsChange?: (conditions: ActivityCondition[]) => void;
}

