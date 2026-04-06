"use client"

import React, { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Activity,
  Building2,
  Globe,
  Search,
  BarChart3,
  ArrowRight,
  UserPlus,
  LogIn,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { isVisitorUser, exitVisitorMode } from "@/lib/visitor"
import { apiFetch } from "@/lib/api-fetch"
import { Skeleton } from "@/components/ui/skeleton"

interface VisitorStats {
  totalActivities: number
  totalOrganizations: number
  totalTransactionValueUSD: number
}

export default function VisitorHomePage() {
  const router = useRouter()
  const { user, setUser } = useUser()
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await apiFetch("/api/dashboard/hero-stats")
        if (res.ok) {
          const data = await res.json()
          setStats({
            totalActivities: data.totalActivities || 0,
            totalOrganizations: data.totalOrganizations || 0,
            totalTransactionValueUSD: data.totalTransactionValueUSD || data.totalDisbursementsUSD || 0,
          })
        }
      } catch (err) {
        console.error("[Visitor] Failed to fetch stats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleSignIn = () => {
    exitVisitorMode(setUser)
    router.push("/login")
  }

  const quickLinks = [
    { label: "Activities", href: "/activities", icon: Activity, description: "Browse all development activities" },
    { label: "Organizations", href: "/organizations", icon: Building2, description: "Explore partner organizations" },
    { label: "Atlas", href: "/atlas", icon: Globe, description: "Geographic view of activities" },
    { label: "Search", href: "/search", icon: Search, description: "Search across all data" },
    { label: "Analytics", href: "/analytics-dashboard", icon: BarChart3, description: "View analytics dashboards" },
    { label: "Sectors", href: "/sectors", icon: TrendingUp, description: "Browse by sector" },
  ]

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Banner */}
        <Card className="bg-surface-muted border-0">
          <CardContent className="py-8 px-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome to <span className="font-bold">aether</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  You are browsing as a visitor. Sign up for full access to create and manage activities.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSignIn}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Link href="/register">
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                  {loading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalActivities?.toLocaleString() ?? "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organizations</p>
                  {loading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalOrganizations?.toLocaleString() ?? "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Volume</p>
                  {loading ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalTransactionValueUSD ? formatCurrency(stats.totalTransactionValueUSD) : "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Explore</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <link.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{link.label}</h3>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
