"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/useUser"
import { MainLayout } from "@/components/layout/main-layout"
import { AdminUserTable } from "@/components/AdminUserTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, FileText, AlertCircle, Settings, MessageSquare, Landmark, DollarSign, Map, HelpCircle } from "lucide-react"
import { USER_ROLES } from "@/types/user"
import { SystemsSettings } from "@/components/admin/SystemsSettings"
import { FeedbackManagement } from "@/components/admin/FeedbackManagement"
import { BudgetClassificationsManagement } from "@/components/admin/BudgetClassificationsManagement"
import { DomesticBudgetManagement } from "@/components/admin/DomesticBudgetManagement"
import { SectorMappingsManagement } from "@/components/admin/SectorMappingsManagement"
import { FAQManagement } from "@/components/admin/FAQManagement"

function AdminPageContent() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("users")

  // Valid tab values
  const validTabs = ["users", "import-logs", "validations", "feedback", "faq", "systems", "chart-of-accounts", "domestic-budget", "sector-mappings"]

  useEffect(() => {
    // Redirect if user is not super_user
    if (!isLoading && user && user.role !== USER_ROLES.SUPER_USER) {
      router.push("/")
    }
  }, [user, isLoading, router])

  // Initialize tab from URL or default to "users"
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    } else {
      setActiveTab("users")
    }
  }, [searchParams])

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
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
            <TabsTrigger value="domestic-budget" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Domestic Budget
            </TabsTrigger>
            <TabsTrigger value="sector-mappings" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Sector Mappings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <AdminUserTable />
          </TabsContent>

          <TabsContent value="import-logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>IATI Import Logs</CardTitle>
                <CardDescription>
                  View and manage IATI data import history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p>Import logs feature coming soon</p>
                    <p className="text-sm mt-2">Track all IATI data imports and their status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Validations</CardTitle>
                <CardDescription>
                  Review and approve activities awaiting validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p>Validation queue feature coming soon</p>
                    <p className="text-sm mt-2">Review activities submitted for validation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <BudgetClassificationsManagement />
          </TabsContent>

          <TabsContent value="domestic-budget" className="space-y-6">
            <DomesticBudgetManagement />
          </TabsContent>

          <TabsContent value="sector-mappings" className="space-y-6">
            <SectorMappingsManagement />
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