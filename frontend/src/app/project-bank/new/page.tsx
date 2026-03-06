"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { AppraisalWizard } from "@/components/project-bank/appraisal/AppraisalWizard"

export default function SubmitProjectPage() {
  return (
    <MainLayout>
      <div className="max-w-[1600px] pb-16">
        <h1 className="text-2xl font-bold mb-6">Project Intake</h1>
        <AppraisalWizard />
      </div>
    </MainLayout>
  )
}
