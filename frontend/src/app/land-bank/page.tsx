"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"

export default function LandBankPage() {
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-7 w-7 text-teal-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Land Bank</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            The Land Bank module is under development. It will provide a registry of state-owned parcels
            available for PPP and private sector projects, with allocation tracking and approval workflows.
          </p>
          <Badge variant="teal" className="text-sm px-4 py-1.5">
            Coming Soon
          </Badge>
        </div>
      </div>
    </MainLayout>
  )
}
