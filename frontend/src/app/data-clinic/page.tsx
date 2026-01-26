"use client"

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { DataClinicActivities } from "@/components/data-clinic/DataClinicActivities";
import { DataClinicTransactions } from "@/components/data-clinic/DataClinicTransactions";
import { DataClinicOrganizations } from "@/components/data-clinic/DataClinicOrganizations";
import { DataClinicTimeliness } from "@/components/data-clinic/DataClinicTimeliness";
import { DataClinicFinancialDates } from "@/components/data-clinic/DataClinicFinancialDates";
import { DataClinicBudgets } from "@/components/data-clinic/DataClinicBudgets";
import { DataClinicFinancialCompleteness } from "@/components/data-clinic/DataClinicFinancialCompleteness";
import { DataClinicDuplicates } from "@/components/data-clinic/DataClinicDuplicates";
import { Stethoscope, Bug, RefreshCw, Copy, FileText, ArrowLeftRight, Wallet, Building2, Clock, CalendarDays, PieChart } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch } from '@/lib/api-fetch';

export default function DataClinicPage() {
  const { user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("activities");
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
        toast.error('Database migration required! See debug info below.');
      } else {
        toast.success('All database fields are properly configured.');
      }
    } catch (error) {
      toast.error('Failed to run debug check');
      console.error('Debug error:', error);
    } finally {
      setIsLoadingDebug(false);
    }
  };

  if (!canAccessDataClinic) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8 text-center">
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
      <div className="min-h-screen bg-white">
        <div className="p-8 w-full">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Stethoscope className="h-8 w-8 text-gray-700" />
              <h1 className="text-3xl font-bold">Data Clinic</h1>
            </div>
            <p className="text-muted-foreground">
              Detect and fix missing or invalid IATI fields in your aid project data
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="activities" className="w-full">
            <TabsList className="p-1 h-auto bg-background gap-1 border mb-6">
              <TabsTrigger value="activities" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="h-3 w-3" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ArrowLeftRight className="h-3 w-3" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="budgets" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Wallet className="h-3 w-3" />
                Budgets
              </TabsTrigger>
              <TabsTrigger value="organizations" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Building2 className="h-3 w-3" />
                Organizations
              </TabsTrigger>
              <TabsTrigger value="duplicates" className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Copy className="h-3 w-3" />
                Duplicates
              </TabsTrigger>
              <TabsTrigger value="timeliness" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Timeliness
              </TabsTrigger>
              <TabsTrigger value="financial-dates" className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Financial Dates
              </TabsTrigger>
              <TabsTrigger value="financial-completeness" className="flex items-center gap-1">
                <PieChart className="h-3 w-3" />
                Financial Completeness
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activities">
              <DataClinicActivities />
            </TabsContent>

            <TabsContent value="transactions">
              <DataClinicTransactions />
            </TabsContent>

            <TabsContent value="budgets">
              <DataClinicBudgets />
            </TabsContent>

            <TabsContent value="organizations">
              <DataClinicOrganizations />
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