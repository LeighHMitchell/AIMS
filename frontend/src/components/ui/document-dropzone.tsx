"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  signedUrl?: string;
  uploadedAt: string;
  category: string;
}

interface DocumentDropzoneProps {
  activityId: string;
  /** Category tag to organize documents (e.g., "budget-supporting", "agreement", "evaluation") */
  category: string;
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
  /** Max file size in bytes (default 10MB) */
  maxSize?: number;
  /** Accepted MIME types */
  accept?: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/"))
    return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mimeType.includes("pdf"))
    return <FileText className="h-4 w-4 text-red-500" />;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return <FileSpreadsheet className="h-4 w-4 text-[hsl(var(--success-icon))]" />;
  return <File className="h-4 w-4 text-slate-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDropzone({
  activityId,
  category,
  documents,
  onDocumentsChange,
  maxSize = 10 * 1024 * 1024,
  accept = {
    "application/pdf": [".pdf"],
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "text/csv": [".csv"],
  },
  disabled = false,
  className,
}: DocumentDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      const newDocs: UploadedDocument[] = [];

      for (const file of acceptedFiles) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("category", category);

          const response = await apiFetch(
            `/api/activities/${activityId}/government-input-documents`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Upload failed");
          }

          const data = await response.json();
          newDocs.push(data.document);
        } catch (err: any) {
          console.error("Upload error:", err);
          toast.error(`Failed to upload ${file.name}: ${err.message}`);
        }
      }

      if (newDocs.length > 0) {
        onDocumentsChange([...documents, ...newDocs]);
        toast.success(
          `${newDocs.length} document${newDocs.length > 1 ? "s" : ""} uploaded`
        );
      }
      setUploading(false);
    },
    [activityId, category, documents, onDocumentsChange]
  );

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      const response = await apiFetch(
        `/api/activities/${activityId}/government-input-documents?docId=${docId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Delete failed");
      }

      onDocumentsChange(documents.filter((d) => d.id !== docId));
      toast.success("Document removed");
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled: disabled || uploading,
    onDropRejected: (rejections) => {
      rejections.forEach((rejection) => {
        rejection.errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast.error(
              `${rejection.file.name} exceeds ${formatFileSize(maxSize)} limit`
            );
          } else {
            toast.error(`${rejection.file.name}: ${error.message}`);
          }
        });
      });
    },
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-input hover:border-slate-400",
          (disabled || uploading) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-slate-400" />
            {isDragActive ? (
              <p className="text-sm font-medium text-primary">
                Drop files here
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, Excel, images up to {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-2.5 bg-slate-50 border rounded-lg group"
            >
              {getFileIcon(doc.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.signedUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(doc.signedUrl, "_blank");
                    }}
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  disabled={deletingId === doc.id || disabled}
                  title="Remove"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
