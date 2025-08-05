'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { EventManagement } from '@/components/calendar/EventManagement'

export default function AdminCalendarEventsPage() {
  return (
    <MainLayout>
      <EventManagement />
    </MainLayout>
  )
} 