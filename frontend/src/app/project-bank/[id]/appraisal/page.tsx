"use client"

import { useParams } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { AppraisalWizard } from "@/components/project-bank/appraisal/AppraisalWizard"

export default function ResumeAppraisalPage() {
  const params = useParams()
  const id = params?.id as string

  return (
    <MainLayout>
      <div className="max-w-[960px]">
        <h1 className="text-2xl font-bold mb-6">Project Appraisal</h1>
        <AppraisalWizard projectId={id} />
      </div>
    </MainLayout>
  )
}
