"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { GlassButton } from "@/components/ui/glass-button"
import { apiFetch } from "@/lib/api-fetch"
import type { ModuleStats } from "@/types/project-bank"
import { MainLayout } from "@/components/layout/main-layout"
import { useUser } from "@/hooks/useUser"
import { AnimatePresence, motion } from "motion/react"
import { AppleHelloEnglishEffect } from "@/components/ui/apple-hello-effect"
import releases from "@/data/releases.json"

export default function HomePage() {
  const [stats, setStats] = useState<ModuleStats | null>(null)
  const { user } = useUser()
  const [showHello, setShowHello] = useState(false)
  const [writingDone, setWritingDone] = useState(false)

  // Show hello animation on first login or when there's a new version
  useEffect(() => {
    if (!user) return
    const key = `aims_hello_seen_${user.id}`
    const lastSeenVersion = localStorage.getItem(key)
    if (!lastSeenVersion || lastSeenVersion !== releases.currentVersion) {
      setShowHello(true)
    }
  }, [user])

  const handleHelloComplete = () => {
    if (writingDone) return // prevent double-fire
    setWritingDone(true)
    // Pause to show subtitle, then fade out blur + text together
    setTimeout(() => {
      setShowHello(false)
      setWritingDone(false)
      if (user) {
        localStorage.setItem(`aims_hello_seen_${user.id}`, releases.currentVersion)
      }
    }, 2500)
  }

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await apiFetch("/api/module-stats")
        if (res.ok) {
          setStats(await res.json())
        }
      } catch {
        // Stats are optional
      }
    }
    fetchStats()
  }, [])

  const modules = [
    {
      key: "project-bank",
      label: "Project Bank",
      href: "/project-bank",
      image: "/images/module-project-bank.png",
      description: "Structured pipeline and portfolio management. Submit new projects, track appraisal status, and coordinate public investment across the project lifecycle.",
      stats: stats ? [
        `${stats.projectBank.projects} projects`,
        `${stats.projectBank.fundingGaps} with funding gaps`,
      ] : [],
      action: "Enter Project Bank",
    },
    {
      key: "aims",
      label: "DFMIS",
      href: "/dashboard",
      image: "/images/module-aims.png",
      description: "Track commitments, disbursements, expenditure, and compliance. All ODA activities — donor-reported and projects routed from the Project Bank — published in IATI 2.03 format.",
      stats: stats ? [
        `${stats.aims.activities} activities`,
        `${stats.aims.donors} organizations`,
      ] : [],
      action: "Enter DFMIS",
    },
    {
      key: "land-bank",
      label: "Land Bank",
      href: "/land-bank",
      image: "/images/module-land-bank.png",
      description: "Geospatially anchored investment planning. Browse state-owned parcels, track allocations to PPP and private sector projects, and link land to pipeline investments.",
      stats: stats ? [
        `${stats.landBank.parcels} parcels`,
        `${stats.landBank.hectaresAvailable.toLocaleString()} ha available`,
      ] : [],
      action: "Enter Land Bank",
    },
  ]

  return (
    <>
      {/* Blur + hello animation — fade out together */}
      <AnimatePresence>
        {showHello && (
          <>
            {/* Full-screen blur overlay that covers sidebar + topnav + content */}
            <motion.div
              className="fixed inset-0 z-[10000] pointer-events-none"
              style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />

            {/* Hello animation overlay — above the blur */}
            <motion.div
              className="fixed inset-0 z-[10001] flex flex-col items-center justify-center cursor-pointer"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              onClick={handleHelloComplete}
            >
              <AppleHelloEnglishEffect
                className="h-24 sm:h-32 md:h-40 text-foreground"
                speed={0.6}
                onAnimationComplete={handleHelloComplete}
              />
              <AnimatePresence>
                {writingDone && (
                  <motion.div
                    className="mt-8 flex flex-col items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
                      Welcome to Aether
                    </p>
                    <p className="text-lg text-muted-foreground/60 font-light">
                      Version {releases.currentVersion}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MainLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
          <div className="max-w-4xl w-full text-center">
            <div className="mb-12">
              <h1 className="text-4xl font-bold tracking-tight">
                Aether
              </h1>
              <p className="text-muted-foreground mt-3 text-base max-w-xl mx-auto">
                The single source of truth for development finance and public investment coordination.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {modules.map((m) => (
                <div
                  key={m.key}
                  className="relative flex flex-col justify-end rounded-xl shadow-md ring-1 ring-inset ring-border bg-background hover:bg-muted/50 dark:hover:bg-gray-800/50 transition-all overflow-hidden h-[360px] group hover:shadow-lg hover:-translate-y-0.5"
                >
                  {/* Background illustration */}
                  <Image
                    src={m.image}
                    alt={m.label}
                    fill
                    className="object-contain opacity-[0.10] p-8 transition-opacity group-hover:opacity-[0.18]"
                  />

                  {/* Text overlay */}
                  <div className="relative z-10 p-6">
                    <h2 className="text-lg font-semibold">{m.label}</h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {m.description}
                    </p>
                    {m.stats.length > 0 && (
                      <div className="flex gap-4 mt-3">
                        {m.stats.map((s, i) => (
                          <span key={i} className="text-xs text-muted-foreground/70">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <GlassButton
                      asChild
                      className="w-full mt-4 bg-gray-900 hover:bg-gray-800"
                      size="default"
                    >
                      <Link href={m.href}>{m.action}</Link>
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </MainLayout>
    </>
  )
}
