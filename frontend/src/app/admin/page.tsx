"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { MainLayout } from "@/components/layout/main-layout"
import { AdminUserTable } from "@/components/AdminUserTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger, PageTabsList, PageTabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, FileText, AlertCircle, Settings, MessageSquare, Landmark, DollarSign, Map, HelpCircle, Book, BookOpen, FileCode2, Calendar, Activity, Target, AlertTriangle, Scale, Layers, Gauge, Trash2 } from "lucide-react"
import { USER_ROLES } from "@/types/user"
import { SystemsSettings } from "@/components/admin/SystemsSettings"
import { FeedbackManagement } from "@/components/admin/FeedbackManagement"
import { BudgetClassificationsManagement } from "@/components/admin/BudgetClassificationsManagement"
import { DomesticBudgetManagement } from "@/components/admin/DomesticBudgetManagement"
import { SectorMappingsManagement } from "@/components/admin/SectorMappingsManagement"
import { FAQManagement } from "@/components/admin/FAQManagement"
import { GlossaryManagement } from "@/components/admin/GlossaryManagement"
import { PageHelpManagement } from "@/components/admin/PageHelpManagement"
import { CountrySectorVocabularyManagement } from "@/components/admin/CountrySectorVocabularyManagement"
import { PendingValidationsManagement } from "@/components/admin/PendingValidationsManagement"
import { IATIImportLogsManagement } from "@/components/admin/IATIImportLogsManagement"
import { ProjectReferencesManagement } from "@/components/admin/ProjectReferencesManagement"
import { EventManagement } from "@/components/calendar/EventManagement"
import { UserActivityDashboard } from "@/components/admin/UserActivityDashboard"
import { NationalPlansManagement } from "@/components/admin/NationalPlansManagement"
import { CountryEmergenciesManagement } from "@/components/admin/CountryEmergenciesManagement"
// NationalDevelopmentGoals consolidated into NationalPlansManagement
import { ComplianceRulesManagement } from "@/components/admin/ComplianceRulesManagement"
import { ScoringRubricManagement } from "@/components/admin/ScoringRubricManagement"
import { RecycleBinManagement } from "@/components/admin/RecycleBinManagement"
import { PBSectorsManagement } from "@/components/admin/PBSectorsManagement"
import { LoadingText } from "@/components/ui/loading-text"
function AdminPageContent() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("users")
  const [activeSubTab, setActiveSubTab] = useState("classifications")

  // Valid tab values
  const validTabs = ["users", "user-activity", "import-logs", "validations", "feedback", "faq", "glossary", "page-help", "systems", "chart-of-accounts", "project-references", "emergencies", "calendar-events", "national-plans", "compliance-rules", "scoring-rubric", "recycle-bin"]
  const validSubTabs = ["classifications", "sector-mappings", "country-sectors", "domestic-budget", "pb-sectors"]

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
          <LoadingText>Loading admin panel...</LoadingText>
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
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
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
            <Shield className="h-8 w-8 text-foreground" />
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground mt-1">Manage users, view logs, and handle validations</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <PageTabsList>
            <PageTabsTrigger value="users">
              <Users className="h-4 w-4" />
              User Management
            </PageTabsTrigger>
            <PageTabsTrigger value="user-activity">
              <Activity className="h-4 w-4" />
              User Activity
            </PageTabsTrigger>
            <PageTabsTrigger value="import-logs">
              <FileText className="h-4 w-4" />
              IATI Import Logs
            </PageTabsTrigger>
            <PageTabsTrigger value="validations">
              <AlertCircle className="h-4 w-4" />
              Pending Validations
            </PageTabsTrigger>
            <PageTabsTrigger value="feedback">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </PageTabsTrigger>
            <PageTabsTrigger value="faq">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </PageTabsTrigger>
            <PageTabsTrigger value="glossary">
              <BookOpen className="h-4 w-4" />
              Glossary
            </PageTabsTrigger>
            <PageTabsTrigger value="page-help">
              <HelpCircle className="h-4 w-4" />
              Page Help
            </PageTabsTrigger>
            <PageTabsTrigger value="systems">
              <Settings className="h-4 w-4" />
              Systems Settings
            </PageTabsTrigger>
            <PageTabsTrigger value="chart-of-accounts">
              <Landmark className="h-4 w-4" />
              Chart of Accounts
            </PageTabsTrigger>
            <PageTabsTrigger value="project-references">
              <FileCode2 className="h-4 w-4" />
              Project References
            </PageTabsTrigger>
            <PageTabsTrigger value="emergencies">
              <AlertTriangle className="h-4 w-4" />
              Emergencies
            </PageTabsTrigger>
            <PageTabsTrigger value="calendar-events">
              <Calendar className="h-4 w-4" />
              Calendar Events
            </PageTabsTrigger>
            <PageTabsTrigger value="national-plans">
              <BookOpen className="h-4 w-4" />
              National Plans
            </PageTabsTrigger>
            <PageTabsTrigger value="compliance-rules">
              <Scale className="h-4 w-4" />
              Compliance Rules
            </PageTabsTrigger>
            <PageTabsTrigger value="scoring-rubric">
              <Gauge className="h-4 w-4" />
              Scoring Rubric
            </PageTabsTrigger>
            <PageTabsTrigger value="recycle-bin">
              <Trash2 className="h-4 w-4" />
              Recycle Bin
            </PageTabsTrigger>
          </PageTabsList>

          <TabsContent value="users" className="space-y-6">
            <AdminUserTable />
          </TabsContent>

          <TabsContent value="user-activity" className="space-y-6">
            <UserActivityDashboard />
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

          <TabsContent value="glossary" className="space-y-6">
            <GlossaryManagement />
          </TabsContent>

          <TabsContent value="page-help" className="space-y-6">
            <PageHelpManagement />
          </TabsContent>

          <TabsContent value="systems" className="space-y-6">
            <SystemsSettings />
          </TabsContent>

          <TabsContent value="chart-of-accounts" className="space-y-6">
            <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
              <PageTabsList className="mb-4">
                <PageTabsTrigger value="classifications">
                  <Landmark className="h-4 w-4" />
                  Classifications
                </PageTabsTrigger>
                <PageTabsTrigger value="sector-mappings">
                  <Map className="h-4 w-4" />
                  Sector Mappings
                </PageTabsTrigger>
                <PageTabsTrigger value="country-sectors">
                  <Book className="h-4 w-4" />
                  Country Sectors
                </PageTabsTrigger>
                <PageTabsTrigger value="domestic-budget">
                  <DollarSign className="h-4 w-4" />
                  Domestic Budget
                </PageTabsTrigger>
                <PageTabsTrigger value="pb-sectors">
                  <Layers className="h-4 w-4" />
                  Project Bank Sectors
                </PageTabsTrigger>
              </PageTabsList>

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

              <TabsContent value="pb-sectors">
                <PBSectorsManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="project-references" className="space-y-6">
            <ProjectReferencesManagement />
          </TabsContent>

          <TabsContent value="emergencies" className="space-y-6">
            <CountryEmergenciesManagement />
          </TabsContent>

          <TabsContent value="calendar-events" className="space-y-6">
            <EventManagement />
          </TabsContent>

          <TabsContent value="national-plans" className="space-y-6">
            <NationalPlansManagement />
          </TabsContent>


          <TabsContent value="compliance-rules" className="space-y-6">
            <ComplianceRulesManagement />
          </TabsContent>

          <TabsContent value="scoring-rubric" className="space-y-6">
            <ScoringRubricManagement />
          </TabsContent>

          <TabsContent value="recycle-bin" className="space-y-6">
            <RecycleBinManagement />
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