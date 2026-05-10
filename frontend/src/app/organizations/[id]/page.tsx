"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { OrganizationProfileV2View } from "@/components/profile/OrganizationProfileV2View"
import { apiFetch } from "@/lib/api-fetch"

const KNOWN_TABS = new Set(["overview", "activities", "finances", "locations", "partnerships", "documents", "people"])

export default function OrganizationProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params?.id as string

  const [organization, setOrganization] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Active tab is driven from the URL search param so back/forward navigation
  // and shareable links continue to work. Defaults to "overview" if missing or
  // unknown.
  const tabFromUrl = searchParams?.get("tab") ?? ""
  const activeTab = KNOWN_TABS.has(tabFromUrl) ? tabFromUrl : "overview"

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams?.toString() ?? "")
    if (tab === "overview") next.delete("tab")
    else next.set("tab", tab)
    const qs = next.toString()
    router.replace(qs ? `/organizations/${id}?${qs}` : `/organizations/${id}`, { scroll: false })
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/api/organizations/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Organisation not found" : "Failed to load organisation")
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setOrganization(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-border border-t-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading organisation…</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error || !organization) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Organisation unavailable</h2>
            <p className="text-muted-foreground">{error ?? "Could not load the organisation."}</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <OrganizationProfileV2View
        organization={organization}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </MainLayout>
  )
}
