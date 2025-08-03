'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityComments } from '@/components/ActivityComments';
import { cn } from '@/lib/utils';

interface EnhancedCommentsDrawerProps {
  activityId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function EnhancedCommentsDrawer({ activityId, isOpen, onClose }: EnhancedCommentsDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Comments & Questions</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 h-full">
            {activityId ? (
              <ActivityComments activityId={activityId} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Save the activity first to enable comments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}