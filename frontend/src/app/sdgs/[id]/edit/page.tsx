"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import { ProfileEditor } from '@/components/profiles/ProfileEditor'
import { SDG_GOALS } from '@/data/sdg-targets'

export default function SDGEditPage() {
  const params = useParams()
  const id = String(params?.id ?? '')
  const goal = SDG_GOALS.find(g => String(g.id) === id)

  return (
    <ProfileEditor
      profileType="sdg"
      profileId={id}
      entityLabel="SDG"
      name={goal ? `SDG ${goal.id}: ${goal.name}` : `SDG ${id}`}
      code={id}
      codeLabel="Goal number"
      defaultDescription={goal?.description}
      defaultColor={goal?.color || '#4C5568'}
      backHref={`/sdgs/${id}`}
      breadcrumbItems={[
        { label: 'SDGs', href: '/sdgs' },
        { label: goal?.name || `SDG ${id}`, href: `/sdgs/${id}` },
        { label: 'Edit' },
      ]}
    />
  )
}
