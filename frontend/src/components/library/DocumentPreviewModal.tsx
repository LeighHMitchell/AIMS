"use client"

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  ExternalLink,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnifiedDocument } from '@/types/library-document';
import { getFormatLabel, SOURCE_TYPE_LABELS } from '@/types/library-document';

interface DocumentPreviewModalProps {
  document: UnifiedDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

// Helper to check if URL is external
function isExternalUrl(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
}

// Get proxied URL for CORS
function getProxiedUrl(url: string): string {
  if (!url) return url;
  if (isExternalUrl(url)) {
    return `/api/proxy-pdf?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

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
      setCurrentPage(1);
      setZoom(1);
      setRotation(0);
      setPdfPageCount(0);
    }
  }, [document?.id]);

  // Render PDF page
  const renderPdfPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Calculate viewport with zoom and rotation
      let viewport = page.getViewport({ scale: 1.5 * zoom, rotation });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      setLoading(false);
    } catch (err) {
      console.error('Error rendering PDF page:', err);
      setError(true);
      setLoading(false);
    }
  }, [zoom, rotation]);

  // Load PDF
  useEffect(() => {
    if (!isOpen || !document || !isPdf) return;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(false);

        // Dynamically import pdf.js
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const pdfUrl = getProxiedUrl(document.url);
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });

        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setPdfPageCount(pdf.numPages);
        await renderPdfPage(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      pdfDocRef.current = null;
    };
  }, [isOpen, document?.url, isPdf]);

  // Re-render when page/zoom/rotation changes
  useEffect(() => {
    if (pdfDocRef.current && isPdf && !loading) {
      renderPdfPage(currentPage);
    }
  }, [currentPage, zoom, rotation, isPdf, renderPdfPage]);

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
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <DialogTitle className="text-lg font-semibold line-clamp-1">
                {document.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary">
                  {getFormatLabel(document.format)}
                </Badge>
                {document.categoryCode && (
                  <Badge variant="outline">
                    {document.categoryCode}
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
          {/* PDF Viewer */}
          {isPdf && (
            <div className="h-full flex flex-col">
              {/* PDF Controls */}
              <div className="flex items-center justify-center gap-2 p-2 bg-background border-b">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  Page {currentPage} of {pdfPageCount || '?'}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(pdfPageCount, p + 1))}
                  disabled={currentPage >= pdfPageCount}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 w-16 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              {/* PDF Canvas */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {loading && (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading PDF...</span>
                  </div>
                )}
                {error && !loading && (
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Unable to preview PDF</p>
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
                <canvas
                  ref={canvasRef}
                  className={`${loading || error ? 'hidden' : ''} shadow-lg`}
                />
              </div>
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
            {document.fileSize && document.fileSize > 0 && (
              <span>Size: {(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            )}
            {document.documentDate && (
              <span>Date: {format(new Date(document.documentDate), 'MMM d, yyyy')}</span>
            )}
            {document.reportingOrgName && (
              <span>Organization: {document.reportingOrgName}</span>
            )}
            {document.sourceType !== 'standalone' && document.sourceName && (
              <span>Source: {document.sourceName}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
