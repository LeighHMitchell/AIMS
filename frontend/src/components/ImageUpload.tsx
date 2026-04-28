import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (image: string | null) => void;
  label: string;
  acceptedFormats?: string[];
  maxSize?: number; // in MB
  aspectRatio?: "square" | "banner" | "auto";
  previewHeight?: string;
  previewWidth?: string;
  showHints?: boolean;
  id?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageChange,
  label,
  acceptedFormats = [".png", ".jpg", ".jpeg", ".svg", ".webp"],
  maxSize = 5,
  aspectRatio = "auto",
  previewHeight = "h-32",
  previewWidth = "w-full",
  showHints = true,
  id = "image-upload",
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`Image size should be less than ${maxSize}MB`);
        return;
      }

      setUploading(true);

      try {
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setPreview(base64String);
          onImageChange(base64String);
          toast.success(`${label} uploaded successfully`);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error(`Error uploading ${label}:`, error);
        toast.error(`Failed to upload ${label}`);
      } finally {
        setUploading(false);
      }
    },
    [onImageChange, label, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": acceptedFormats,
    },
    maxFiles: 1,
    disabled: uploading,
    noClick: false,
  });

  const removeImage = () => {
    setPreview(null);
    onImageChange(null);
    toast(`${label} removed`);
  };

  if (preview) {
    return (
      <div className="space-y-2">
        <div className="relative group">
          <img
            src={preview}
            alt={`${label} preview`}
            className={`${previewWidth} ${previewHeight} object-${
              aspectRatio === "square" ? "contain" : "cover"
            } border rounded-lg`}
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <div {...getRootProps()}>
              <input {...getInputProps()} id={id} />
              <Button
                size="sm"
                variant="secondary"
                disabled={uploading}
                type="button"
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace
              </Button>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={removeImage}
              disabled={uploading}
              type="button"
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
        {showHints && aspectRatio === "banner" && (
          <p className="text-helper text-muted-foreground">
            Recommended banner size: 1200x300px for best display.
          </p>
        )}
        {showHints && aspectRatio === "square" && (
          <p className="text-helper text-muted-foreground">
            Recommended logo size: 512x512px for best display.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`
          ${previewHeight} border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/10" : "border-input hover:border-slate-400 hover:bg-muted"}
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} id={id} />
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-4">
          <Upload className={`h-10 w-10 mb-2 ${isDragActive ? "text-primary" : ""}`} />
          <p className="text-body font-medium text-foreground text-center">
            {isDragActive
              ? `Drop the ${label.toLowerCase()} here`
              : `Drag and drop ${label.toLowerCase()}, or`}
          </p>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="mt-2 gap-2"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            <Upload className="h-4 w-4" />
            Choose File
          </Button>
          <p className="text-helper mt-2 text-muted-foreground text-center">
            {acceptedFormats.join(", ").toUpperCase()} up to {maxSize}MB
          </p>
        </div>
      </div>
      {showHints && aspectRatio === "banner" && (
        <p className="text-helper text-muted-foreground">
          Recommended banner size: 1200x300px for best display.
        </p>
      )}
      {showHints && aspectRatio === "square" && (
        <p className="text-helper text-muted-foreground">
          Recommended logo size: 512x512px for best display.
        </p>
      )}
    </div>
  );
}; 