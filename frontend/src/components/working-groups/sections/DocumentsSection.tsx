"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Upload, FileText, Download, Trash2, Pencil } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Document {
  id: string
  title: string
  description?: string
  file_url: string
  document_type: string
  uploaded_at: string
  uploaded_by_name?: string
}

const DOC_TYPE_OPTIONS = [
  { value: 'terms_of_reference', label: 'Terms of Reference' },
  { value: 'report', label: 'Report' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
]

const getDocTypeLabel = (type: string) => {
  return DOC_TYPE_OPTIONS.find(d => d.value === type)?.label || type
}

const getDocIcon = (type: string) => {
  switch (type) {
    case 'terms_of_reference': return '📋'
    case 'report': return '📊'
    case 'presentation': return '📽️'
    case 'photo': return '📷'
    default: return '📄'
  }
}

interface DocumentsSectionProps {
  workingGroupId: string
}

export default function DocumentsSection({ workingGroupId }: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [docToDelete, setDocToDelete] = useState<Document | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit form
  const [docToEdit, setDocToEdit] = useState<Document | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState('other')
  const [editSaving, setEditSaving] = useState(false)

  // Upload form
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadType, setUploadType] = useState('other')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/documents`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }, [workingGroupId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) {
      toast.error('File and title are required')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', uploadTitle.trim())
      if (uploadDescription.trim()) formData.append('description', uploadDescription.trim())
      formData.append('document_type', uploadType)

      const res = await fetch(`/api/working-groups/${workingGroupId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      toast.success('Document uploaded')
      setShowUploadDialog(false)
      setUploadTitle('')
      setUploadDescription('')
      setUploadType('other')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchDocuments()
    } catch (error: any) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!docToDelete) return
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/documents`, {
        method: 'DELETE',
        body: JSON.stringify({ document_id: docToDelete.id }),
      })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete document')
      toast.success('Document deleted')
      setDocToDelete(null)
      fetchDocuments()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document')
    }
  }

  const openEditModal = (doc: Document) => {
    setDocToEdit(doc)
    setEditTitle(doc.title)
    setEditDescription(doc.description || '')
    setEditType(doc.document_type)
  }

  const handleEditDocument = async () => {
    if (!docToEdit || !editTitle.trim()) {
      toast.error('Title is required')
      return
    }
    setEditSaving(true)
    try {
      const res = await apiFetch(`/api/working-groups/${workingGroupId}/documents`, {
        method: 'PUT',
        body: JSON.stringify({
          document_id: docToEdit.id,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          document_type: editType,
        }),
      })
      if (!res.ok) throw new Error('Failed to update document')
      toast.success('Document updated')
      setDocToEdit(null)
      fetchDocuments()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update document')
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-20 bg-gray-100 rounded" /><div className="h-20 bg-gray-100 rounded" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Documents & Media</h2>
          <p className="text-sm text-gray-500 mt-1">Upload and manage working group documents</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
          <p className="text-xs text-muted-foreground mt-1">Upload documents to share with working group members</p>
          <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="mt-4 gap-2">
            <Upload className="h-4 w-4" />
            Upload First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getDocIcon(doc.document_type)}</span>
                    <div>
                      <h4 className="font-medium">{doc.title}</h4>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getDocTypeLabel(doc.document_type)}
                        </Badge>
                        <p className="text-xs text-gray-500">
                          Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(doc)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setDocToDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a document to this working group</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>File <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadTitle.trim()}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={!!docToEdit} onOpenChange={(v) => { if (!v) setDocToEdit(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update document details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocToEdit(null)}>Cancel</Button>
            <Button onClick={handleEditDocument} disabled={editSaving || !editTitle.trim()}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{docToDelete?.title}&quot;? The file will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
