import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, CircleDashed, Move, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
import { toast } from 'sonner';

interface AutosaveUploadProps {
  id?: string;
  currentImage?: string | null;
  currentPosition?: number; // 0-100, represents Y position percentage for banners
  currentScale?: number; // 50-150, represents zoom percentage for icons
  onImageChange: (image: string | null, positionOrScale?: number) => void;
  label: React.ReactNode;
  helpText?: React.ReactNode;
  required?: boolean;
  accept?: Record<string, string[]>;
  maxSize?: number; // in bytes
  aspectRatio?: 'banner' | 'square' | 'auto'; // banner = wide, square = 1:1, auto = any
  autosaveState: {
    isSaving: boolean;
    isPersistentlySaved?: boolean;
    error?: Error | null;
  };
  triggerSave?: (value: string | null, positionOrScale?: number) => void;
  disabled?: boolean;
}

export function AutosaveUpload({
  id,
  currentImage,
  currentPosition = 50,
  currentScale = 100,
  onImageChange,
  label,
  helpText,
  required,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  },
  maxSize = 5 * 1024 * 1024, // 5MB default
  aspectRatio = 'auto',
  autosaveState,
  triggerSave,
  disabled = false
}: AutosaveUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [position, setPosition] = useState<number>(currentPosition);
  const [scale, setScale] = useState<number>(currentScale);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!currentImage);
  const [hasSaved, setHasSaved] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startPositionRef = useRef<number>(0);
  const startScaleRef = useRef<number>(100);

  // Update hasValue when preview changes
  useEffect(() => {
    setHasValue(!!preview);
  }, [preview]);

  // Update preview if currentImage changes externally
  useEffect(() => {
    if (currentImage !== preview) {
      setPreview(currentImage || null);
    }
  }, [currentImage]);

  // Update position if currentPosition changes externally
  useEffect(() => {
    setPosition(currentPosition);
  }, [currentPosition]);

  // Update scale if currentScale changes externally
  useEffect(() => {
    setScale(currentScale);
  }, [currentScale]);

  // Track when autosave completes successfully
  useEffect(() => {
    // If we were saving and now we're not, and we have a value, mark as saved
    if (autosaveState.isPersistentlySaved && hasValue && !autosaveState.isSaving) {
      setHasSaved(true);
    } else if (!hasValue) {
      // Reset saved state if no value
      setHasSaved(false);
    }
  }, [autosaveState.isPersistentlySaved, autosaveState.isSaving, hasValue]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Start "focusing" state to hide indicator during processing
      setIsFocused(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        setIsFocused(false);
        return;
      }

      // Validate file size
      const maxSizeMB = maxSize / (1024 * 1024);
      if (file.size > maxSize) {
        toast.error(`Image size should be less than ${maxSizeMB}MB`);
        setIsFocused(false);
        return;
      }

      setIsProcessing(true);

      try {
        // Create preview and convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setPreview(base64String);
          setPosition(50); // Reset to center for new images
          onImageChange(base64String, 50);

          // "Blur" to trigger save - this simulates the blur behavior of text fields
          setIsFocused(false);

          // Reset saved state since we have new content to save
          setHasSaved(false);

          // Trigger autosave after successful upload
          if (triggerSave) {
            // Small delay to show the orange indicator
            setTimeout(() => {
              triggerSave(base64String, 50);
            }, 100);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error processing image:', error);
        toast.error('Failed to process image');
        setIsFocused(false);
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageChange, triggerSave, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled: disabled || isProcessing || autosaveState.isSaving || isRepositioning || isZooming,
  });

  const removeImage = () => {
    // Start "focusing" to hide indicator during removal
    setIsFocused(true);
    setPreview(null);
    setPosition(50);
    onImageChange(null);

    // Reset saved state since we're changing the value
    setHasSaved(false);

    // "Blur" to trigger save of empty value
    setIsFocused(false);

    // Trigger autosave with null to save the removal
    if (triggerSave) {
      setTimeout(() => {
        triggerSave(null);
      }, 100);
    }
  };

  // Repositioning and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioning && !isZooming) return;
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startPositionRef.current = position;
    startScaleRef.current = scale;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.clientY - startYRef.current;

      if (isRepositioning) {
        const deltaPercent = (deltaY / containerHeight) * 100;
        const newPosition = Math.max(0, Math.min(100, startPositionRef.current - deltaPercent));
        setPosition(newPosition);
      } else if (isZooming) {
        // Drag up to zoom in, drag down to zoom out
        // Use a sensitivity factor for smooth zooming
        const deltaPercent = (deltaY / containerHeight) * -100; // Negative so drag up = zoom in
        const newScale = Math.max(50, Math.min(150, startScaleRef.current + deltaPercent));
        setScale(Math.round(newScale));
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
    startPositionRef.current = position;
    startScaleRef.current = scale;
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
        setPosition(newPosition);
      } else if (isZooming) {
        // Drag up to zoom in, drag down to zoom out
        const deltaPercent = (deltaY / containerHeight) * -100;
        const newScale = Math.max(50, Math.min(150, startScaleRef.current + deltaPercent));
        setScale(Math.round(newScale));
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
    onImageChange(preview, position);

    // Trigger autosave with ONLY the position (not the banner image)
    // Pass null for banner to indicate we're only updating position
    if (triggerSave) {
      triggerSave(null, position);
    }

    toast.success("Position saved");
  };

  const cancelReposition = () => {
    setIsRepositioning(false);
    setPosition(currentPosition);
  };

  const saveScale = () => {
    setIsZooming(false);
    onImageChange(preview, scale);

    // Trigger autosave with ONLY the scale (not the icon image)
    if (triggerSave) {
      triggerSave(null, scale);
    }

    toast.success("Zoom saved");
  };

  const cancelZoom = () => {
    setIsZooming(false);
    setScale(currentScale);
  };

  // Determine container height based on aspect ratio
  const getContainerClass = () => {
    switch (aspectRatio) {
      case 'banner':
        return 'h-48'; // Wide banner
      case 'square':
        return 'h-48 max-w-[12rem]'; // Square aspect
      default:
        return 'h-48'; // Auto
    }
  };

  // Only show reposition for banner aspect ratio
  const canReposition = aspectRatio === 'banner';
  // Only show zoom for square aspect ratio (icons/logos)
  const canZoom = aspectRatio === 'square';

  return (
    <div className="space-y-2">
      <LabelSaveIndicator
        isSaving={autosaveState.isSaving || isProcessing}
        isSaved={hasSaved || (!!autosaveState.isPersistentlySaved && hasValue)}
        hasValue={hasValue}
        isFocused={isFocused}
        className="text-gray-700"
      >
        <div className="flex items-center gap-2">
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {helpText}
        </div>
      </LabelSaveIndicator>

      <div>
        {preview ? (
          // Show uploaded image with replace/remove/reposition options
          <div className="space-y-3">
            <div
              ref={containerRef}
              className={`relative ${getContainerClass()} rounded-lg overflow-hidden group ${
                isRepositioning || isZooming ? "cursor-grab" : ""
              } ${isDragging ? "cursor-grabbing" : ""}`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* For zoom mode, we need a wrapper to handle the scaling properly */}
              {canZoom ? (
                <div
                  className="w-full h-full flex items-center justify-center bg-slate-100"
                  style={{ overflow: 'hidden' }}
                >
                  <img
                    src={preview}
                    alt="Uploaded image"
                    className="select-none transition-transform object-contain"
                    style={{
                      width: `${scale}%`,
                      height: `${scale}%`,
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                    draggable={false}
                  />
                </div>
              ) : (
                <img
                  src={preview}
                  alt="Uploaded image"
                  className="w-full h-full object-cover select-none transition-transform"
                  style={
                    canReposition
                      ? { objectPosition: `center ${position}%` }
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

              {/* Zoom mode overlay - minimal so image stays visible */}
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
                      disabled={disabled || isProcessing || autosaveState.isSaving}
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
                      disabled={disabled || isProcessing || autosaveState.isSaving}
                      type="button"
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      Adjust Zoom
                    </Button>
                  )}
                  <div {...getRootProps()}>
                    <input {...getInputProps()} id={id} />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={disabled || isProcessing || autosaveState.isSaving}
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
                    disabled={disabled || isProcessing || autosaveState.isSaving}
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
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${disabled || isProcessing || autosaveState.isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
              flex flex-col items-center justify-center
              transition-colors
            `}
          >
            <input {...getInputProps()} id={id} />
            <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1 text-center">
              {isDragActive ? 'Drop image here' : 'Click or drag image to upload'}
            </p>
            <p className="text-xs text-gray-500 text-center">
              {`Max size: ${maxSize / (1024 * 1024)}MB`}
            </p>
            {isProcessing && (
              <div className="mt-2 flex items-center gap-2 text-blue-600">
                <CircleDashed className="h-4 w-4 animate-spin" />
                <span className="text-xs">Processing...</span>
              </div>
            )}
          </div>
        )}

        {autosaveState.error && (
          <p className="text-xs text-red-600 mt-1">{autosaveState.error.toString()}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Specialized component for banner uploads (wide aspect ratio)
 */
export function AutosaveBannerUpload(props: Omit<AutosaveUploadProps, 'aspectRatio'>) {
  return <AutosaveUpload {...props} aspectRatio="banner" maxSize={5 * 1024 * 1024} />;
}

/**
 * Specialized component for icon/logo uploads (square aspect ratio)
 */
export function AutosaveIconUpload(props: Omit<AutosaveUploadProps, 'aspectRatio'>) {
  return <AutosaveUpload {...props} aspectRatio="square" maxSize={2 * 1024 * 1024} />;
}
