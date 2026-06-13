"use client"

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger, PageTabsList, PageTabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { useRouter, useSearchParams } from "next/navigation";

const DATA_CLINIC_TABS = [
  "activities",
  "transactions",
  "budgets",
  "planned-disbursements",
  "organizations",
  "people",
  "sectors",
  "sdg",
  "locations",
  "policy-markers",
  "tags",
  "working-groups",
  "duplicates",
  "timeliness",
  "financial-dates",
  "financial-completeness",
] as const;
import { DataClinicActivities } from "@/components/data-clinic/DataClinicActivities";
import { DataClinicTransactions } from "@/components/data-clinic/DataClinicTransactions";
import { DataClinicOrganizations } from "@/components/data-clinic/DataClinicOrganizations";
import { DataClinicTimeliness } from "@/components/data-clinic/DataClinicTimeliness";
import { DataClinicFinancialDates } from "@/components/data-clinic/DataClinicFinancialDates";
import { DataClinicBudgets } from "@/components/data-clinic/DataClinicBudgets";
import { DataClinicFinancialCompleteness } from "@/components/data-clinic/DataClinicFinancialCompleteness";
import { DataClinicDuplicates } from "@/components/data-clinic/DataClinicDuplicates";
import { DataClinicEntity } from "@/components/data-clinic/DataClinicEntity";
import { Stethoscope, Bug, RefreshCw, Copy, FileText, ArrowLeftRight, Wallet, Building2, Clock, CalendarDays, PieChart, Banknote, Users, Target, Layers, MapPin, Flag, Tag, Network } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch } from '@/lib/api-fetch';

export default function DataClinicPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab =
    tabFromUrl && (DATA_CLINIC_TABS as readonly string[]).includes(tabFromUrl)
      ? tabFromUrl
      : "activities";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Keep the active tab in sync with the URL (e.g. dashboard deep-links)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && (DATA_CLINIC_TABS as readonly string[]).includes(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`/data-clinic?${params.toString()}`, { scroll: false });
  };
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);

  // Check if user has super user permissions
  const canAccessDataClinic = user?.role === 'super_user' || user?.role === 'gov_partner_tier_1';

  useEffect(() => {
    // Auto-run debug on mount if there are issues
    const checkDebug = async () => {
      try {
        const res = await apiFetch('/api/data-clinic/debug');
        const data = await res.json();
        if (data.summary?.migrationRequired) {
          setDebugInfo(data);
          setShowDebug(true);
        }
      } catch (error) {
        console.error('Debug check failed:', error);
      }
    };
    
    if (canAccessDataClinic) {
      checkDebug();
    }
  }, [canAccessDataClinic]);

  const handleDebugCheck = async () => {
    setIsLoadingDebug(true);
    try {
      const res = await apiFetch('/api/data-clinic/debug');
      const data = await res.json();
      setDebugInfo(data);
      setShowDebug(true);
      
      if (data.summary?.migrationRequired) {
        toast.error('System maintenance required. Please contact your administrator.');
      } else {
        toast.success('All system checks passed.');
      }
    } catch (error) {
      toast.error("Couldn't run system check. Please try again.");
      console.error('Debug error:', error);
    } finally {
      setIsLoadingDebug(false);
    }
  };

  if (!canAccessDataClinic) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-6 text-center">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the Data Clinic.
            </p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full bg-white">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Data Clinic</h1>
                <p className="text-muted-foreground mt-1">
                  Detect and fix missing or invalid fields across your aid project data
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <PageTabsList>
              <PageTabsTrigger value="activities">
                <FileText className="h-4 w-4" />
                Activities
              </PageTabsTrigger>
              <PageTabsTrigger value="transactions">
                <ArrowLeftRight className="h-4 w-4" />
                Transactions
              </PageTabsTrigger>
              <PageTabsTrigger value="budgets">
                <Wallet className="h-4 w-4" />
                Budgets
              </PageTabsTrigger>
              <PageTabsTrigger value="planned-disbursements">
                <Banknote className="h-4 w-4" />
                Planned Disbursements
              </PageTabsTrigger>
              <PageTabsTrigger value="organizations">
                <Building2 className="h-4 w-4" />
                Organizations
              </PageTabsTrigger>
              <PageTabsTrigger value="people">
                <Users className="h-4 w-4" />
                People
              </PageTabsTrigger>
              <PageTabsTrigger value="sectors">
                <Layers className="h-4 w-4" />
                Sectors
              </PageTabsTrigger>
              <PageTabsTrigger value="sdg">
                <Target className="h-4 w-4" />
                SDGs
              </PageTabsTrigger>
              <PageTabsTrigger value="locations">
                <MapPin className="h-4 w-4" />
                Locations
              </PageTabsTrigger>
              <PageTabsTrigger value="policy-markers">
                <Flag className="h-4 w-4" />
                Policy Markers
              </PageTabsTrigger>
              <PageTabsTrigger value="tags">
                <Tag className="h-4 w-4" />
                Tags
              </PageTabsTrigger>
              <PageTabsTrigger value="working-groups">
                <Network className="h-4 w-4" />
                Working Groups
              </PageTabsTrigger>
              <PageTabsTrigger value="duplicates">
                <Copy className="h-4 w-4" />
                Duplicates
              </PageTabsTrigger>
              <PageTabsTrigger value="timeliness">
                <Clock className="h-4 w-4" />
                Timeliness
              </PageTabsTrigger>
              <PageTabsTrigger value="financial-dates">
                <CalendarDays className="h-4 w-4" />
                Financial Dates
              </PageTabsTrigger>
              <PageTabsTrigger value="financial-completeness">
                <PieChart className="h-4 w-4" />
                Financial Completeness
              </PageTabsTrigger>
            </PageTabsList>

            <TabsContent value="activities">
              <DataClinicActivities />
            </TabsContent>

            <TabsContent value="transactions">
              <DataClinicTransactions />
            </TabsContent>

            <TabsContent value="budgets">
              <DataClinicBudgets />
            </TabsContent>

            <TabsContent value="planned-disbursements">
              <DataClinicEntity entity="planned-disbursements" />
            </TabsContent>

            <TabsContent value="organizations">
              <DataClinicOrganizations />
            </TabsContent>

            <TabsContent value="people">
              <DataClinicEntity entity="people" />
            </TabsContent>

            <TabsContent value="sectors">
              <DataClinicEntity entity="sectors" />
            </TabsContent>

            <TabsContent value="sdg">
              <DataClinicEntity entity="sdg" />
            </TabsContent>

            <TabsContent value="locations">
              <DataClinicEntity entity="locations" />
            </TabsContent>

            <TabsContent value="policy-markers">
              <DataClinicEntity entity="policy-markers" />
            </TabsContent>

            <TabsContent value="tags">
              <DataClinicEntity entity="tags" />
            </TabsContent>

            <TabsContent value="working-groups">
              <DataClinicEntity entity="working-groups" />
            </TabsContent>

            <TabsContent value="duplicates">
              <DataClinicDuplicates />
            </TabsContent>

            <TabsContent value="timeliness">
              <DataClinicTimeliness />
            </TabsContent>

            <TabsContent value="financial-dates">
              <DataClinicFinancialDates />
            </TabsContent>

            <TabsContent value="financial-completeness">
              <DataClinicFinancialCompleteness />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
} 