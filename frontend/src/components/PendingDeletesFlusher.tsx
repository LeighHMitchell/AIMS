'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { flushAllPendingDeletes } from '@/lib/toast-manager';

export function PendingDeletesFlusher() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current !== null && previous.current !== pathname) {
      void flushAllPendingDeletes();
    }
    previous.current = pathname;
  }, [pathname]);

  return null;
}
