"use client"

import { Monitor, X } from "lucide-react"
import { useEffect, useState } from "react"

const DISMISS_KEY = "aims.small-screen-notice.dismissed"

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
  }

  return (
    <>
      {children}
      {!dismissed && (
        <div
          role="status"
          className="md:hidden fixed bottom-4 left-4 right-4 z-[9999] flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">
              Best on a bigger screen
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This tool works best on a computer — some features may be hard to use here.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  )
}
