// IATI Sync Types

export type SyncStatus = 'live' | 'pending' | 'outdated';
export type ImportType = 'manual' | 'auto' | 'bulk';
export type ImportResultStatus = 'success' | 'partial' | 'failed';

// Activity sync fields
export interface ActivitySyncFields {
  auto_sync: boolean;
  last_sync_time: string | null;
  auto_sync_fields: string[];
  sync_status: SyncStatus;
}

// IATI Import Log
export interface IATIImportLog {
  id: string;
  activity_id: string;
  import_timestamp: string;
  import_type: ImportType;
  result_status: ImportResultStatus;
  result_summary: {
    fields_updated?: number;
    fields_failed?: number;
    warnings?: string[];
    errors?: string[];
    [key: string]: any;
  };
  fields_updated: string[];
  previous_values?: Record<string, any>;
  error_details?: string;
  imported_by?: string;
  iati_version?: string;
  source_url?: string;
  created_at: string;
}

// Extended Activity type with sync fields
export interface ActivityWithSync {
  id: string;
  iati_id?: string;
  title: string;
  description?: string;
  // ... other activity fields
  auto_sync: boolean;
  last_sync_time: string | null;
  auto_sync_fields: string[];
  sync_status: SyncStatus;
}

// Field mapping for IATI sync
export interface IATIFieldMapping {
  iatiField: string;
  localField: string;
  label: string;
  description?: string;
  syncable: boolean;
  dataType: 'string' | 'number' | 'date' | 'array' | 'object';
}

// Available fields for syncing
export const IATI_SYNCABLE_FIELDS: IATIFieldMapping[] = [
  {
    iatiField: 'title',
    localField: 'title',
    label: 'Title',
    description: 'Activity title in the default language',
    syncable: true,
    dataType: 'string'
  },
  {
    iatiField: 'description',
    localField: 'description', 
    label: 'Description',
    description: 'General activity description',
    syncable: true,
    dataType: 'string'
  },
  {
    iatiField: 'activity-status',
    localField: 'activity_status',
    label: 'Activity Status',
    description: 'Current status of the activity',
    syncable: true,
    dataType: 'string'
  },
  {
    iatiField: 'activity-date[@type="1"]',
    localField: 'planned_start_date',
    label: 'Planned Start Date',
    description: 'Planned start date of the activity',
    syncable: true,
    dataType: 'date'
  },
  {
    iatiField: 'activity-date[@type="2"]',
    localField: 'planned_end_date',
    label: 'Planned End Date',
    description: 'Planned end date of the activity',
    syncable: true,
    dataType: 'date'
  },
  {
    iatiField: 'activity-date[@type="3"]',
    localField: 'actual_start_date',
    label: 'Actual Start Date',
    description: 'Actual start date of the activity',
    syncable: true,
    dataType: 'date'
  },
  {
    iatiField: 'activity-date[@type="4"]',
    localField: 'actual_end_date',
    label: 'Actual End Date',
    description: 'Actual end date of the activity',
    syncable: true,
    dataType: 'date'
  },
  {
    iatiField: 'sector',
    localField: 'sectors',
    label: 'Sectors',
    description: 'Sector classifications',
    syncable: true,
    dataType: 'array'
  },
  {
    iatiField: 'budget',
    localField: 'budget',
    label: 'Budget',
    description: 'Activity budget information',
    syncable: true,
    dataType: 'object'
  },
  {
    iatiField: 'participating-org',
    localField: 'participating_orgs',
    label: 'Participating Organizations',
    description: 'Organizations involved in the activity',
    syncable: true,
    dataType: 'array'
  },
  {
    iatiField: 'location',
    localField: 'locations',
    label: 'Locations',
    description: 'Geographic locations of the activity',
    syncable: true,
    dataType: 'array'
  },
  {
    iatiField: 'default-aid-type',
    localField: 'default_aid_type',
    label: 'Default Aid Type',
    description: 'Default aid type classification',
    syncable: true,
    dataType: 'string'
  },
  {
    iatiField: 'default-flow-type',
    localField: 'flow_type',
    label: 'Flow Type',
    description: 'Default flow type (ODA, OOF, etc)',
    syncable: true,
    dataType: 'string'
  },
  {
    iatiField: 'transaction',
    localField: 'transactions',
    label: 'Transactions',
    description: 'Financial transactions',
    syncable: true,
    dataType: 'array'
  },
  {
    iatiField: 'policy-marker',
    localField: 'policy_markers',
    label: 'Policy Markers',
    description: 'Policy markers and significance',
    syncable: true,
    dataType: 'array'
  },
  {
    iatiField: 'tag',
    localField: 'tags',
    label: 'Tags',
    description: 'Activity tags and classifications',
    syncable: true,
    dataType: 'array'
  }
];

// Sync configuration
export interface SyncConfiguration {
  enabled: boolean;
  fields: string[];
  frequency?: 'manual' | 'daily' | 'weekly' | 'monthly';
  lastRun?: string;
  nextRun?: string;
}

// Sync request/response types
export interface SyncActivityRequest {
  activityId: string;
  fields?: string[]; // If not provided, use auto_sync_fields
  force?: boolean; // Force sync even if status is 'live'
}

export interface SyncActivityResponse {
  success: boolean;
  fieldsUpdated: string[];
  fieldsFailed: string[];
  warnings: string[];
  errors: string[];
  importLogId: string;
  syncStatus: SyncStatus;
  lastSyncTime: string;
} 