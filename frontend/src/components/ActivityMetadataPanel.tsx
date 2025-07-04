"use client"

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text: ', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Don't render if no data is available
  if (!systemUUID && !activityPartnerID && !iatiIdentifier) {
    return null;
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">Activity Identifiers</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System UUID */}
        {systemUUID && (
          <div className="bg-white rounded-md p-3 border border-gray-100 group hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 mb-1">System UUID</div>
                <div className="text-sm text-gray-600 font-mono break-all" title={systemUUID}>
                  {systemUUID}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => copyToClipboard(systemUUID, 'UUID')}
                    >
                      {copiedField === 'UUID' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy UUID</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Activity Partner ID */}
        {activityPartnerID && (
          <div className="bg-white rounded-md p-3 border border-gray-100 group hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 mb-1">Activity Partner ID</div>
                <div className="text-sm text-gray-600 break-all" title={activityPartnerID}>
                  {activityPartnerID}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => copyToClipboard(activityPartnerID, 'Partner ID')}
                    >
                      {copiedField === 'Partner ID' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy Partner ID</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* IATI Identifier */}
        {iatiIdentifier && (
          <div className="bg-white rounded-md p-3 border border-gray-100 group hover:border-gray-200 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 mb-1">IATI Identifier</div>
                <div className="text-sm text-gray-600 break-all" title={iatiIdentifier}>
                  {iatiIdentifier}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => copyToClipboard(iatiIdentifier, 'IATI Identifier')}
                    >
                      {copiedField === 'IATI Identifier' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy IATI Identifier</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}