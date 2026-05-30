/**
 * Canonical validation-status model (decided 2026-05-30).
 *
 * User-facing validation has THREE states:
 *   - Pending Validation — not yet validated (covers draft / not_submitted /
 *     submitted / pending / pending_validation)
 *   - Validated          — passed (covers validated / approved)
 *   - Rejected           — reviewed and sent back for changes
 *
 * The underlying `submission_status` workflow values are preserved for the
 * state-machine logic (transitions check 'submitted', 'draft', etc.). This is
 * purely the display-layer grouping/labels, so use it for any user-facing
 * validation status text, badges, charts and filters.
 *
 * NOTE: `publication_status` (draft/published) is a SEPARATE axis (is it
 * publicly visible) and is not mapped here.
 */

export type ValidationStatusKey = 'pending_validation' | 'validated' | 'rejected';

export interface ValidationStatus {
  key: ValidationStatusKey;
  label: string;
}

export const VALIDATION_STATUS_LABELS: Record<ValidationStatusKey, string> = {
  pending_validation: 'Pending Validation',
  validated: 'Validated',
  rejected: 'Rejected',
};

/** Map a raw submission_status workflow value to the canonical validation state. */
export function toValidationStatus(submissionStatus?: string | null): ValidationStatus {
  switch ((submissionStatus ?? '').toLowerCase()) {
    case 'validated':
    case 'approved':
      return { key: 'validated', label: VALIDATION_STATUS_LABELS.validated };
    case 'rejected':
      return { key: 'rejected', label: VALIDATION_STATUS_LABELS.rejected };
    // draft, not_submitted, submitted, pending, pending_validation, '' / unknown
    default:
      return { key: 'pending_validation', label: VALIDATION_STATUS_LABELS.pending_validation };
  }
}

/** Human-readable validation label for a raw submission_status value. */
export function getValidationStatusLabel(submissionStatus?: string | null): string {
  return toValidationStatus(submissionStatus).label;
}

/** True if the given value is already a canonical validation key. */
export function isValidationKey(v?: string | null): v is ValidationStatusKey {
  return v === 'pending_validation' || v === 'validated' || v === 'rejected';
}
