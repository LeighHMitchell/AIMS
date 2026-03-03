"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanSquare } from "lucide-react"
import { IntakeReviewTab } from "@/components/project-bank/review/IntakeReviewTab"
import { FS1ReviewTab } from "@/components/project-bank/review/FS1ReviewTab"
import { FS2ReviewTab } from "@/components/project-bank/review/FS2ReviewTab"
import { RejectedProjectsTab } from "@/components/project-bank/review/RejectedProjectsTab"

export default function ReviewBoardPage() {
  const [activeTab, setActiveTab] = useState("intake")

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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="intake">Intake Reviews</TabsTrigger>
            <TabsTrigger value="fs1">Preliminary Feasibility Study</TabsTrigger>
            <TabsTrigger value="fs2">Detailed Feasibility Study</TabsTrigger>
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
