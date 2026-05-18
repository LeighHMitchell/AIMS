"use client"

import React from 'react';
import { CopyableIdBadge } from '@/components/ui/copyable-id-badge';

interface ActivityMetadataPanelProps {
  systemUUID?: string;
  activityPartnerID?: string;
  iatiIdentifier?: string;
  className?: string;
}

export function ActivityMetadataPanel({
  systemUUID,
  activityPartnerID,
  iatiIdentifier,
  className = ""
}: ActivityMetadataPanelProps) {
  if (!systemUUID && !activityPartnerID && !iatiIdentifier) {
    return null;
  }

  return (
    <div className={`bg-muted border border-border rounded-lg p-4 space-y-3 ${className}`}>
      <h3 className="text-body font-medium text-foreground mb-3">Activity Identifiers</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {systemUUID && (
          <div className="bg-white rounded-md p-3 border border-border">
            <div className="text-helper font-medium text-foreground mb-1">System UUID</div>
            <CopyableIdBadge value={systemUUID} label="UUID" className="text-sm" />
          </div>
        )}

        {activityPartnerID && (
          <div className="bg-white rounded-md p-3 border border-border">
            <div className="text-helper font-medium text-foreground mb-1">Activity Partner ID</div>
            <CopyableIdBadge value={activityPartnerID} label="Partner ID" className="text-body" />
          </div>
        )}

        {iatiIdentifier && (
          <div className="bg-white rounded-md p-3 border border-border">
            <div className="text-helper font-medium text-foreground mb-1">IATI Identifier</div>
            <CopyableIdBadge value={iatiIdentifier} label="IATI Identifier" className="text-body" />
          </div>
        )}
      </div>
    </div>
  );
}
