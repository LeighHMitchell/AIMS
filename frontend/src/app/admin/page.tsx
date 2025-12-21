"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { MainLayout } from "@/components/layout/main-layout"
import { AdminUserTable } from "@/components/AdminUserTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, FileText, AlertCircle, Settings, MessageSquare, Landmark, DollarSign, Map, HelpCircle, Book, FileCode2, Calendar } from "lucide-react"
import { USER_ROLES } from "@/types/user"
import { SystemsSettings } from "@/components/admin/SystemsSettings"
import { FeedbackManagement } from "@/components/admin/FeedbackManagement"
import { BudgetClassificationsManagement } from "@/components/admin/BudgetClassificationsManagement"
import { DomesticBudgetManagement } from "@/components/admin/DomesticBudgetManagement"
import { SectorMappingsManagement } from "@/components/admin/SectorMappingsManagement"
import { FAQManagement } from "@/components/admin/FAQManagement"
import { CountrySectorVocabularyManagement } from "@/components/admin/CountrySectorVocabularyManagement"
import { PendingValidationsManagement } from "@/components/admin/PendingValidationsManagement"
import { IATIImportLogsManagement } from "@/components/admin/IATIImportLogsManagement"
import { ProjectReferencesManagement } from "@/components/admin/ProjectReferencesManagement"
import { EventManagement } from "@/components/calendar/EventManagement"

function AdminPageContent() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("users")
  const [activeSubTab, setActiveSubTab] = useState("classifications")

  // Valid tab values
  const validTabs = ["users", "import-logs", "validations", "feedback", "faq", "systems", "chart-of-accounts", "project-references", "calendar-events"]
  const validSubTabs = ["classifications", "sector-mappings", "country-sectors", "domestic-budget"]

  useEffect(() => {
    // Redirect if user is not super_user
    if (!isLoading && user && user.role !== USER_ROLES.SUPER_USER) {
      router.push("/")
    }
  }, [user, isLoading, router])

  // Initialize tab from URL or default to "users"
  useEffect(() => {
    const tabFromUrl = searchParams?.get("tab")
    const subTabFromUrl = searchParams?.get("subtab")
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    } else {
      setActiveTab("users")
    }
    if (subTabFromUrl && validSubTabs.includes(subTabFromUrl)) {
      setActiveSubTab(subTabFromUrl)
    } else {
      setActiveSubTab("classifications")
    }
  }, [searchParams])

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("tab", value)
    // Clear subtab when switching main tabs
    params.delete("subtab")
    setActiveSubTab("classifications")
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }

  // Handle sub-tab change and update URL
  const handleSubTabChange = (value: string) => {
    setActiveSubTab(value)
    const params = new URLSearchParams(searchParams?.toString() || "")
    params.set("subtab", value)
    router.replace(`/admin?${params.toString()}`, { scroll: false })
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Please log in to access admin panel</p>
        </div>
      </MainLayout>
    )
  }

  if (user.role !== USER_ROLES.SUPER_USER) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground mt-1">Manage users, view logs, and handle validations</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="import-logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              IATI Import Logs
            </TabsTrigger>
            <TabsTrigger value="validations" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Validations
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="systems" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Systems Settings
            </TabsTrigger>
            <TabsTrigger value="chart-of-accounts" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Chart of Accounts
            </TabsTrigger>
            <TabsTrigger value="project-references" className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4" />
              Project References
            </TabsTrigger>
            <TabsTrigger value="calendar-events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <AdminUserTable />
          </TabsContent>

          <TabsContent value="import-logs" className="space-y-6">
            <IATIImportLogsManagement />
          </TabsContent>

          <TabsContent value="validations" className="space-y-6">
            <PendingValidationsManagement />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <FeedbackManagement />
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <FAQManagement />
          </TabsContent>

          <TabsContent value="systems" className="space-y-6">
            <SystemsSettings />
          </TabsContent>

          <TabsContent value="chart-of-accounts" className="space-y-6">
            <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="classifications" className="flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Classifications
                </TabsTrigger>
                <TabsTrigger value="sector-mappings" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Sector Mappings
                </TabsTrigger>
                <TabsTrigger value="country-sectors" className="flex items-center gap-2">
                  <Book className="h-4 w-4" />
                  Country Sectors
                </TabsTrigger>
                <TabsTrigger value="domestic-budget" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Domestic Budget
                </TabsTrigger>
              </TabsList>

              <TabsContent value="classifications">
                <BudgetClassificationsManagement />
              </TabsContent>

              <TabsContent value="sector-mappings">
                <SectorMappingsManagement />
              </TabsContent>

              <TabsContent value="country-sectors">
                <CountrySectorVocabularyManagement />
              </TabsContent>

              <TabsContent value="domestic-budget">
                <DomesticBudgetManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="project-references" className="space-y-6">
            <ProjectReferencesManagement />
          </TabsContent>

          <TabsContent value="calendar-events" className="space-y-6">
            <EventManagement />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPageContent />
    </Suspense>
  )
} 