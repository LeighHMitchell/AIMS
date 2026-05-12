"use client"

import React from "react"
import { Copy } from "lucide-react"
import { toast } from "sonner"

interface EmailCellProps {
  email: string
}

export function EmailCell({ email }: EmailCellProps) {
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(email).then(
      () => toast.success("Email copied to clipboard"),
      () => toast.error("Failed to copy email"),
    )
  }
  return (
    <span className="group inline-flex items-center gap-1.5">
      <a href={`mailto:${email}`} className="break-all no-underline hover:no-underline">
        {email}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        title="Copy email"
        aria-label="Copy email"
      >
        <Copy className="h-3 w-3" />
      </button>
    </span>
  )
}
