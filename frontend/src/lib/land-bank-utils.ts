import type { ParcelStatus, AllocationRequestStatus } from '@/types/land-bank';

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
  available: '#22c55e',
  reserved: '#f59e0b',
  allocated: '#3b82f6',
  disputed: '#ef4444',
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
};
