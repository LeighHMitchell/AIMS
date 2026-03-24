"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { useUser } from "@/hooks/useUser"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ParcelWizard } from "@/components/land-bank/ParcelWizard"

export default function NewParcelPage() {
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
      <div className="max-w-3xl pb-16">
        <Breadcrumbs items={[
          { label: "Land Bank", href: "/land-bank" },
          { label: "Parcels", href: "/land-bank/parcels" },
          { label: "New Parcel" },
        ]} />

        <h1 className="text-3xl font-bold mb-6">Register New Parcel</h1>

        <ParcelWizard />
      </div>
    </MainLayout>
  )
}
