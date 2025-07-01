"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/hooks/useUser"
import { MainLayout } from "@/components/layout/main-layout"
import { UserSettingsForm } from "@/components/UserSettingsForm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Globe, Building2 } from "lucide-react"

export default function SettingsPage() {
  const { user, isLoading } = useUser()
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Please log in to access settings</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="iati" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              IATI Settings
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <UserSettingsForm user={user} />
          </TabsContent>

          <TabsContent value="iati" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>IATI Configuration</CardTitle>
                <CardDescription>
                  Configure your International Aid Transparency Initiative (IATI) settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  IATI settings are configured in your profile settings above.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>Your organization details</CardDescription>
              </CardHeader>
              <CardContent>
                {user.organization ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Organization Name</p>
                      <p className="mt-1">{user.organization.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <p className="mt-1 capitalize">{user.organization.type.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No organization assigned. Contact your administrator for assistance.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
} 