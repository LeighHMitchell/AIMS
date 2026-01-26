"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { MainLayout } from "@/components/layout/main-layout"
import { AdminUserTable } from "@/components/AdminUserTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, FileText, AlertCircle, Settings, MessageSquare, Landmark, DollarSign, Map, HelpCircle, Book, FileCode2, Calendar, Activity, Target, ClipboardList } from "lucide-react"
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
import { UserActivityDashboard } from "@/components/admin/UserActivityDashboard"
import { NationalPrioritiesManagement } from "@/components/admin/NationalPrioritiesManagement"
import { ReadinessTemplateManagement } from "@/components/admin/ReadinessTemplateManagement"
import { ReadinessItemManagement } from "@/components/admin/ReadinessItemManagement"
import { LoadingText } from "@/components/ui/loading-text"
import { apiFetch } from '@/lib/api-fetch';

function ReadinessChecklistAdminSection() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");

  if (selectedTemplateId) {
    return (
      <ReadinessItemManagement
        templateId={selectedTemplateId}
        templateName={selectedTemplateName}
        onBack={() => {
          setSelectedTemplateId(null);
          setSelectedTemplateName("");
        }}
      />
    );
  }

  return (
    <ReadinessTemplateManagement
      onSelectTemplate={(templateId) => {
        // Fetch template name
        apiFetch(`/api/admin/readiness/templates/${templateId}`)
          .then(res => res.json())
          .then(data => {
            if (data.template) {
              setSelectedTemplateName(data.template.name);
              setSelectedTemplateId(templateId);
            }
          });
      }}
    />
  );
}

function AdminPageContent() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("users")
  const [activeSubTab, setActiveSubTab] = useState("classifications")

  // Valid tab values
  const validTabs = ["users", "user-activity", "import-logs", "validations", "feedback", "faq", "systems", "chart-of-accounts", "project-references", "calendar-events", "readiness-checklist"]
  const validSubTabs = ["classifications", "sector-mappings", "country-sectors", "domestic-budget", "national-priorities"]

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
          <TabsList className="p-1 h-auto bg-background gap-1 border mb-6 flex flex-wrap">
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="user-activity" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="h-4 w-4" />
              User Activity
            </TabsTrigger>
            <TabsTrigger value="import-logs" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              IATI Import Logs
            </TabsTrigger>
            <TabsTrigger value="validations" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <AlertCircle className="h-4 w-4" />
              Pending Validations
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="systems" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" />
              Systems Settings
            </TabsTrigger>
            <TabsTrigger value="chart-of-accounts" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Landmark className="h-4 w-4" />
              Chart of Accounts
            </TabsTrigger>
            <TabsTrigger value="project-references" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileCode2 className="h-4 w-4" />
              Project References
            </TabsTrigger>
            <TabsTrigger value="calendar-events" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4" />
              Calendar Events
            </TabsTrigger>
            <TabsTrigger value="readiness-checklist" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="h-4 w-4" />
              Readiness Checklist
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="systems" className="space-y-6">
            <SystemsSettings />
          </TabsContent>

          <TabsContent value="chart-of-accounts" className="space-y-6">
            <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
              <TabsList className="p-1 h-auto bg-background gap-1 border mb-4">
                <TabsTrigger value="classifications" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Landmark className="h-4 w-4" />
                  Classifications
                </TabsTrigger>
                <TabsTrigger value="sector-mappings" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Map className="h-4 w-4" />
                  Sector Mappings
                </TabsTrigger>
                <TabsTrigger value="country-sectors" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Book className="h-4 w-4" />
                  Country Sectors
                </TabsTrigger>
                <TabsTrigger value="domestic-budget" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <DollarSign className="h-4 w-4" />
                  Domestic Budget
                </TabsTrigger>
                <TabsTrigger value="national-priorities" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Target className="h-4 w-4" />
                  National Priorities
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

              <TabsContent value="national-priorities">
                <NationalPrioritiesManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="project-references" className="space-y-6">
            <ProjectReferencesManagement />
          </TabsContent>

          <TabsContent value="calendar-events" className="space-y-6">
            <EventManagement />
          </TabsContent>

          <TabsContent value="readiness-checklist" className="space-y-6">
            <ReadinessChecklistAdminSection />
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