'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedActivityComments } from './EnhancedActivityComments';
import { MessageSquare, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';

interface CommentsDrawerProps {
  activityId: string;
  contextSection?: string;
  contextField?: string;
  children?: React.ReactNode;
}

export function CommentsDrawer({ 
  activityId, 
  contextSection, 
  contextField,
  children 
}: CommentsDrawerProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count when drawer opens
  useEffect(() => {
    if (open && activityId) {
      fetchUnreadCount();
    }
  }, [open, activityId]);

  const fetchUnreadCount = async () => {
    try {
      const response = await apiFetch(`/api/activities/${activityId}/comments/unread-count`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Comments
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-[600px] sm:w-[700px] lg:w-[800px] overflow-y-auto"
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Activity Comments
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {contextSection && (
            <p className="text-sm text-muted-foreground mt-1">
              Context: {contextSection}
              {contextField && ` > ${contextField}`}
            </p>
          )}
        </SheetHeader>
        
        <div className="mt-4">
          <EnhancedActivityComments
            activityId={activityId}
            contextSection={contextSection}
            contextField={contextField}
            allowContextSwitch={true}
            showInline={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
} 