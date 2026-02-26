"use client"

import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { SEEAssessmentWizard } from "@/components/project-bank/see-assessment/SEEAssessmentWizard"

export default function SEEAssessmentPage() {
  const params = useParams()
  const id = params?.id as string

  return (
    <MainLayout>
      <div className="max-w-[960px] pb-16">
        <h1 className="text-2xl font-bold mb-6">SEE Transfer Assessment</h1>
        <SEEAssessmentWizard transferId={id} />
      </div>
    </MainLayout>
  )
}
