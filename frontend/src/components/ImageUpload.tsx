import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": acceptedFormats,
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const removeImage = () => {
    setPreview(null);
    onImageChange(null);
    toast.success(`${label} removed`);
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
          <p className="text-xs text-gray-500">
            Recommended banner size: 1200x300px for best display.
          </p>
        )}
        {showHints && aspectRatio === "square" && (
          <p className="text-xs text-gray-500">
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
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} id={id} />
        <div className="h-full flex flex-col items-center justify-center text-gray-500">
          <ImageIcon className="h-12 w-12 mb-3" />
          <p className="text-sm font-medium">
            {isDragActive
              ? `Drop the ${label.toLowerCase()} here`
              : `Drag & drop ${label.toLowerCase()} here`}
          </p>
          <p className="text-xs mt-1">or click to select</p>
          <p className="text-xs mt-2 text-gray-400">
            {acceptedFormats.join(", ").toUpperCase()} up to {maxSize}MB
          </p>
        </div>
      </div>
      {showHints && aspectRatio === "banner" && (
        <p className="text-xs text-gray-500">
          Recommended banner size: 1200x300px for best display.
        </p>
      )}
      {showHints && aspectRatio === "square" && (
        <p className="text-xs text-gray-500">
          Recommended logo size: 512x512px for best display.
        </p>
      )}
    </div>
  );
}; 