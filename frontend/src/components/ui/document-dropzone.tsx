"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import { format } from "date-fns";

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  signedUrl?: string;
  uploadedAt: string;
  category: string;
  uploadedBy?: string | null;
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
    return <FileImage className="h-4 w-4 text-muted-foreground" />;
  if (mimeType.includes("pdf"))
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Docs that have been optimistically removed from the visible table but
  // whose DELETE call hasn't fired yet (inside the 5s undo window).
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const deferredRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      deferredRef.current.forEach((t) => clearTimeout(t));
      deferredRef.current.clear();
    };
  }, []);

  const startRename = (doc: UploadedDocument) => {
    setRenamingId(doc.id);
    setRenameValue(doc.fileName);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const submitRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    const original = documents.find((d) => d.id === renamingId);
    if (!original) return cancelRename();
    if (!trimmed || trimmed === original.fileName) return cancelRename();

    setRenameSaving(true);
    try {
      const response = await apiFetch(
        `/api/activities/${activityId}/government-input-documents?docId=${renamingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: trimmed }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Rename failed");
      }
      const data = await response.json();
      const updated: UploadedDocument = data.document;
      onDocumentsChange(
        documents.map((d) => (d.id === renamingId ? { ...d, fileName: updated.fileName } : d))
      );
      toast.success("Document renamed");
      cancelRename();
    } catch (err: any) {
      console.error("Rename error:", err);
      toast.error(`Rename failed: ${err.message}`);
    } finally {
      setRenameSaving(false);
    }
  };

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

  // Actually delete via the API — called after the 5s undo window elapses.
  const executeDelete = async (docId: string) => {
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
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(`Failed to delete: ${err.message}`);
      // Restore the row so it isn't ghosted in the UI
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    } finally {
      setDeletingId(null);
    }
  };

  // User clicked "Remove" in the confirm dialog — optimistically hide the row
  // and start the undo timer.
  const confirmDeletion = () => {
    const docId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!docId) return;

    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.add(docId);
      return next;
    });

    const timeoutId = setTimeout(() => {
      deferredRef.current.delete(docId);
      executeDelete(docId);
    }, 5000);
    deferredRef.current.set(docId, timeoutId);

    toast("Document removed", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          const t = deferredRef.current.get(docId);
          if (t) {
            clearTimeout(t);
            deferredRef.current.delete(docId);
          }
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(docId);
            return next;
          });
        },
      },
    });
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
            <p className="text-body text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-body font-medium text-primary">
                Drop files here
              </p>
            ) : (
              <>
                <p className="text-body font-medium text-foreground">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-helper text-muted-foreground">
                  PDF, Word, Excel, images up to {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Document list — excludes docs inside the 5s undo window */}
      {documents.some((d) => !pendingDeleteIds.has(d.id)) && (
        <div className="relative w-full overflow-x-auto overflow-y-visible">
          <table className="w-full caption-bottom text-body border border-border dark:border-gray-700 rounded-lg">
            <thead className="bg-surface-muted">
              <tr>
                <th className="w-8 p-2" />
                <th className="text-left p-2 font-medium text-helper">File name</th>
                <th className="text-right p-2 font-medium text-helper w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.filter((d) => !pendingDeleteIds.has(d.id)).map((doc) => {
                const isRenaming = renamingId === doc.id;
                return (
                  <tr key={doc.id} className="hover:bg-muted/50 group">
                    <td className="p-2 align-top">{getFileIcon(doc.mimeType)}</td>
                    <td className="p-2 align-top">
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              submitRename();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelRename();
                            }
                          }}
                          onBlur={() => {
                            if (!renameSaving) submitRename();
                          }}
                          disabled={renameSaving}
                          className="w-full px-2 py-1 text-body font-medium border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <div className="min-w-0">
                          <span
                            className="text-body font-medium truncate block cursor-text"
                            onDoubleClick={() => !disabled && startRename(doc)}
                            title="Double-click to rename"
                          >
                            {doc.fileName}
                          </span>
                          <span className="text-helper text-muted-foreground block">
                            {formatFileSize(doc.fileSize)}
                            {doc.uploadedAt && (
                              <> · Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</>
                            )}
                            {doc.uploadedBy && (
                              <> by {doc.uploadedBy}</>
                            )}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-2 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isRenaming ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={submitRename}
                              disabled={renameSaving}
                              title="Save"
                            >
                              {renameSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={cancelRename}
                              disabled={renameSaving}
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
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
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(doc);
                              }}
                              disabled={disabled}
                              title="Rename"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(doc.id);
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const doc = confirmDeleteId
                  ? documents.find((d) => d.id === confirmDeleteId)
                  : null;
                return doc ? (
                  <>
                    You're about to remove <span className="font-medium">{doc.fileName}</span>. You'll have 5 seconds to undo before it's permanently deleted.
                  </>
                ) : (
                  <>You'll have 5 seconds to undo before it's permanently deleted.</>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeletion}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
