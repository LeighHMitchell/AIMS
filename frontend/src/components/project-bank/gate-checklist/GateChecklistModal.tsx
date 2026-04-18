"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { GateDocumentUploadItem } from "./GateDocumentUploadItem"
import type { ProjectDocument, DocumentType } from "@/types/project-bank"

export interface ChecklistItem {
  key: string
  label: string
  type: "checkbox" | "document"
  documentType?: DocumentType
  documentLabel?: string
}

interface GateChecklistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  projectId: string
  items: ChecklistItem[]
  existingDocuments: ProjectDocument[]
  onDocumentUploaded: () => void
  children?: ReactNode
  onConfirm: () => void
  confirmLabel?: string
  confirming?: boolean
}

export function GateChecklistModal({
  open,
  onOpenChange,
  title,
  description,
  projectId,
  items,
  existingDocuments,
  onDocumentUploaded,
  children,
  onConfirm,
  confirmLabel = "Confirm",
  confirming = false,
}: GateChecklistModalProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  // Reset checks when modal opens/closes
  useEffect(() => {
    if (open) {
      const initial: Record<string, boolean> = {}
      items.forEach(item => {
        if (item.type === "document" && item.documentType) {
          // Auto-check if a matching document already exists
          const exists = existingDocuments.some(d => d.document_type === item.documentType)
          initial[item.key] = exists
        } else {
          initial[item.key] = false
        }
      })
      setChecks(initial)
    }
  }, [open, items, existingDocuments])

  // Update document checks when existingDocuments changes (after upload)
  useEffect(() => {
    if (!open) return
    setChecks(prev => {
      const next = { ...prev }
      items.forEach(item => {
        if (item.type === "document" && item.documentType) {
          const exists = existingDocuments.some(d => d.document_type === item.documentType)
          if (exists) next[item.key] = true
        }
      })
      return next
    })
  }, [existingDocuments, items, open])

  const checkedCount = Object.values(checks).filter(Boolean).length
  const totalCount = items.length
  const allChecked = checkedCount === totalCount

  const handleToggle = (key: string, checked: boolean) => {
    setChecks(prev => ({ ...prev, [key]: checked }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {children}

          {/* Checklist items */}
          <div className="space-y-3">
            {items.map(item => {
              if (item.type === "document") {
                const existingDoc = existingDocuments.find(d => d.document_type === item.documentType)
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={checks[item.key] || false}
                        disabled
                        className="pointer-events-none"
                      />
                      <span className="text-body">{item.label}</span>
                    </div>
                    <div className="ml-6">
                      <GateDocumentUploadItem
                        projectId={projectId}
                        documentType={item.documentType!}
                        label={item.documentLabel || item.label}
                        existingFileName={existingDoc?.file_name || null}
                        onUploaded={onDocumentUploaded}
                      />
                    </div>
                  </div>
                )
              }

              return (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={checks[item.key] || false}
                    onCheckedChange={(v) => handleToggle(item.key, v === true)}
                  />
                  <span className="text-body">{item.label}</span>
                </label>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-helper text-muted-foreground">
              <span>{checkedCount} / {totalCount} requirements met</span>
              {allChecked && <span className="text-[hsl(var(--success-icon))] font-medium">All complete</span>}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!allChecked || confirming}>
            {confirming ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
