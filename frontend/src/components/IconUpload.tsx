import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

interface IconUploadProps {
  currentIcon?: string;
  onIconChange: (icon: string | null) => void;
  activityId: string;
}

export const IconUpload: React.FC<IconUploadProps> = ({
  currentIcon,
  onIconChange,
  activityId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentIcon || null);

  // Sync preview with currentIcon prop changes (but only if it actually changed)
  useEffect(() => {
    setPreview(prev => {
      const newPreview = currentIcon || null;
      // Only update if it's actually different to prevent unnecessary re-renders
      return prev !== newPreview ? newPreview : prev;
    });
  }, [currentIcon]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setUploading(true);

      try {
        // Compress the image before converting to base64
        const compressionOptions = {
          maxSizeMB: 0.15, // Target ~150KB for icons
          maxWidthOrHeight: 512, // Icons don't need to be larger than 512px
          useWebWorker: true,
        };

        const compressedFile = await imageCompression(file, compressionOptions);
        console.log(`Icon compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);

        // Create preview from compressed file
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setPreview(base64String);
          onIconChange(base64String);
          if (activityId && activityId !== "new") {
            toast.success("Icon uploaded and saved successfully");
          } else {
            toast.success("The icon has been uploaded and will be saved after activity creation.");
          }
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error uploading icon:", error);
        toast.error("Failed to upload icon");
      } finally {
        setUploading(false);
      }
    },
    [onIconChange, activityId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const removeIcon = () => {
    setPreview(null);
    onIconChange(null);
    if (activityId && activityId !== "new") {
      toast.success("Icon removed and saved successfully");
    } else {
      toast.success("The icon has been removed and will be saved after activity creation.");
    }
  };

  if (preview) {
    return (
      <div className="h-full space-y-2">
        <div className="relative h-48 rounded-lg overflow-hidden group">
          <img
            src={preview}
            alt="Activity icon"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <Button
                size="sm"
                variant="secondary"
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace
              </Button>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={removeIcon}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="h-full space-y-2">
      <div
        {...getRootProps()}
        className={`
          h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors flex items-center justify-center
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="h-full flex flex-col items-center justify-center text-gray-500">
          <ImageIcon className="h-16 w-16 text-gray-400 mb-3" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop the icon here" : "Drag & drop an icon here"}
          </p>
          <p className="text-xs mt-1">or click to select</p>
          <p className="text-xs mt-2 text-gray-400 text-center">PNG, JPG, GIF up to 5MB (auto-compressed)</p>
        </div>
      </div>

    </div>
  );
};