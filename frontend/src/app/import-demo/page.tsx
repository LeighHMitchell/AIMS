"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImportWizard } from '@/components/import/ImportWizard';
import { FieldMapping, ImportResults } from '@/types/import';
import { FileSpreadsheet, Activity, Building2, DollarSign } from 'lucide-react';

export default function ImportDemoPage() {
  const handleImport = async (data: any[], mappings: FieldMapping[], fileName?: string): Promise<ImportResults> => {
    // Simulate API call
    console.log('Import Data:', { data, mappings, fileName });
    
    // Mock successful import
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      successful: Math.floor(data.length * 0.9),
      failed: Math.ceil(data.length * 0.1),
      errors: data.slice(0, Math.ceil(data.length * 0.1)).map((_, idx) => ({
        row: idx + 2,
        field: 'general',
        message: 'Sample validation error',
        value: null
      })),
      importedIds: data.slice(0, Math.floor(data.length * 0.9)).map((_, idx) => `mock-${idx}`)
    };
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Smart Import Tool Demo</h1>
          <p className="text-muted-foreground">
            Test the bulk import functionality without authentication
          </p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="activities" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activities">
                <Activity className="h-4 w-4 mr-2" />
                Activities
              </TabsTrigger>
              <TabsTrigger value="organizations">
                <Building2 className="h-4 w-4 mr-2" />
                Organizations
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <DollarSign className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="mt-6">
              <ImportWizard
                entityType="activities"
                onImport={handleImport}
              />
            </TabsContent>

            <TabsContent value="organizations" className="mt-6">
              <ImportWizard
                entityType="organizations"
                onImport={handleImport}
              />
            </TabsContent>

            <TabsContent value="transactions" className="mt-6">
              <ImportWizard
                entityType="transactions"
                onImport={handleImport}
              />
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>This is a demo page. In the real app, import functionality requires authentication.</p>
          <p className="mt-2">
            <a href="/login" className="text-primary hover:underline">
              Go to Login →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}