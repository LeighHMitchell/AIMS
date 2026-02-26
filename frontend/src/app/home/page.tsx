"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-fetch"
import type { ModuleStats } from "@/types/project-bank"
import { MainLayout } from "@/components/layout/main-layout"

export default function HomePage() {
  const router = useRouter()
  const [stats, setStats] = useState<ModuleStats | null>(null)

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
    <MainLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
        <div className="max-w-[900px] w-full text-center">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight">
              Aether
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              The single source of truth for development finance and public investment coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {modules.map((m) => (
              <div
                key={m.key}
                className="relative flex flex-col justify-end rounded-lg shadow-sm ring-1 ring-inset ring-border bg-background hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all overflow-hidden h-[280px] group"
              >
                {/* Background illustration */}
                <Image
                  src={m.image}
                  alt={m.label}
                  fill
                  className="object-contain opacity-[0.12] p-6 transition-opacity group-hover:opacity-[0.18]"
                />

                {/* Text overlay */}
                <div className="relative z-10 p-5">
                  <h2 className="text-base font-semibold">{m.label}</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {m.description}
                  </p>
                  {m.stats.length > 0 && (
                    <div className="flex gap-3 mt-2">
                      {m.stats.map((s, i) => (
                        <span key={i} className="text-[11px] text-muted-foreground/70">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    className="w-full mt-3 bg-foreground text-background hover:bg-foreground/90"
                    size="sm"
                    onClick={() => router.push(m.href)}
                  >
                    {m.action}
                  </Button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </MainLayout>
  )
}
