"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import { ProfileEditor } from '@/components/profiles/ProfileEditor'
import { MYANMAR_REGIONS } from '@/data/myanmar-regions'

export default function LocationEditPage() {
  const params = useParams()
  const pcode = String(params?.pcode ?? '')
  const region = MYANMAR_REGIONS.find(r => r.st_pcode === pcode)

  return (
    <ProfileEditor
      profileType="location"
      profileId={pcode}
      entityLabel="Location"
      name={region?.name || pcode}
      code={pcode}
      codeLabel="P-code"
      defaultColor="#3C6255"
      backHref={`/location-profiles/${pcode}`}
      breadcrumbItems={[
        { label: 'Location Profiles', href: '/location-profiles' },
        { label: region?.name || pcode, href: `/location-profiles/${pcode}` },
        { label: 'Edit' },
      ]}
    />
  )
}
