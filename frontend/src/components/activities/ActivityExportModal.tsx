'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileImage, Printer, X } from 'lucide-react';
import { ActivityCardForExport } from './ActivityCardForExport';
import { useActivityExport } from '@/hooks/use-activity-export';
import { Badge } from '@/components/ui/badge';

interface ActivityExportModalProps {
  activity: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityExportModal({ activity, isOpen, onClose }: ActivityExportModalProps) {
  const { exportRef, exportAsJPG, exportAsPNG } = useActivityExport();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJPG = async () => {
    setIsExporting(true);
    try {
      await exportAsJPG(activity, {
        filename: `${activity.partner_id || activity.id}-activity-card.jpg`,
        quality: 0.95,
        scale: 2
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      await exportAsPNG(activity, {
        filename: `${activity.partner_id || activity.id}-activity-card.png`,
        scale: 2
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (exportRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Activity Card - ${activity.title}</title>
              <link href="https://cdn.tailwindcss.com/2.2.19/tailwind.min.css" rel="stylesheet">
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                body { 
                  font-family: 'Inter', sans-serif; 
                  margin: 0; 
                  padding: 20px; 
                  background: #f8fafc;
                }
                @media print {
                  body { background: white; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${exportRef.current.outerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">Image Export</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Optimized Layout
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Export Options */}
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <Button
            onClick={handleExportJPG}
            disabled={isExporting}
            className="flex items-center gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export as JPG'}
          </Button>
          
          <Button
            onClick={handleExportPNG}
            disabled={isExporting}
            variant="outline"
            className="flex items-center gap-2"
            size="sm"
          >
            <FileImage className="h-4 w-4" />
            Export as PNG
          </Button>
          
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-2"
            size="sm"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="font-medium text-blue-900 mb-1">🎨 Optimized Image Export</div>
            <ul className="text-blue-800 text-xs space-y-1">
              <li>• Optimized dimensions (800x600px) for better sharing</li>
              <li>• Compact header with title overlay</li>
              <li>• Side-by-side financial and activity details</li>
              <li>• Prominent financial progress visualization</li>
              <li>• Better SDG integration and export footer</li>
            </ul>
          </div>

          {/* Export Preview */}
          <div className="bg-gray-100 p-6 rounded-lg flex justify-center">
            <ActivityCardForExport 
              ref={exportRef}
              activity={activity}
              className="shadow-xl"
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center pt-4 border-t">
          <p>💡 This optimized layout is specifically designed for image exports and sharing while keeping your card UI unchanged.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}