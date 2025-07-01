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
import { Stethoscope, Bug, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        const res = await fetch('/api/data-clinic/debug');
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
      const res = await fetch('/api/data-clinic/debug');
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
      <div className="min-h-screen bg-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Stethoscope className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold">Data Clinic</h1>
                </div>
                <p className="text-muted-foreground">
                  Detect and fix missing or invalid IATI fields in your aid project data
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleDebugCheck}
                disabled={isLoadingDebug}
                className="gap-2"
              >
                {isLoadingDebug ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Bug className="h-4 w-4" />
                )}
                Debug Check
              </Button>
            </div>
          </div>

          {/* Debug Info */}
          {showDebug && debugInfo && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Debug Information</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebug(false)}
                  >
                    Hide
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Activities Count: {debugInfo.checks?.activities?.count || 0}</div>
                      <div>Transactions Count: {debugInfo.checks?.transactions?.count || 0}</div>
                      <div>Organizations Count: {debugInfo.checks?.organizations?.count || 0}</div>
                      <div>Migration Required: {debugInfo.summary?.migrationRequired ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {/* Missing Fields */}
                  {debugInfo.summary?.migrationRequired && (
                    <div>
                      <h4 className="font-semibold mb-2">Missing Fields</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(debugInfo.checks?.activityFields || {}).map(([field, info]: [string, any]) => (
                          !info.exists && (
                            <div key={field} className="text-red-600">
                              Activities.{field}: Missing
                            </div>
                          )
                        ))}
                        {Object.entries(debugInfo.checks?.transactionFields || {}).map(([field, info]: [string, any]) => (
                          !info.exists && (
                            <div key={field} className="text-red-600">
                              Transactions.{field}: Missing
                            </div>
                          )
                        ))}
                        {Object.entries(debugInfo.checks?.organizationFields || {}).map(([field, info]: [string, any]) => (
                          !info.exists && (
                            <div key={field} className="text-red-600">
                              Organizations.{field}: Missing
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {debugInfo.summary?.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {debugInfo.summary.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Raw JSON */}
                  <details className="text-xs">
                    <summary className="cursor-pointer font-semibold">Raw Debug Data</summary>
                    <pre className="mt-2 p-2 bg-white rounded overflow-auto max-h-96">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="activities" className="w-full">
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="organizations">Organizations</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                <Button
                  variant="default"
                  onClick={handleDebugCheck}
                  size="sm"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Debug Check
                </Button>
              </div>
            </div>

            <TabsContent value="activities">
              <DataClinicActivities />
            </TabsContent>

            <TabsContent value="transactions">
              <DataClinicTransactions />
            </TabsContent>

            <TabsContent value="organizations">
              <DataClinicOrganizations />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
} 