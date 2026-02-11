"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { countries } from '@/data/countries'

interface SystemSettings {
  homeCountry: string
  homeCountryData?: {
    code: string
    name: string
    dialCode?: string
  }
}

interface SystemSettingsContextType {
  settings: SystemSettings | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/system-settings')
      if (!response.ok) {
        throw new Error('Failed to fetch system settings')
      }

      const data = await response.json()

      // Find the country data
      const countryData = countries.find(c => c.code === data.homeCountry)

      setSettings({
        homeCountry: data.homeCountry || '',
        homeCountryData: countryData || {
          code: data.homeCountry || '',
          name: '',
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching system settings:', err)

      // Don't set fallback defaults on auth error — will retry after login
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Retry when the page becomes visible (e.g. after login redirect)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !settings?.homeCountry) {
        fetchSettings()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchSettings, settings?.homeCountry])

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, error, refetch: fetchSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  )
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext)
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider')
  }
  return context
}

// Helper function to get the home country with fallback
export function useHomeCountry() {
  const { settings } = useSystemSettings()
  return settings?.homeCountry || ''
}

// Helper function to get the home country data with fallback
export function useHomeCountryData() {
  const { settings } = useSystemSettings()
  return settings?.homeCountryData || {
    code: '',
    name: '',
    dialCode: ''
  }
}
