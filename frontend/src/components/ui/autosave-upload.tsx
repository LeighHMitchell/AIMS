import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, CircleDashed, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
import { toast } from 'sonner';

interface AutosaveUploadProps {
  id?: string;
  currentImage?: string | null;
  onImageChange: (image: string | null) => void;
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
  triggerSave?: (value: string | null) => void;
  disabled?: boolean;
}

export function AutosaveUpload({
  id,
  currentImage,
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!currentImage);
  const [hasSaved, setHasSaved] = useState(false);
  
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
          onImageChange(base64String);
          
          // "Blur" to trigger save - this simulates the blur behavior of text fields
          setIsFocused(false);
          
          // Reset saved state since we have new content to save
          setHasSaved(false);
          
          // Trigger autosave after successful upload
          if (triggerSave) {
            // Small delay to show the orange indicator
            setTimeout(() => {
              triggerSave(base64String);
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
    disabled: disabled || isProcessing || autosaveState.isSaving,
  });
  
  const removeImage = () => {
    // Start "focusing" to hide indicator during removal
    setIsFocused(true);
    setPreview(null);
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
  
  return (
    <div className="space-y-2">
      <LabelSaveIndicator
        isSaving={autosaveState.isSaving || isProcessing}
        isSaved={hasSaved || (autosaveState.isPersistentlySaved && hasValue)}
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
          // Show uploaded image with replace/remove options
          <div className={`relative ${getContainerClass()} rounded-lg overflow-hidden group`}>
            <img
              src={preview}
              alt="Uploaded image"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
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
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragActive ? 'Drop image here' : 'Click or drag image to upload'}
            </p>
            <p className="text-xs text-gray-500">
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