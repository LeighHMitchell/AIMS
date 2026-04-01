"use client"

import { CheckCircle2 } from 'lucide-react';

/** Green tick shown when a field has been filled in */
export function FieldCheck({ value }: { value: unknown }) {
  const filled = Array.isArray(value)
    ? value.length > 0
    : value !== null && value !== undefined && value !== '' && value !== 0;
  if (!filled) return null;
  return <CheckCircle2 className="inline-block h-3.5 w-3.5 text-[hsl(var(--success-icon))] ml-1.5 align-middle" />;
}
