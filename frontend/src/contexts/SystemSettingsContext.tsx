"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
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
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
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
          homeCountry: data.homeCountry || 'RW',
          homeCountryData: countryData || {
            code: data.homeCountry || 'RW',
            name: 'Rwanda', // fallback
            dialCode: '+250' // fallback
          }
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching system settings:', err)
        
        // Set default settings on error
        setSettings({
          homeCountry: 'RW',
          homeCountryData: {
            code: 'RW',
            name: 'Rwanda',
            dialCode: '+250'
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, error }}>
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
  return settings?.homeCountry || 'RW'
}

// Helper function to get the home country data with fallback
export function useHomeCountryData() {
  const { settings } = useSystemSettings()
  return settings?.homeCountryData || {
    code: 'RW',
    name: 'Rwanda',
    dialCode: '+250'
  }
}
