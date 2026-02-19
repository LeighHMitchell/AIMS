"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgDashboardStats } from '@/hooks/useOrgDashboardStats';
import { useUser } from '@/hooks/useUser';
import { Activity, Pencil, Clock, CheckCircle } from 'lucide-react';

interface OrgSummaryCardsProps {
  organizationId: string;
}

export function OrgSummaryCards({ organizationId }: OrgSummaryCardsProps) {
  const router = useRouter();
  const { user } = useUser();
  const { stats, loading, error } = useOrgDashboardStats(organizationId, user?.id);

  // Handle click to navigate to filtered activity list
  const handleCardClick = (filter?: string) => {
    if (filter) {
      router.push(`/activities?${filter}`);
    } else {
      router.push('/activities');
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">Failed to load dashboard statistics: {error}</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Activities',
      value: stats?.totalActivities ?? 0,
      icon: Activity,
      description: 'Activities reported by your organization',
      onClick: () => handleCardClick(),
      color: 'text-slate-500',
      bgColor: 'hover:bg-slate-50',
    },
    {
      title: 'Unpublished',
      value: stats?.unpublishedCount ?? 0,
      icon: Pencil,
      description: 'Draft activities awaiting publication',
      onClick: () => handleCardClick('publicationStatus=draft'),
      color: 'text-slate-500',
      bgColor: 'hover:bg-slate-50',
    },
    {
      title: 'Pending Validation',
      value: stats?.pendingValidationCount ?? 0,
      icon: Clock,
      description: 'Activities submitted for government review',
      onClick: () => handleCardClick('submissionStatuses=submitted'),
      color: 'text-slate-500',
      bgColor: 'hover:bg-slate-50',
    },
    {
      title: 'Validated',
      value: stats?.validatedCount ?? 0,
      icon: CheckCircle,
      description: 'Activities approved by government',
      onClick: () => handleCardClick('submissionStatuses=validated'),
      color: 'text-slate-500',
      bgColor: 'hover:bg-slate-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`bg-white cursor-pointer ${card.bgColor} hover:shadow-md`}
          onClick={card.onClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
