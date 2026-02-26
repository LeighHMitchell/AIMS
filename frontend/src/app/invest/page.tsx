"use client"

import { useEffect, useState, useMemo } from "react"
import { InvestorPortalLayout } from "@/components/layout/investor-portal-layout"
import { InvestorFilterBar } from "@/components/invest/InvestorFilterBar"
import { InvestorParcelCard } from "@/components/invest/InvestorParcelCard"
import { InvestorProjectCard } from "@/components/invest/InvestorProjectCard"
import { InvestorMapView } from "@/components/invest/InvestorMapView"
import { MapPin, Briefcase, Loader2 } from "lucide-react"
import type { PublicParcel, PublicProject } from "@/types/land-bank"

type Tab = "parcels" | "projects"

export default function InvestPage() {
  const [activeTab, setActiveTab] = useState<Tab>("parcels")
  const [parcels, setParcels] = useState<PublicParcel[]>([])
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [regionFilter, setRegionFilter] = useState("all")
  const [classificationFilter, setClassificationFilter] = useState("all")
  const [assetTypeFilter, setAssetTypeFilter] = useState("all")

  useEffect(() => {
    async function fetchPublicData() {
      try {
        const [parcelsRes, projectsRes] = await Promise.all([
          fetch("/api/public/parcels"),
          fetch("/api/public/projects"),
        ])
        if (parcelsRes.ok) setParcels(await parcelsRes.json())
        if (projectsRes.ok) setProjects(await projectsRes.json())
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchPublicData()
  }, [])

  // Derive unique values for filters
  const classifications = useMemo(() => {
    const set = new Set(parcels.map(p => p.classification).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [parcels])

  const assetTypes = useMemo(() => {
    const set = new Set(parcels.map(p => p.asset_type).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [parcels])

  // Filtered parcels
  const filteredParcels = useMemo(() => {
    let list = parcels
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.parcel_code.toLowerCase().includes(q) ||
        (p.township || "").toLowerCase().includes(q)
      )
    }
    if (regionFilter !== "all") list = list.filter(p => p.state_region === regionFilter)
    if (classificationFilter !== "all") list = list.filter(p => p.classification === classificationFilter)
    if (assetTypeFilter !== "all") list = list.filter(p => p.asset_type === assetTypeFilter)
    return list
  }, [parcels, searchQuery, regionFilter, classificationFilter, assetTypeFilter])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.project_code.toLowerCase().includes(q) ||
      (p.sector || "").toLowerCase().includes(q)
    )
  }, [projects, searchQuery])

  return (
    <InvestorPortalLayout>
      <div>
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Invest in Myanmar</h1>
          <p className="text-lg text-muted-foreground">
            Explore available government land parcels and approved investment projects
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6">
          <button
            onClick={() => setActiveTab("parcels")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "parcels"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="h-4 w-4" />
            Available Land ({filteredParcels.length})
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "projects"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Priority Projects ({filteredProjects.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "parcels" ? (
          <div className="space-y-6">
            {/* Filters */}
            <InvestorFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              regionFilter={regionFilter}
              onRegionChange={setRegionFilter}
              classificationFilter={classificationFilter}
              onClassificationChange={setClassificationFilter}
              classifications={classifications}
              assetTypeFilter={assetTypeFilter}
              onAssetTypeChange={setAssetTypeFilter}
              assetTypes={assetTypes}
            />

            {/* Map */}
            {filteredParcels.some(p => p.geometry) && (
              <InvestorMapView parcels={filteredParcels} />
            )}

            {/* Card grid */}
            {filteredParcels.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No available parcels match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredParcels.map(parcel => (
                  <InvestorParcelCard key={parcel.id} parcel={parcel} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search only for projects */}
            <div className="flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-gray-200">
              <div className="flex flex-col gap-1 flex-1 max-w-sm">
                <label className="text-xs text-muted-foreground">Search</label>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No approved projects match your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map(project => (
                  <InvestorProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </InvestorPortalLayout>
  )
}
