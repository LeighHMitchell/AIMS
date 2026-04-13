"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { AppraisalWizard } from "@/components/project-bank/appraisal/AppraisalWizard"

export default function SubmitProjectPage() {
  return (
    <MainLayout>
      <div className="max-w-7xl pb-16">
        <Breadcrumbs items={[
          { label: "Project Bank", href: "/project-bank" },
          { label: "New Project" },
        ]} />
        <h1 className="text-3xl font-bold mb-6">Project Intake</h1>
        <AppraisalWizard />
      </div>
    </MainLayout>
  )
}
