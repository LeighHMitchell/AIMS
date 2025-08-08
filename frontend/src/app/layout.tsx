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
  title: "æther",
  description: "Development Finance Information, Simplified.",
  icons: {
    icon: '/images/Aether Logo.001.jpeg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className={inter.className}>
        <UserProvider>
          {children}
          <Toaster 
            position="top-right" 
            richColors 
            closeButton 
            duration={5000}
            toastOptions={{
              style: {
                fontSize: '14px',
              },
            }}
          />
        </UserProvider>
      </body>
    </html>
  )
}
