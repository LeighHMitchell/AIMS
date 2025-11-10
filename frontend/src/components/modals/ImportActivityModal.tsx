'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Upload, Search, FileCode, Globe, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    id: string;
    name: string;
    email: string;
    organisation?: string;
    organizationId?: string;
    organization?: {
      id: string;
      name: string;
      acronym?: string;
    };
  } | null;
}

export function ImportActivityModal({ isOpen, onClose, user }: ImportActivityModalProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleStartImport = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to import activities');
      return;
    }

    setIsCreating(true);

    try {
      // Create a draft activity for import
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Imported Activity (Draft)',
          description: 'Activity created via IATI/XML import',
          status: '1', // Pipeline status
          user_id: user.id,
          created_via: 'import',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create draft activity');
      }

      const newActivity = await response.json();

      // Close modal
      onClose();

      // Show success message
      toast.success('Import session started', {
        description: 'Choose your import method on the next screen',
      });

      // Navigate to the import tab
      router.push(`/activities/new?id=${newActivity.id}&tab=xml-import`);
    } catch (error) {
      console.error('Error creating draft activity:', error);
      toast.error('Failed to start import', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Activity from IATI/XML
          </DialogTitle>
          <DialogDescription>
            Import activity data using one of four methods: IATI Registry search, file upload, URL, or paste XML content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Available Import Methods:</strong>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li className="flex items-center gap-2">
                  <Search className="h-3 w-3" />
                  <span><strong>IATI Search</strong> - Search the IATI Registry by organization or activity</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileCode className="h-3 w-3" />
                  <span><strong>Upload File</strong> - Upload an XML file from your computer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  <span><strong>From URL</strong> - Import XML directly from a URL</span>
                </li>
                <li className="flex items-center gap-2">
                  <ClipboardPaste className="h-3 w-3" />
                  <span><strong>Paste XML</strong> - Paste XML content directly</span>
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              A draft activity will be created and you'll be taken to the import interface where you can choose your preferred import method.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartImport}
            disabled={isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Start Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
