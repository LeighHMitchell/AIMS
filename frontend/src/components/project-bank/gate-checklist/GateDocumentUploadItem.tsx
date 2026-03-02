"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import type { DocumentType } from "@/types/project-bank"

const ACCEPTED_EXTENSIONS = ".pdf,.xls,.xlsx,.doc,.docx,.csv,.png,.jpg,.jpeg,.gif,.webp"
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

interface GateDocumentUploadItemProps {
  projectId: string
  documentType: DocumentType
  label: string
  existingFileName?: string | null
  onUploaded: () => void
}

export function GateDocumentUploadItem({
  projectId,
  documentType,
  label,
  existingFileName,
  onUploaded,
}: GateDocumentUploadItemProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(existingFileName || null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      setError("File exceeds 50 MB limit")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("document_type", documentType)
      formData.append("upload_stage", "gate_checklist")

      const res = await apiFetch(`/api/project-bank/${projectId}/documents`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Upload failed")
        return
      }

      setUploadedName(file.name)
      onUploaded()
    } catch {
      setError("Network error")
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  if (uploadedName) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-green-50 text-sm">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate flex-1">{uploadedName}</span>
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      </div>
    )
  }

  if (uploading) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>Uploading...</span>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 py-1.5 px-2 rounded-md border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/30 transition-colors text-sm text-muted-foreground w-full text-left"
      >
        <Upload className="h-4 w-4 shrink-0" />
        <span>Upload {label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600 mt-1 px-2">{error}</p>}
    </div>
  )
}
