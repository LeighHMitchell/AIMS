"use client"

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CopyableIdentifierProps {
  value: string
  label?: string
}

export function CopyableIdentifier({ value, label }: CopyableIdentifierProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono">
        {value}
      </code>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-6 w-6 p-0 hover:bg-slate-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-slate-600" />
        )}
      </Button>
      {label && (
        <span className="text-xs text-slate-500">{label}</span>
      )}
    </div>
  )
}



