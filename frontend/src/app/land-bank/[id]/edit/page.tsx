"use client"

import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { useUser } from "@/hooks/useUser"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ParcelWizard } from "@/components/land-bank/ParcelWizard"

export default function EditParcelPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const { permissions } = useUser()

  if (!permissions.canManageParcels) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You do not have permission to edit parcels.</p>
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
          { label: "Edit Parcel" },
        ]} />

        <h1 className="text-3xl font-bold mb-6">Edit Parcel</h1>

        <ParcelWizard parcelId={id} />
      </div>
    </MainLayout>
  )
}
