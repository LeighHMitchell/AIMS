"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { LAND_DOCUMENT_TYPE_LABELS } from "@/lib/land-bank-utils"
import type { LandParcelDocument, LandDocumentType } from "@/types/land-bank"

interface ParcelDocumentUploadProps {
  parcelId: string
  documents: LandParcelDocument[]
  canManage: boolean
  onDocumentsChange: () => void
}

export function ParcelDocumentUpload({
  parcelId,
  documents,
  canManage,
  onDocumentsChange,
}: ParcelDocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [documentType, setDocumentType] = useState<string>("other")
  const [description, setDescription] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !documentType) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("document_type", documentType)
      if (description.trim()) {
        formData.append("description", description.trim())
      }

      const res = await apiFetch(`/api/land-bank/${parcelId}/documents`, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        setDescription("")
        onDocumentsChange()
      }
    } catch {
      // silent
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ""
    }
  }, [parcelId, documentType, description, onDocumentsChange])

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return
    setDeletingId(docId)
    try {
      const res = await apiFetch(`/api/land-bank/${parcelId}/documents/${docId}`, {
        method: "DELETE",
      })
      if (res.ok) onDocumentsChange()
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Upload section */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(LAND_DOCUMENT_TYPE_LABELS) as [LandDocumentType, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
            </div>
            <div className="relative">
              <input
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
              />
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Upload className="h-8 w-8" />
                    <p className="text-sm">Click or drag to upload a file</p>
                    <p className="text-xs">PDF, DOC, XLSX, PNG, JPG up to 50MB</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No documents uploaded yet.
            </div>
          ) : (
            <div className="divide-y">
              {documents.map(doc => (
                <div key={doc.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {LAND_DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                        {" · "}
                        {formatFileSize(doc.file_size)}
                        {" · "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.signed_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" title="Download">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
