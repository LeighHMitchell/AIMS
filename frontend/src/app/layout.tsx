import React, { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { UserProvider } from "@/hooks/useUser"
import { UserMenu } from "@/components/UserMenu"
import { SettingsMenu } from "@/components/SettingsMenu"
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext"
import { LoadingBarProvider } from "@/components/providers/LoadingBarProvider"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { TourProvider } from "@/components/tour/TourProvider"
import { Toaster } from "sonner"
import { MobileGate } from "@/components/MobileGate"

export const metadata: Metadata = {
  title: "æther",
  description: "Development Finance Information, Simplified.",
  icons: {
    icon: '/images/Aether Logo.001.jpeg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
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
      <body className={`${GeistSans.className} ${GeistMono.variable} antialiased`}>
        <SystemSettingsProvider>
          <QueryProvider>
            <UserProvider>
              <MobileGate>
                <Suspense fallback={null}>
                  <LoadingBarProvider>
                    <TourProvider>
                      {children}
                    </TourProvider>
                  </LoadingBarProvider>
                </Suspense>
              </MobileGate>
              <Toaster
                position="top-center"
                richColors
                closeButton
                duration={5000}
                visibleToasts={5}
                expand={true}
                gap={12}
                toastOptions={{
                  style: {
                    fontSize: '14px',
                  },
                  actionButtonStyle: {
                    backgroundColor: 'hsl(var(--success-text))',
                    color: 'hsl(var(--primary-foreground))',
                    fontWeight: 500,
                  },
                }}
              />
            </UserProvider>
          </QueryProvider>
        </SystemSettingsProvider>
      </body>
    </html>
  )
}
