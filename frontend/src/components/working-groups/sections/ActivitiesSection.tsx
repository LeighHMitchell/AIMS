"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'

interface LinkedActivity {
  id: string
  title: string
  iati_id?: string
  activity_status: string
  partner_name: string
}

interface ActivitiesSectionProps {
  activities: LinkedActivity[]
}

export default function ActivitiesSection({ activities }: ActivitiesSectionProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Linked Activities</h2>
        <p className="text-sm text-gray-500 mt-1">Activities associated with this working group</p>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">No activities linked</p>
          <p className="text-xs text-muted-foreground mt-1">
            Activities can be linked to this working group from the activity editor
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/activities/${activity.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{activity.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.iati_id && <span>{activity.iati_id} &middot; </span>}
                    {activity.partner_name}
                  </p>
                </div>
                <Badge variant="outline">
                  {activity.activity_status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
