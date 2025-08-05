'use client';

import { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export function useActivityExport() {
  const exportRef = useRef<HTMLDivElement>(null);

  const exportAsJPG = useCallback(async (activity: any, options?: {
    filename?: string;
    quality?: number;
    scale?: number;
    backgroundColor?: string;
  }) => {
    if (!exportRef.current) {
      toast.error('Export reference not available');
      return;
    }

    const {
      filename = `activity-${activity.partner_id || activity.id}-card.jpg`,
      quality = 0.95,
      scale = 2,
      backgroundColor = '#ffffff'
    } = options || {};

    try {
      // Show loading toast
      const loadingToast = toast.loading('Generating export...');

      const canvas = await html2canvas(exportRef.current, {
        backgroundColor,
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 800,
        height: exportRef.current.scrollHeight,
        windowWidth: 800,
        windowHeight: exportRef.current.scrollHeight,
        imageTimeout: 15000,
        removeContainer: true,
        foreignObjectRendering: true,
        onclone: (clonedDoc) => {
          // Ensure fonts are loaded in the cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            * {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Dismiss loading and show success
          toast.dismiss(loadingToast);
          toast.success('Activity card exported successfully');
        } else {
          toast.dismiss(loadingToast);
          toast.error('Failed to generate export file');
        }
      }, 'image/jpeg', quality);
    } catch (error) {
      console.error('Error exporting activity card:', error);
      toast.error('Failed to export activity card');
    }
  }, []);

  const exportAsPNG = useCallback(async (activity: any, options?: {
    filename?: string;
    scale?: number;
    backgroundColor?: string;
  }) => {
    if (!exportRef.current) {
      toast.error('Export reference not available');
      return;
    }

    const {
      filename = `activity-${activity.partner_id || activity.id}-card.png`,
      scale = 2,
      backgroundColor = '#ffffff'
    } = options || {};

    try {
      const loadingToast = toast.loading('Generating PNG export...');

      const canvas = await html2canvas(exportRef.current, {
        backgroundColor,
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 800,
        height: exportRef.current.scrollHeight,
        windowWidth: 800,
        windowHeight: exportRef.current.scrollHeight
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast.dismiss(loadingToast);
          toast.success('Activity card exported as PNG');
        } else {
          toast.dismiss(loadingToast);
          toast.error('Failed to generate PNG file');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error exporting activity card as PNG:', error);
      toast.error('Failed to export as PNG');
    }
  }, []);

  return {
    exportRef,
    exportAsJPG,
    exportAsPNG
  };
}