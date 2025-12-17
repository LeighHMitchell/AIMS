"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { FAQAttachment } from '@/types/faq-enhanced';
import { Image as ImageIcon, FileText, Download, ExternalLink } from 'lucide-react';

interface FAQAttachmentGalleryProps {
  attachments: FAQAttachment[];
}

// Helper function to format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper to determine if file is an image
const isImage = (fileType?: string): boolean => {
  return !!fileType && fileType.startsWith('image/');
};

export function FAQAttachmentGallery({ attachments }: FAQAttachmentGalleryProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  // Separate images from other files
  const images = attachments.filter(a => isImage(a.fileType));
  const files = attachments.filter(a => !isImage(a.fileType));

  return (
    <div className="space-y-4">
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Images</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border hover:shadow-md transition-shadow"
              >
                <img
                  src={attachment.fileUrl}
                  alt={attachment.caption || attachment.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-image.png';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {attachment.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 truncate">
                    {attachment.caption}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Documents</h4>
          <div className="space-y-2">
            {files.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.filename}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for list view
export function FAQAttachmentBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <ImageIcon className="h-3 w-3" />
      {count} {count === 1 ? 'attachment' : 'attachments'}
    </span>
  );
}
