"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Building,
  Layers,
  Clock,
  Link2,
} from "lucide-react"
import { apiFetch } from "@/lib/api-fetch"
import { useUser } from "@/hooks/useUser"
import { formatHectares } from "@/lib/land-bank-utils"
import { ParcelStatusBadge } from "@/components/land-bank/ParcelStatusBadge"
import { LeaseExpiryBadge } from "@/components/land-bank/LeaseExpiryBadge"
import { ParcelDetailMap } from "@/components/land-bank/ParcelDetailMap"
import { AllocationScoringPanel } from "@/components/land-bank/AllocationScoringPanel"
import { AllocationRequestModal } from "@/components/land-bank/AllocationRequestModal"
import { ParcelHistoryTimeline } from "@/components/land-bank/ParcelHistoryTimeline"
import type { LandParcel, AllocationRequest, LandParcelHistory, LinkedProject } from "@/types/land-bank"

type Tab = "overview" | "map" | "allocation" | "history"

export default function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { permissions } = useUser()
  const [parcel, setParcel] = useState<LandParcel | null>(null)
  const [allocations, setAllocations] = useState<AllocationRequest[]>([])
  const [history, setHistory] = useState<LandParcelHistory[]>([])
  const [linkedProjects, setLinkedProjects] = useState<LinkedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [deallocating, setDeallocating] = useState(false)

  const fetchParcel = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/land-bank/${id}`)
      if (res.ok) {
        const data = await res.json()
        setParcel(data)
        setAllocations(data.allocation_requests || [])
        setHistory(data.history || [])
        setLinkedProjects(data.linked_projects || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchParcel()
  }, [fetchParcel])

  const handleDeallocate = async () => {
    if (!confirm("Are you sure you want to de-allocate this parcel? It will be reverted to Available status.")) return
    setDeallocating(true)
    try {
      const res = await apiFetch(`/api/land-bank/${id}/deallocate`, { method: "POST" })
      if (res.ok) fetchParcel()
    } catch {
      // silent
    } finally {
      setDeallocating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this parcel? This cannot be undone.")) return
    try {
      const res = await apiFetch(`/api/land-bank/${id}`, { method: "DELETE" })
      if (res.ok) router.push("/land-bank/parcels")
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="w-full">
          <div className="h-8 bg-muted animate-pulse rounded w-48 mb-4" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </MainLayout>
    )
  }

  if (!parcel) {
    return (
      <MainLayout>
        <div className="w-full text-center py-12">
          <p className="text-muted-foreground">Parcel not found</p>
          <Button variant="outline" onClick={() => router.push("/land-bank/parcels")} className="mt-4">
            Back to Parcels
          </Button>
        </div>
      </MainLayout>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "map", label: "Map" },
    { key: "allocation", label: `Allocation (${allocations.length})` },
    { key: "history", label: `History (${history.length})` },
  ]

  return (
    <MainLayout>
      <div className="w-full">
        {/* Back link */}
        <button
          onClick={() => router.push("/land-bank/parcels")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Parcels
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{parcel.name}</h1>
              <ParcelStatusBadge status={parcel.status} />
              <LeaseExpiryBadge leaseEndDate={parcel.lease_end_date} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono">{parcel.parcel_code}</span>
              <span>{parcel.state_region}{parcel.township ? `, ${parcel.township}` : ""}</span>
              {parcel.size_hectares && <span>{formatHectares(parcel.size_hectares)}</span>}
              {parcel.classification && <Badge variant="outline">{parcel.classification}</Badge>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {permissions.canRequestAllocation && parcel.status !== "allocated" && (
              <Button onClick={() => setShowAllocationModal(true)} className="gap-1">
                <Building className="h-4 w-4" />
                Request Allocation
              </Button>
            )}
            {permissions.canManageParcels && parcel.status === "allocated" && (
              <Button
                variant="outline"
                onClick={handleDeallocate}
                disabled={deallocating}
              >
                {deallocating ? "De-allocating..." : "De-allocate"}
              </Button>
            )}
            {permissions.canManageParcels && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                title="Delete parcel"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main content */}
          <div>
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Details card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Parcel Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground mb-1">Parcel Code</dt>
                        <dd className="font-mono">{parcel.parcel_code}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">State/Region</dt>
                        <dd>{parcel.state_region}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">Township</dt>
                        <dd>{parcel.township || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">Size</dt>
                        <dd>{formatHectares(parcel.size_hectares)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">Classification</dt>
                        <dd>{parcel.classification || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">Status</dt>
                        <dd><ParcelStatusBadge status={parcel.status} /></dd>
                      </div>
                      {parcel.notes && (
                        <div className="col-span-2">
                          <dt className="text-muted-foreground mb-1">Notes</dt>
                          <dd className="whitespace-pre-wrap">{parcel.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                {/* Allocation info */}
                {parcel.status === "allocated" && parcel.organization && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-muted-foreground mb-1">Allocated To</dt>
                          <dd className="font-medium">{parcel.organization.name}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground mb-1">Lease Period</dt>
                          <dd>
                            {parcel.lease_start_date || "—"} to {parcel.lease_end_date || "—"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                )}

                {/* Linked projects */}
                {linkedProjects.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Linked Projects ({linkedProjects.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {linkedProjects.map(lp => (
                          <div
                            key={lp.id}
                            className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => router.push(`/project-bank/${lp.project.id}`)}
                          >
                            <p className="text-sm font-medium">{lp.project.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {lp.project.project_code} &middot; {lp.project.sector} &middot; {lp.project.status}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "map" && (
              <ParcelDetailMap parcel={parcel} />
            )}

            {activeTab === "allocation" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allocation Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <AllocationScoringPanel
                    parcelId={parcel.id}
                    requests={allocations}
                    canManage={permissions.canManageParcels}
                    onUpdate={fetchParcel}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === "history" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ParcelHistoryTimeline history={history} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{parcel.state_region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>{formatHectares(parcel.size_hectares)}</span>
                  </div>
                  {parcel.classification && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{parcel.classification}</span>
                    </div>
                  )}
                  {parcel.lease_end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Lease ends {parcel.lease_end_date}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Created {new Date(parcel.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {parcel.geometry && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-2">Geometry</h3>
                  <p className="text-xs text-muted-foreground">
                    Type: {parcel.geometry.type}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Allocation request modal */}
        <AllocationRequestModal
          isOpen={showAllocationModal}
          onClose={() => setShowAllocationModal(false)}
          parcelId={parcel.id}
          parcelName={parcel.name}
          onSuccess={fetchParcel}
        />
      </div>
    </MainLayout>
  )
}
