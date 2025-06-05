import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { UserProvider } from "@/hooks/useUser"
import { UserMenu } from "@/components/UserMenu"
import { SettingsMenu } from "@/components/SettingsMenu"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AIMS - Aid Information Management System",
  description: "Streamlining aid coordination and transparency",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          {children}
          <Toaster position="top-right" richColors />
        </UserProvider>
      </body>
    </html>
  )
}
