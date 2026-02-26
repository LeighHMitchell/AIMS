"use client"

import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { ArrowLeft } from "lucide-react"
import { useUser } from "@/hooks/useUser"
import { ParcelWizard } from "@/components/land-bank/ParcelWizard"

export default function NewParcelPage() {
  const router = useRouter()
  const { permissions } = useUser()

  if (!permissions.canCreateParcels) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You do not have permission to register parcels.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-[960px] pb-16">
        {/* Back link */}
        <button
          onClick={() => router.push("/land-bank/parcels")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Parcels
        </button>

        <h1 className="text-2xl font-bold mb-6">Register New Parcel</h1>

        <ParcelWizard />
      </div>
    </MainLayout>
  )
}
