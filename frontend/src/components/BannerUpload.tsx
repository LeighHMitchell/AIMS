import React, { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, Move, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

interface BannerUploadProps {
  currentBanner?: string;
  currentPosition?: number; // 0-100, represents Y position percentage
  onBannerChange: (banner: string | null, position?: number) => void;
  activityId: string;
}

export const BannerUpload: React.FC<BannerUploadProps> = ({
  currentBanner,
  currentPosition = 50, // Default to center
  onBannerChange,
  activityId,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentBanner || null);
  const [position, setPosition] = useState<number>(currentPosition);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startPositionRef = useRef<number>(0);

  // Update preview when currentBanner changes
  useEffect(() => {
    setPreview(currentBanner || null);
  }, [currentBanner]);

  // Update position when currentPosition changes
  useEffect(() => {
    setPosition(currentPosition);
  }, [currentPosition]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Validate file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size should be less than 10MB");
        return;
      }

      setUploading(true);

      try {
        // Compress the image before converting to base64
        const compressionOptions = {
          maxSizeMB: 0.3, // Target ~300KB for banners
          maxWidthOrHeight: 1920, // Good quality for banner display
          useWebWorker: true,
        };

        const compressedFile = await imageCompression(file, compressionOptions);
        console.log(`Banner compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);

        // Create preview from compressed file
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setPreview(base64String);
          setPosition(50); // Reset to center for new images
          onBannerChange(base64String, 50);
          if (activityId && activityId !== "new") {
            toast.success("Banner uploaded successfully. You can now reposition it.");
          } else {
            toast.success("Banner uploaded. You can reposition it before saving.");
          }
        };
        reader.readAsDataURL(compressedFile);
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
    disabled: uploading || isRepositioning,
  });

  const removeBanner = () => {
    setPreview(null);
    setPosition(50);
    onBannerChange(null);
    if (activityId && activityId !== "new") {
      toast.success("Banner removed successfully");
    } else {
      toast.success("Banner removed");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioning) return;
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startPositionRef.current = position;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.clientY - startYRef.current;
      // Invert the direction: dragging down should move the image up (decrease position)
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newPosition = Math.max(0, Math.min(100, startPositionRef.current - deltaPercent));
      setPosition(newPosition);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isRepositioning) return;
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startPositionRef.current = position;
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      e.preventDefault();

      const containerHeight = containerRef.current.offsetHeight;
      const deltaY = e.touches[0].clientY - startYRef.current;
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newPosition = Math.max(0, Math.min(100, startPositionRef.current - deltaPercent));
      setPosition(newPosition);
    },
    [isDragging]
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
    onBannerChange(preview, position);
    toast.success("Banner position saved");
  };

  const cancelReposition = () => {
    setIsRepositioning(false);
    setPosition(currentPosition); // Reset to original position
  };

  if (preview) {
    return (
      <div className="space-y-3">
        <div
          ref={containerRef}
          className={`relative h-48 rounded-lg overflow-hidden group ${
            isRepositioning ? "cursor-grab" : ""
          } ${isDragging ? "cursor-grabbing" : ""}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <img
            src={preview}
            alt="Activity banner"
            className="w-full h-full object-cover select-none"
            style={{ objectPosition: `center ${position}%` }}
            draggable={false}
          />

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

          {/* Normal hover overlay */}
          {!isRepositioning && (
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsRepositioning(true)}
                disabled={uploading}
              >
                <Move className="h-4 w-4 mr-2" />
                Reposition
              </Button>
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
          )}
        </div>

        {/* Reposition controls */}
        {isRepositioning && (
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Position: {Math.round(position)}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                className="w-24 h-2 accent-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={cancelReposition}>
                Cancel
              </Button>
              <Button size="sm" onClick={savePosition}>
                <Check className="h-4 w-4 mr-2" />
                Save Position
              </Button>
            </div>
          </div>
        )}
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
          <p className="text-xs mt-2 text-gray-400">PNG, JPG, GIF up to 10MB (auto-compressed)</p>
        </div>
      </div>
    </div>
  );
};
