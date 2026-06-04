"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import { ProfileEditor } from '@/components/profiles/ProfileEditor'
import { getSectorInfo } from '@/lib/sector-hierarchy'
import { getSectorColor } from '@/lib/sector-colors'

export default function SectorEditPage() {
  const params = useParams()
  const code = String(params?.code ?? '')
  const info = getSectorInfo(code)
  const color = getSectorColor(code) || '#6B7280'

  return (
    <ProfileEditor
      profileType="sector"
      profileId={code}
      entityLabel="Sector"
      name={info?.name || code}
      code={code}
      codeLabel="DAC code"
      defaultColor={color}
      backHref={`/sectors/${code}`}
      breadcrumbItems={[
        { label: 'All Sectors', href: '/sectors' },
        { label: info ? `${info.name} (${code})` : code, href: `/sectors/${code}` },
        { label: 'Edit' },
      ]}
    />
  )
}
