'use client';

import React from 'react';
import { SDGImageGridExample } from '@/components/examples/SDGImageGridExample';
import ActivityCardWithSDG from '@/components/activities/ActivityCardWithSDG';
import { ActivityList } from '@/components/activities/ActivityList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

// Sample activity data with SDG mappings
const sampleActivities = [
  {
    id: '1',
    title: 'Education Infrastructure Development Project',
    iati_id: 'EDU-001-2024',
    description: '<p>Building schools and training centers in rural communities to improve access to quality education. This comprehensive project includes teacher training, curriculum development, and digital learning infrastructure.</p>',
    activity_status: '2', // Implementation
    publication_status: 'published',
    planned_start_date: '2024-01-15',
    planned_end_date: '2026-12-31',
    updated_at: '2024-01-20T10:30:00Z',
    banner: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=200&fit=crop',
    icon: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=50&h=50&fit=crop&crop=face',
    sdgMappings: [
      { id: '1', sdgGoal: 4, sdgTarget: '4.1', contributionPercent: 80 },
      { id: '2', sdgGoal: 5, sdgTarget: '5.1', contributionPercent: 60 },
      { id: '3', sdgGoal: 10, sdgTarget: '10.2', contributionPercent: 40 }
    ]
  },
  {
    id: '2',
    title: 'Renewable Energy and Climate Resilience Initiative',
    iati_id: 'ENERGY-002-2024',
    description: '<p>Solar panel installation and energy efficiency programs targeting rural communities. Includes climate adaptation measures and sustainable energy solutions.</p>',
    activity_status: '1', // Pipeline
    publication_status: 'draft',
    planned_start_date: '2024-06-01',
    planned_end_date: '2027-05-31',
    updated_at: '2024-01-18T14:20:00Z',
    banner: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=200&fit=crop',
    sdgMappings: [
      { id: '4', sdgGoal: 7, sdgTarget: '7.1', contributionPercent: 90 },
      { id: '5', sdgGoal: 11, sdgTarget: '11.6', contributionPercent: 70 },
      { id: '6', sdgGoal: 13, sdgTarget: '13.1', contributionPercent: 85 }
    ]
  },
  {
    id: '3',
    title: 'Community Health and Nutrition Program',
    iati_id: 'HEALTH-003-2024',
    description: '<p>Comprehensive healthcare access improvement and nutrition programs focusing on maternal health, child nutrition, and disease prevention in underserved communities.</p>',
    activity_status: '2', // Implementation
    publication_status: 'published',
    planned_start_date: '2023-09-01',
    planned_end_date: '2025-08-31',
    updated_at: '2024-01-19T09:15:00Z',
    banner: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
    sdgMappings: [
      { id: '7', sdgGoal: 1, sdgTarget: '1.4', contributionPercent: 50 },
      { id: '8', sdgGoal: 2, sdgTarget: '2.2', contributionPercent: 75 },
      { id: '9', sdgGoal: 3, sdgTarget: '3.1', contributionPercent: 95 },
      { id: '10', sdgGoal: 5, sdgTarget: '5.6', contributionPercent: 60 },
      { id: '11', sdgGoal: 6, sdgTarget: '6.1', contributionPercent: 45 },
      { id: '12', sdgGoal: 10, sdgTarget: '10.3', contributionPercent: 30 }
    ]
  },
  {
    id: '4',
    title: 'Economic Empowerment and Job Creation',
    iati_id: 'ECON-004-2024',
    description: '<p>Skills training and microfinance programs to create sustainable employment opportunities for youth and women in urban and rural areas.</p>',
    activity_status: '4', // Closed
    publication_status: 'published',
    planned_start_date: '2022-01-01',
    planned_end_date: '2023-12-31',
    updated_at: '2024-01-15T16:45:00Z',
    banner: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop',
    sdgMappings: [
      { id: '13', sdgGoal: 1, sdgTarget: '1.1', contributionPercent: 80 },
      { id: '14', sdgGoal: 5, sdgTarget: '5.5', contributionPercent: 70 },
      { id: '15', sdgGoal: 8, sdgTarget: '8.5', contributionPercent: 90 }
    ]
  },
  {
    id: '5',
    title: 'Digital Infrastructure Project',
    iati_id: 'DIGITAL-005-2024',
    description: '<p>Expanding internet connectivity and digital literacy programs to bridge the digital divide in remote communities.</p>',
    activity_status: '5', // Cancelled
    publication_status: 'pending',
    planned_start_date: '2024-03-01',
    planned_end_date: '2026-02-28',
    updated_at: '2024-01-21T11:30:00Z',
    banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=200&fit=crop',
    sdgMappings: [
      { id: '16', sdgGoal: 9, sdgTarget: '9.c', contributionPercent: 85 }
    ]
  },
  {
    id: '6',
    title: 'Water and Sanitation Improvement Initiative',
    iati_id: 'WASH-006-2024',
    description: '<p>Clean water access and sanitation infrastructure development in rural communities, including hygiene education programs.</p>',
    activity_status: '6', // Suspended
    publication_status: 'published',
    planned_start_date: '2023-07-01',
    planned_end_date: '2025-06-30',
    updated_at: '2024-01-20T13:20:00Z',
    sdgMappings: [] // No SDGs assigned - will show "No SDG assigned" message
  }
];

export default function SDGDemoPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          SDG Icons & Status Display Demo
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          This page demonstrates the improved activity cards with prominent SDG icons and proper status text display.
          Notice how SDG icons appear both in the banner overlay and in the card content.
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg">SDG Icons</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              SDG icons now appear prominently in the top-right corner of activity banners and in the card content below.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Status Labels</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Activity status now shows proper text labels like "Implementation", "Cancelled", "Suspended" instead of numbers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-lg">Visual Hierarchy</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              SDG icons are sized appropriately and positioned for maximum visibility without overwhelming the design.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Status Display Examples</CardTitle>
          <CardDescription>
            Different activity statuses with proper text labels and colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Pipeline</Badge>
            <Badge variant="success">Implementation</Badge>
            <Badge variant="secondary">Finalisation</Badge>
            <Badge variant="secondary">Closed</Badge>
            <Badge variant="destructive">Cancelled</Badge>
            <Badge variant="outline">Suspended</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Individual Activity Cards */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Individual Activity Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleActivities.map((activity) => (
            <ActivityCardWithSDG
              key={activity.id}
              activity={activity}
              showSDGs={true}
              maxSDGDisplay={3}
            />
          ))}
        </div>
      </div>

      {/* Activity List Component */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Activity List Component</h2>
        <ActivityList 
          activities={sampleActivities}
        />
      </div>

      {/* SDG Image Grid Examples */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">SDG Image Grid Component</h2>
        <SDGImageGridExample />
      </div>
    </div>
  );
}