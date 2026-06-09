// Centralized activity status display: label + badge className
// Ensures consistent status colors across all pages and components.

const GRAY_CLASS = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
const GREEN_CLASS = 'bg-[#3C6255] text-white hover:bg-[#3C6255]/90';
const RED_CLASS = 'bg-[#dc2625]/10 text-[#dc2625] hover:bg-[#dc2625]/20';

export function getActivityStatusDisplay(status: string | null | undefined): { label: string; className: string } {
  if (!status) return { label: 'Pipeline', className: GRAY_CLASS };

  const s = String(status).toLowerCase().trim();

  // Pipeline / Identification
  if (s === '1' || s === 'pipeline' || s === 'planning' || s === 'pipeline/identification') {
    return { label: 'Pipeline', className: GRAY_CLASS };
  }

  // Implementation
  if (s === '2' || s === 'implementation' || s === 'active') {
    return { label: 'Implementation', className: GREEN_CLASS };
  }

  // Finalisation
  if (s === '3' || s === 'finalisation' || s === 'completion') {
    return { label: 'Finalisation', className: GRAY_CLASS };
  }

  // Closed
  if (s === '4' || s === 'closed' || s === 'completed' || s === 'post-completion') {
    return { label: 'Closed', className: GRAY_CLASS };
  }

  // Cancelled
  if (s === '5' || s === 'cancelled') {
    return { label: 'Cancelled', className: RED_CLASS };
  }

  // Suspended
  if (s === '6' || s === 'suspended') {
    return { label: 'Suspended', className: RED_CLASS };
  }

  // Unknown — capitalize first letter
  return { label: status.charAt(0).toUpperCase() + status.slice(1), className: GRAY_CLASS };
}

export function getActivityStatusLabel(status: string | null | undefined): string {
  return getActivityStatusDisplay(status).label;
}

// Normalize any activity-status input (IATI code '1'-'6' or a text label/alias)
// to its canonical IATI numeric code. Defaults to '1' (Pipeline) when unknown.
// The canonical stored format across the app is the numeric code.
export function normalizeActivityStatusCode(status: string | null | undefined): string {
  if (!status) return '1';
  const s = String(status).toLowerCase().trim();
  if (s === '1' || s === 'pipeline' || s === 'planning' || s === 'planned' || s === 'identification' || s === 'pipeline/identification') return '1';
  if (s === '2' || s === 'implementation' || s === 'active') return '2';
  if (s === '3' || s === 'finalisation' || s === 'completion') return '3';
  if (s === '4' || s === 'closed' || s === 'completed' || s === 'post-completion') return '4';
  if (s === '5' || s === 'cancelled' || s === 'canceled') return '5';
  if (s === '6' || s === 'suspended') return '6';
  return '1';
}
