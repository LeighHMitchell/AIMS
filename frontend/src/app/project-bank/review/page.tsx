"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanSquare } from "lucide-react"
import { IntakeReviewTab } from "@/components/project-bank/review/IntakeReviewTab"
import { FS1ReviewTab } from "@/components/project-bank/review/FS1ReviewTab"
import { FS2ReviewTab } from "@/components/project-bank/review/FS2ReviewTab"
import { RejectedProjectsTab } from "@/components/project-bank/review/RejectedProjectsTab"

const VALID_TABS = ["intake", "fs1", "fs2", "rejected"]

export default function ReviewBoardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "intake"
  )

  // Sync tab state when URL changes (e.g. sidebar click)
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam, activeTab])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.replace(`/project-bank/review?tab=${tab}`, { scroll: false })
  }

  return (
    <MainLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <KanbanSquare className="h-7 w-7 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">Review Board</h1>
              <p className="text-muted-foreground text-sm">
                Review intake submissions and feasibility study narratives
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="intake">Phase 1: Intake Reviews</TabsTrigger>
            <TabsTrigger value="fs1">Phase 2: Preliminary Feasibility Study</TabsTrigger>
            <TabsTrigger value="fs2">Phase 3: Detailed Feasibility Study</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value="intake">
            <IntakeReviewTab />
          </TabsContent>

          <TabsContent value="fs1">
            <FS1ReviewTab />
          </TabsContent>

          <TabsContent value="fs2">
            <FS2ReviewTab />
          </TabsContent>

          <TabsContent value="rejected">
            <RejectedProjectsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
