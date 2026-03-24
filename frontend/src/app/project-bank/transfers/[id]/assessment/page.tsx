"use client"

import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { SEEAssessmentWizard } from "@/components/project-bank/see-assessment/SEEAssessmentWizard"

export default function SEEAssessmentPage() {
  const params = useParams()
  const id = params?.id as string

  return (
    <MainLayout>
      <div className="max-w-3xl pb-16">
        <Breadcrumbs items={[
          { label: "Project Bank", href: "/project-bank" },
          { label: "Transfers", href: "/project-bank/transfers" },
          { label: "Assessment" },
        ]} />
        <h1 className="text-3xl font-bold mb-6">SEE Transfer Assessment</h1>
        <SEEAssessmentWizard transferId={id} />
      </div>
    </MainLayout>
  )
}
