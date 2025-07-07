import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }

      setUploading(true);

      try {
        // Create preview
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
        reader.readAsDataURL(file);
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
        <div className="relative h-48 rounded-lg overflow-hidden group bg-gray-50 flex items-center justify-center">
          <div className="relative w-32 h-32 rounded-lg overflow-hidden group border-2 border-gray-200">
            <img
              src={preview}
              alt="Activity icon"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={uploading}
                  className="h-8 text-xs px-2"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Replace
                </Button>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={removeIcon}
                disabled={uploading}
                className="h-8 text-xs px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Icon appears in activity cards and profile views
        </p>
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
        <div className="flex flex-col items-center justify-center text-gray-500">
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-3">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-sm font-medium">
            {isDragActive ? "Drop the icon here" : "Drag & drop an icon here"}
          </p>
          <p className="text-xs mt-1">or click to select</p>
          <p className="text-xs mt-2 text-gray-400">PNG, JPG, GIF up to 2MB (512x512px)</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Icon appears in activity cards and profile views
      </p>
    </div>
  );
};