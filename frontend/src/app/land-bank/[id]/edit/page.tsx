"use client"

import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { ArrowLeft } from "lucide-react"
import { useUser } from "@/hooks/useUser"
import { ParcelWizard } from "@/components/land-bank/ParcelWizard"

export default function EditParcelPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const router = useRouter()
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
      <div className="max-w-[960px] pb-16">
        {/* Back link */}
        <button
          onClick={() => router.push(`/land-bank/${id}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Parcel
        </button>

        <h1 className="text-2xl font-bold mb-6">Edit Parcel</h1>

        <ParcelWizard parcelId={id} />
      </div>
    </MainLayout>
  )
}
