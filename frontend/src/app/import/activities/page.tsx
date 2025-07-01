"use client"

import React from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ImportWizard } from '@/components/import/ImportWizard';
import { FieldMapping, ImportResults } from '@/types/import';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ImportActivitiesPage() {
  const handleImport = async (data: any[], mappings: FieldMapping[], fileName?: string): Promise<ImportResults> => {
    const response = await fetch('/api/import/activities/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data,
        mappings,
        fileName: fileName || 'unknown_file.csv',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Import failed');
    }
    
    return response.json();
  };
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/import">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import Options
            </Button>
          </Link>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">Import Activities</h1>
          <p className="text-muted-foreground mt-1">
            Import your activity data from CSV or Excel files
          </p>
        </div>
        
        <ImportWizard
          entityType="activities"
          onImport={handleImport}
          requiredPermission="create_projects"
        />
      </div>
    </MainLayout>
  );
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}