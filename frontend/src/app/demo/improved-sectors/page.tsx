'use client';

import React, { useState } from 'react';
import { MainLayout } from "@/components/layout/main-layout";
import ImprovedSectorAllocationForm from "@/components/activities/ImprovedSectorAllocationForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SectorValidation } from '@/types/sector';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface SectorAllocation {
  id: string;
  code: string;
  name: string;
  percentage: number;
  category?: string;
  categoryName?: string;
  categoryCode?: string;
  [key: string]: any;
}

export default function ImprovedSectorsDemoPage() {
  const [allocations, setAllocations] = useState<SectorAllocation[]>([
    {
      id: '1',
      code: '11110',
      name: '11110 – Education policy and administrative management',
      percentage: 25,
      category: '111 - Education, Level Unspecified',
      categoryCode: '111'
    },
    {
      id: '2',
      code: '12220',
      name: '12220 – Basic health care',
      percentage: 35,
      category: '122 - Basic Health',
      categoryCode: '122'
    },
    {
      id: '3',
      code: '14010',
      name: '14010 – Water sector policy and administrative management',
      percentage: 20,
      category: '140 - Water Supply & Sanitation',
      categoryCode: '140'
    },
    {
      id: '4',
      code: '23210',
      name: '23210 – Energy generation, renewable sources - multiple technologies',
      percentage: 20,
      category: '232 - Energy Generation, Renewable Sources',
      categoryCode: '232'
    }
  ]);
  
  const [validation, setValidation] = useState<SectorValidation>({
    isValid: true,
    totalPercentage: 100,
    remainingPercentage: 0,
    errors: []
  });

  return (
    <MainLayout>
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Improved Sector Allocation Demo
          </h1>
          <p className="text-muted-foreground">
            Experience the enhanced sector allocation interface with improved UX, visual feedback, and intuitive category grouping.
          </p>
        </div>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Improvements</CardTitle>
              <CardDescription>What's new in the improved sector allocation form</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Grouped by Category</p>
                    <p className="text-xs text-muted-foreground">Sectors organized under their DAC 3-digit categories</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Visual Progress Bars</p>
                    <p className="text-xs text-muted-foreground">See allocation percentages at a glance</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Quick Search</p>
                    <p className="text-xs text-muted-foreground">Find sectors instantly with smart search</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-amber-600">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Color Coding</p>
                    <p className="text-xs text-muted-foreground">Each category has a unique color</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-red-600">5</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Real-time Validation</p>
                    <p className="text-xs text-muted-foreground">Instant feedback on allocation errors</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-teal-600">6</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Smart Actions</p>
                    <p className="text-xs text-muted-foreground">Distribute equally & clear all with one click</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Try it out!</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Validation Status:</span>
            {validation.isValid ? (
              <Badge className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Valid (100%)
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Invalid ({validation.totalPercentage}%)
              </Badge>
            )}
          </div>
        </div>

        <ImprovedSectorAllocationForm
          allocations={allocations}
          onChange={setAllocations}
          onValidationChange={setValidation}
          allowPublish={true}
        />
        
        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h3 className="font-medium text-foreground mb-3">Current Allocation Data:</h3>
          <pre className="text-xs bg-card p-4 rounded border overflow-x-auto">
{JSON.stringify(allocations, null, 2)}
          </pre>
        </div>
      </div>
    </MainLayout>
  );
} 