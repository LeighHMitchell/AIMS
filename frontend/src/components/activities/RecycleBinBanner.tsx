'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, Undo2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

interface RecycleBinBannerProps {
  deletedAt?: string | null;
  deletedByName?: string | null;
  purgeOnDate?: string | null;
  canRestore?: boolean;
  onRestore?: () => Promise<void> | void;
  className?: string;
}

export const RecycleBinBanner: React.FC<RecycleBinBannerProps> = ({
  deletedAt,
  deletedByName,
  purgeOnDate,
  canRestore = false,
  onRestore,
  className,
}) => {
  const [restoring, setRestoring] = useState(false);
  const deletedLabel = deletedAt ? formatDate(deletedAt) : '';
  const purgeLabel = purgeOnDate ? formatDate(purgeOnDate) : '';

  const handleRestore = async () => {
    if (!onRestore) return;
    setRestoring(true);
    try {
      await onRestore();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-6 py-2.5 text-helper text-destructive',
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 font-medium">
        <Trash2 className="h-4 w-4" />
        This activity is in the recycle bin
      </span>
      <span className="text-muted-foreground">
        {deletedLabel && <>Sent on {deletedLabel}</>}
        {deletedByName && <> · by {deletedByName}</>}
        {purgeLabel && <> · permanent deletion on {purgeLabel}</>}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {canRestore && onRestore && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRestore}
            disabled={restoring}
            className="border-destructive/40"
          >
            {restoring ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Undo2 className="mr-2 h-3.5 w-3.5" />
            )}
            Restore
          </Button>
        )}
        <Link
          href="/admin?tab=recycle-bin"
          className="inline-flex items-center gap-1 font-medium hover:underline"
        >
          View recycle bin
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </span>
    </div>
  );
};

export default RecycleBinBanner;
