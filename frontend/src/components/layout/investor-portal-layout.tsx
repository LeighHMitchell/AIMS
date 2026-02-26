"use client"

import React from "react"
import Link from "next/link"

interface InvestorPortalLayoutProps {
  children: React.ReactNode
}

export function InvestorPortalLayout({ children }: InvestorPortalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/invest" className="text-xl font-bold text-foreground">
                Myanmar Investment Portal
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Register Interest
              </Link>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-sm text-muted-foreground text-center">
            Myanmar Aid Information Management System (AIMS) — Investment Portal
          </p>
        </div>
      </footer>
    </div>
  )
}
