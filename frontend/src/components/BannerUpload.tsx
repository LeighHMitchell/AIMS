import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BannerUploadProps {
  currentBanner?: string;
  onBannerChange: (banner: string | null) => void;
  activityId: string;
}

export const BannerUpload: React.FC<BannerUploadProps> = ({
  currentBanner,
  onBannerChange,
  activityId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentBanner || null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setUploading(true);

      try {
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setPreview(base64String);
          onBannerChange(base64String);
          if (activityId && activityId !== "new") {
            toast.success("Banner uploaded and saved successfully");
          } else {
            toast.success("The banner has been uploaded and will be saved after activity creation.");
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Error uploading banner:", error);
        toast.error("Failed to upload banner");
      } finally {
        setUploading(false);
      }
    },
    [onBannerChange, activityId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const removeBanner = () => {
    setPreview(null);
    onBannerChange(null);
    if (activityId && activityId !== "new") {
      toast.success("Banner removed and saved successfully");
    } else {
      toast.success("The banner has been removed and will be saved after activity creation.");
    }
  };

  if (preview) {
    return (
      <div className="space-y-2">
        <div className="relative h-48 rounded-lg overflow-hidden group">
          <img
            src={preview}
            alt="Activity banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
              onClick={removeBanner}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`
          h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="h-full flex flex-col items-center justify-center text-gray-500">
          <ImageIcon className="h-12 w-12 mb-3" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop the image here" : "Drag & drop a banner image here"}
          </p>
          <p className="text-xs mt-1">or click to select</p>
          <p className="text-xs mt-2 text-gray-400">PNG, JPG, GIF up to 5MB</p>
        </div>
      </div>

    </div>
  );
}; 