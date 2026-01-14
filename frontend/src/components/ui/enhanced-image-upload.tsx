"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Move, Check, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface EnhancedImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  position?: number; // 0-100, Y position for banners
  onPositionChange?: (position: number) => void;
  scale?: number; // 50-150, zoom for logos
  onScaleChange?: (scale: number) => void;
  label: string;
  recommendedSize: string;
  variant: 'banner' | 'logo';
  disabled?: boolean;
  maxSize?: number; // in bytes
}

export function EnhancedImageUpload({
  value,
  onChange,
  position = 50,
  onPositionChange,
  scale = 100,
  onScaleChange,
  label,
  recommendedSize,
  variant,
  disabled = false,
  maxSize = 5 * 1024 * 1024
}: EnhancedImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [currentScale, setCurrentScale] = useState(scale);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startPositionRef = useRef<number>(0);
  const startScaleRef = useRef<number>(100);

  const canReposition = variant === 'banner';
  const canZoom = variant === 'logo';

  // Sync with external value changes
  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  useEffect(() => {
    setCurrentScale(scale);
  }, [scale]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      const maxSizeMB = maxSize / (1024 * 1024);
      if (file.size > maxSize) {
        toast.error(`Image size should be less than ${maxSizeMB}MB`);
        return;
      }

      setIsProcessing(true);

      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setPreview(base64String);
          onChange(base64String);
          // Reset position/scale for new images
          if (canReposition) {
            setCurrentPosition(50);
            onPositionChange?.(50);
          }
          if (canZoom) {
            setCurrentScale(100);
            onScaleChange?.(100);
          }
          toast.success(`${label} uploaded successfully`);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error('Failed to process image');
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange, onPositionChange, onScaleChange, maxSize, label, canReposition, canZoom]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: disabled || isProcessing || isRepositioning || isZooming
  });

  const removeImage = () => {
    setPreview(null);
    onChange('');
    setCurrentPosition(50);
    setCurrentScale(100);
    onPositionChange?.(50);
    onScaleChange?.(100);
  };

  // Repositioning and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioning && !isZooming) return;
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startPositionRef.current = currentPosition;
    startScaleRef.current = currentScale;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.clientY - startYRef.current;

      if (isRepositioning) {
        const deltaPercent = (deltaY / containerHeight) * 100;
        const newPosition = Math.max(0, Math.min(100, startPositionRef.current - deltaPercent));
        setCurrentPosition(newPosition);
      } else if (isZooming) {
        // Drag up to zoom in, drag down to zoom out
        const deltaPercent = (deltaY / containerHeight) * -100;
        const newScale = Math.max(50, Math.min(150, startScaleRef.current + deltaPercent));
        setCurrentScale(Math.round(newScale));
      }
    },
    [isDragging, isRepositioning, isZooming]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRepositioning && !isZooming) return;
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startPositionRef.current = currentPosition;
    startScaleRef.current = currentScale;
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();

      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.touches[0].clientY - startYRef.current;

      if (isRepositioning) {
        const deltaPercent = (deltaY / containerHeight) * 100;
        const newPosition = Math.max(0, Math.min(100, startPositionRef.current - deltaPercent));
        setCurrentPosition(newPosition);
      } else if (isZooming) {
        const deltaPercent = (deltaY / containerHeight) * -100;
        const newScale = Math.max(50, Math.min(150, startScaleRef.current + deltaPercent));
        setCurrentScale(Math.round(newScale));
      }
    },
    [isDragging, isRepositioning, isZooming]
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Add/remove global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const savePosition = () => {
    setIsRepositioning(false);
    onPositionChange?.(Math.round(currentPosition));
    toast.success("Position saved");
  };

  const cancelReposition = () => {
    setIsRepositioning(false);
    setCurrentPosition(position);
  };

  const saveScale = () => {
    setIsZooming(false);
    onScaleChange?.(Math.round(currentScale));
    toast.success("Zoom saved");
  };

  const cancelZoom = () => {
    setIsZooming(false);
    setCurrentScale(scale);
  };

  const getContainerClass = () => {
    if (variant === 'banner') {
      return 'h-40 w-full';
    }
    return 'h-48 w-48';
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>

      {preview ? (
        <div className="space-y-3">
          <div
            ref={containerRef}
            className={`relative ${getContainerClass()} rounded-lg overflow-hidden group border-2 border-dashed border-gray-300 ${
              isRepositioning || isZooming ? "cursor-grab" : ""
            } ${isDragging ? "cursor-grabbing" : ""}`}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Image display */}
            {canZoom ? (
              <div
                className="w-full h-full flex items-center justify-center bg-slate-100"
                style={{ overflow: 'hidden' }}
              >
                <img
                  src={preview}
                  alt={label}
                  className="select-none transition-transform object-contain"
                  style={{
                    width: `${currentScale}%`,
                    height: `${currentScale}%`,
                    maxWidth: 'none',
                    maxHeight: 'none',
                  }}
                  draggable={false}
                />
              </div>
            ) : (
              <img
                src={preview}
                alt={label}
                className="w-full h-full object-cover select-none transition-transform"
                style={
                  canReposition
                    ? { objectPosition: `center ${currentPosition}%` }
                    : undefined
                }
                draggable={false}
              />
            )}

            {/* Reposition mode overlay */}
            {isRepositioning && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                  <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                    <Move className="h-4 w-4" />
                    Drag up or down to reposition
                  </p>
                </div>
              </div>
            )}

            {/* Zoom mode overlay */}
            {isZooming && (
              <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2 pointer-events-none">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg">
                  <p className="text-xs font-medium text-white flex items-center gap-2">
                    <ZoomIn className="h-3 w-3" />
                    Drag up/down to zoom
                  </p>
                </div>
              </div>
            )}

            {/* Normal hover overlay */}
            {!isRepositioning && !isZooming && (
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                {canReposition && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRepositioning(true);
                    }}
                    disabled={disabled || isProcessing}
                    type="button"
                  >
                    <Move className="h-4 w-4 mr-2" />
                    Reposition
                  </Button>
                )}
                {canZoom && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsZooming(true);
                    }}
                    disabled={disabled || isProcessing}
                    type="button"
                  >
                    <ZoomIn className="h-4 w-4 mr-2" />
                    Adjust Zoom
                  </Button>
                )}
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={disabled || isProcessing}
                    type="button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Replace
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  disabled={disabled || isProcessing}
                  type="button"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Reposition controls */}
          {isRepositioning && (
            <div className="flex items-center justify-end bg-slate-50 rounded-lg p-3 gap-2">
              <Button size="sm" variant="ghost" onClick={cancelReposition} type="button">
                Cancel
              </Button>
              <Button size="sm" onClick={savePosition} type="button">
                <Check className="h-4 w-4 mr-2" />
                Save Position
              </Button>
            </div>
          )}

          {/* Zoom controls */}
          {isZooming && (
            <div className="flex items-center justify-end bg-slate-50 rounded-lg p-3 gap-2">
              <Button size="sm" variant="ghost" onClick={cancelZoom} type="button">
                Cancel
              </Button>
              <Button size="sm" onClick={saveScale} type="button">
                <Check className="h-4 w-4 mr-2" />
                Save Zoom
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Show upload dropzone
        <div
          {...getRootProps()}
          className={`
            ${getContainerClass()}
            border-2 border-dashed rounded-lg
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
            ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            flex flex-col items-center justify-center
            transition-colors
          `}
        >
          <input {...getInputProps()} />
          {isProcessing ? (
            <>
              <Upload className="h-8 w-8 text-gray-400 animate-pulse" />
              <p className="text-sm text-gray-600 mt-2">Uploading...</p>
            </>
          ) : isDragActive ? (
            <>
              <Upload className="h-8 w-8 text-primary" />
              <p className="text-sm text-primary mt-2">Drop image here</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600 mt-2 text-center">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-400 mt-1 text-center">Recommended: {recommendedSize}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Specialized component for organization banner uploads
 */
export function OrganizationBannerUpload(props: Omit<EnhancedImageUploadProps, 'variant' | 'label' | 'recommendedSize'> & { label?: string; recommendedSize?: string }) {
  return (
    <EnhancedImageUpload
      {...props}
      variant="banner"
      label={props.label || "Banner"}
      recommendedSize={props.recommendedSize || "1200x300px"}
      maxSize={5 * 1024 * 1024}
    />
  );
}

/**
 * Specialized component for organization logo uploads
 */
export function OrganizationLogoUpload(props: Omit<EnhancedImageUploadProps, 'variant' | 'label' | 'recommendedSize'> & { label?: string; recommendedSize?: string }) {
  return (
    <EnhancedImageUpload
      {...props}
      variant="logo"
      label={props.label || "Logo"}
      recommendedSize={props.recommendedSize || "512x512px"}
      maxSize={2 * 1024 * 1024}
    />
  );
}
