import type { ParcelStatus, AllocationRequestStatus, TitleStatus, LandDocumentType } from '@/types/land-bank';

/** Status → display label */
export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  allocated: 'Allocated',
  disputed: 'Disputed',
};

/** Status → Badge variant mapping */
export const PARCEL_STATUS_BADGE_VARIANT: Record<ParcelStatus, string> = {
  available: 'success',
  reserved: 'amber',
  allocated: 'blue',
  disputed: 'destructive',
};

/** Status → map fill color */
export const PARCEL_STATUS_COLORS: Record<ParcelStatus, string> = {
  available: '#7b95a7',   // Cool Steel
  reserved: '#cfd0d5',    // Pale Slate
  allocated: '#4c5568',   // Blue Slate
  disputed: '#dc2625',    // Primary Scarlet
};

/** Allocation request status labels */
export const ALLOCATION_STATUS_LABELS: Record<AllocationRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/** Allocation request status → Badge variant */
export const ALLOCATION_STATUS_BADGE_VARIANT: Record<AllocationRequestStatus, string> = {
  pending: 'amber',
  approved: 'success',
  rejected: 'destructive',
  withdrawn: 'gray',
};

/** Myanmar states and regions */
export const STATES_REGIONS = [
  'Yangon', 'Mandalay', 'Naypyitaw',
  'Kachin', 'Kayah', 'Kayin', 'Chin', 'Mon', 'Rakhine', 'Shan',
  'Sagaing', 'Tanintharyi', 'Bago', 'Magway', 'Ayeyarwady',
] as const;

/** State/region → 3-letter code mapping (matches DB trigger) */
export const REGION_CODES: Record<string, string> = {
  Yangon: 'YGN',
  Mandalay: 'MDY',
  Naypyitaw: 'NPT',
  Kachin: 'KCN',
  Kayah: 'KYH',
  Kayin: 'KYN',
  Chin: 'CHN',
  Mon: 'MON',
  Rakhine: 'RKN',
  Shan: 'SHN',
  Sagaing: 'SGG',
  Tanintharyi: 'TNT',
  Bago: 'BGO',
  Magway: 'MGW',
  Ayeyarwady: 'AYW',
};

/** Format hectares with unit */
export function formatHectares(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k ha`;
  }
  return `${value.toLocaleString()} ha`;
}

/** Check if lease is expiring within 30 days */
export function isLeaseExpiringSoon(leaseEndDate: string | null): boolean {
  if (!leaseEndDate) return false;
  const end = new Date(leaseEndDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

/** Days until lease expiry (negative if expired) */
export function daysUntilLeaseExpiry(leaseEndDate: string | null): number | null {
  if (!leaseEndDate) return null;
  const end = new Date(leaseEndDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Generate a suggested parcel code from region */
export function generateParcelCodeSuggestion(region: string): string {
  const prefix = REGION_CODES[region] || 'UNK';
  return `${prefix}-`;
}

/** Title status → display label */
export const TITLE_STATUS_LABELS: Record<TitleStatus, string> = {
  'Clear': 'Clear',
  'Pending Verification': 'Pending Verification',
  'Under Review': 'Under Review',
  'Title Disputed': 'Title Disputed',
  'Unregistered': 'Unregistered',
};

/** Title status → Badge variant mapping */
export const TITLE_STATUS_BADGE_VARIANT: Record<TitleStatus, string> = {
  'Clear': 'success',
  'Pending Verification': 'amber',
  'Under Review': 'blue',
  'Title Disputed': 'destructive',
  'Unregistered': 'gray',
};

/** All possible title status values */
export const TITLE_STATUS_OPTIONS: TitleStatus[] = [
  'Clear',
  'Pending Verification',
  'Under Review',
  'Title Disputed',
  'Unregistered',
];

/** Land document type → display label */
export const LAND_DOCUMENT_TYPE_LABELS: Record<LandDocumentType, string> = {
  title_deed: 'Title Deed',
  survey_report: 'Survey Report',
  environmental_assessment: 'Environmental Assessment',
  valuation_report: 'Valuation Report',
  legal_opinion: 'Legal Opinion',
  other: 'Other',
};

/** History action → human-readable label */
export const HISTORY_ACTION_LABELS: Record<string, string> = {
  created: 'Parcel registered',
  updated: 'Parcel details updated',
  allocation_requested: 'Allocation requested',
  allocation_approved: 'Allocation approved',
  allocation_rejected: 'Allocation rejected',
  deallocated: 'Parcel de-allocated',
  status_changed: 'Status changed',
  disputed: 'Dispute flagged',
  project_linked: 'Project linked',
  document_uploaded: 'Document uploaded',
};
