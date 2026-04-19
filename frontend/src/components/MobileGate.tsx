"use client"

import { Monitor } from "lucide-react"

export function MobileGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile blocking screen - visible on screens smaller than lg (1024px) */}
      <div className="flex lg:hidden fixed inset-0 z-[9999] bg-white flex-col items-center justify-center p-8 text-center">
        <div className="flex flex-col items-center gap-6 max-w-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <Monitor className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              Move to your computer
            </p>
            <p className="text-body text-muted-foreground leading-relaxed">
              This tool needs your full attention (and works best on bigger screens)
            </p>
          </div>
        </div>
      </div>

      {/* App content - only visible on lg screens and above */}
      <div className="hidden lg:contents">
        {children}
      </div>
    </>
  )
}
