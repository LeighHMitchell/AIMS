"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { AppraisalWizard } from "@/components/project-bank/appraisal/AppraisalWizard"

export default function SubmitProjectPage() {
  return (
    <MainLayout>
      <div className="max-w-[960px] pb-16">
        <h1 className="text-2xl font-bold mb-6">Submit New Project</h1>
        <AppraisalWizard />
      </div>
    </MainLayout>
  )
}
