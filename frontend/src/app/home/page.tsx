"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-fetch"
import { AuthGuard } from "@/components/AuthGuard"
import { useUser } from "@/hooks/useUser"
import { Shield } from "lucide-react"
import { USER_ROLES } from "@/types/user"
import type { ModuleStats } from "@/types/project-bank"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const router = useRouter()
  const { user } = useUser()
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
      description: "The national development project pipeline. Submit new projects, track appraisal status, and publish funding gaps.",
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
      description: "Development Finance Management Information System. All ODA activities — both donor-reported and projects routed from the Project Bank.",
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
      description: "State-owned land inventory. Browse available parcels, track allocations to PPP and private sector projects.",
      stats: stats ? [
        `${stats.landBank.parcels} parcels`,
        `${stats.landBank.hectaresAvailable.toLocaleString()} ha available`,
      ] : [],
      action: "Enter Land Bank",
    },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="flex items-center justify-center min-h-screen px-6">
          <div className="max-w-[900px] w-full text-center">
            <div className="mb-10">
              <h1 className="text-2xl font-semibold">
                Development Finance Management Information System
              </h1>
              <p className="text-muted-foreground mt-2">
                Select a module to get started.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {modules.map((m) => (
                <div
                  key={m.key}
                  className="relative flex flex-col rounded-lg shadow-sm ring-1 ring-inset ring-border bg-background hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all overflow-hidden h-[280px] group"
                >
                  {/* Background illustration — top-aligned */}
                  <div className="relative h-[120px] flex-shrink-0">
                    <Image
                      src={m.image}
                      alt={m.label}
                      fill
                      className="object-contain opacity-[0.12] p-4 transition-opacity group-hover:opacity-[0.18]"
                    />
                  </div>

                  {/* Text overlay */}
                  <div className="relative z-10 p-5 flex-1 flex flex-col justify-end">
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

            {/* Admin link */}
            {user?.role === USER_ROLES.SUPER_USER && (
              <div className="mt-8">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Admin Settings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
