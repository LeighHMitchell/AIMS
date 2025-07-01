"use client"

import React from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileSpreadsheet, 
  Building2, 
  Receipt, 
  Activity,
  Upload,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const importOptions = [
  {
    id: 'activities',
    title: 'Import Activities',
    description: 'Import activity data including titles, descriptions, dates, budgets, and implementing organizations',
    icon: Activity,
    href: '/import/activities',
    fields: ['Activity Title', 'Start Date', 'End Date', 'Total Budget', 'Donor Organization'],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'organizations',
    title: 'Import Organizations',
    description: 'Import organization data including names, IATI identifiers, countries, and contact information',
    icon: Building2,
    href: '/import/organizations',
    fields: ['Organization Name', 'IATI ID', 'Country', 'Organization Type'],
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  {
    id: 'transactions',
    title: 'Import Transactions',
    description: 'Import financial transactions including disbursements, expenditures, and commitments',
    icon: Receipt,
    href: '/import/transactions',
    fields: ['Transaction Date', 'Amount', 'Transaction Type', 'Activity Title'],
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

export default function ImportPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8" />
            Smart Import Tool
          </h1>
          <p className="text-muted-foreground mt-2">
            Bulk import your data from CSV or Excel files with intelligent field mapping
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {importOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.id}
                className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${option.color}`}
              >
                <Link href={option.href}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <Icon className="h-8 w-8" />
                      <ArrowRight className="h-5 w-5 opacity-50" />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{option.title}</h3>
                      <p className="text-sm mt-2 opacity-90">
                        {option.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium opacity-75">Key fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {option.fields.map((field) => (
                          <span
                            key={field}
                            className="text-xs px-2 py-1 bg-white/50 rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 bg-muted/50">
          <div className="flex items-start gap-4">
            <Upload className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold">How it works</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Choose the type of data you want to import</li>
                <li>Upload your CSV or Excel file (max 10MB)</li>
                <li>Map your file columns to system fields using drag-and-drop</li>
                <li>Review validation results and import your data</li>
              </ol>
              <p className="text-sm text-muted-foreground pt-2">
                The system will automatically suggest field mappings and validate your data before import.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}