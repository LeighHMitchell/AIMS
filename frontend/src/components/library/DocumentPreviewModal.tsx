"use client"

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnifiedDocument } from '@/types/library-document';
import { getFormatLabel, getFormatBadgeClasses, SOURCE_TYPE_LABELS } from '@/types/library-document';

interface DocumentPreviewModalProps {
  document: UnifiedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Determine content type
  const isPdf = document?.format?.includes('pdf') || document?.url?.toLowerCase().endsWith('.pdf');
  const isImage = document?.format?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(document?.url || '');
  const isVideo = document?.format?.startsWith('video/') ||
    /\.(mp4|webm|ogg|mov)$/i.test(document?.url || '');
  const isAudio = document?.format?.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a)$/i.test(document?.url || '');

  // Reset state when document changes
  useEffect(() => {
    if (document) {
      setLoading(true);
      setError(false);
    }
  }, [document?.id]);

  // Handle image load
  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
  };

  // Handle media load
  const handleMediaLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleMediaError = () => {
    setLoading(false);
    setError(true);
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="mx-0 mt-0 px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <DialogTitle className="text-lg font-semibold line-clamp-1">
                {document.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${getFormatBadgeClasses(document.format)}`}>
                  {getFormatLabel(document.format)}
                </span>
                {document.categoryCode && (
                  <Badge variant="outline" className="gap-1.5">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{document.categoryCode}</span>
                    {document.categoryName && <span>{document.categoryName}</span>}
                  </Badge>
                )}
                <Badge variant="outline">
                  {SOURCE_TYPE_LABELS[document.sourceType]}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(document.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden relative bg-muted/50">
          {/* PDF Viewer — use browser's native PDF viewer via iframe */}
          {isPdf && (
            <div className="h-full flex flex-col">
              <iframe
                src={document.url}
                className="w-full flex-1 border-0"
                title={document.title}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mt-2">Loading PDF...</span>
                </div>
              )}
            </div>
          )}

          {/* Image Viewer */}
          {isImage && (
            <div className="h-full flex items-center justify-center p-4 overflow-auto">
              {loading && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading image...</span>
                </div>
              )}
              {error && !loading && (
                <div className="text-center">
                  <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Unable to load image</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              )}
              <img
                src={document.url}
                alt={document.title}
                className={`max-w-full max-h-full object-contain ${loading || error ? 'hidden' : ''}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          )}

          {/* Video Viewer */}
          {isVideo && (
            <div className="h-full flex items-center justify-center p-4">
              {loading && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading video...</span>
                </div>
              )}
              {error && !loading && (
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Unable to play video</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              )}
              <video
                src={document.url}
                controls
                className={`max-w-full max-h-full ${loading || error ? 'hidden' : ''}`}
                onLoadedData={handleMediaLoad}
                onError={handleMediaError}
              />
            </div>
          )}

          {/* Audio Player */}
          {isAudio && (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <Music className="h-24 w-24 text-muted-foreground mb-6" />
              <audio
                src={document.url}
                controls
                className="w-full max-w-md"
                onLoadedData={handleMediaLoad}
                onError={handleMediaError}
              />
              {error && (
                <div className="mt-4 text-center">
                  <p className="text-muted-foreground">Unable to play audio</p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Download Audio
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Fallback for other types */}
          {!isPdf && !isImage && !isVideo && !isAudio && (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <File className="h-24 w-24 text-muted-foreground mb-6" />
              <p className="text-lg font-medium mb-2">{document.title}</p>
              <p className="text-muted-foreground mb-6">
                Preview not available for this file type
              </p>
              <div className="flex gap-2">
                {onDownload && (
                  <Button onClick={onDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => window.open(document.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Browser
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with metadata */}
        <div className="px-6 py-3 border-t bg-muted/30 flex-shrink-0">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {document.fileName && (
              <span>File: {document.fileName}</span>
            )}
            {document.fileSize != null && document.fileSize > 0 && (
              <span>Size: {(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            )}
            {document.documentDate && (
              <span><span className="font-semibold text-foreground">Document Date:</span> {format(new Date(document.documentDate), 'd MMMM yyyy')}</span>
            )}
            {document.reportingOrgName && (
              <span>
                <span className="font-semibold text-foreground">Organisation:</span> {document.reportingOrgName}
                {document.reportingOrgIatiId && (
                  <span className="ml-1.5 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{document.reportingOrgIatiId}</span>
                )}
              </span>
            )}
            {document.sourceType !== 'standalone' && document.sourceName && (
              <span>
                <span className="font-semibold text-foreground">{SOURCE_TYPE_LABELS[document.sourceType]}:</span> {document.sourceName}
                {document.sourceIdentifier && (
                  <span className="ml-1.5 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{document.sourceIdentifier}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
