import { useState, useEffect } from 'react'

interface SystemSettings {
  homeCountry: string
  defaultLanguage: string
  defaultCurrency: string
}

interface UseSystemSettingsReturn {
  settings: SystemSettings | null
  loading: boolean
  error: string | null
  updateSettings: (newSettings: SystemSettings) => Promise<boolean>
  refresh: () => void
}

export function useSystemSettings(): UseSystemSettingsReturn {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/system-settings')
      if (!response.ok) {
        throw new Error('Failed to fetch system settings')
      }

      const data = await response.json()
      setSettings(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching system settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: SystemSettings): Promise<boolean> => {
    try {
      setError(null)

      const response = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to update system settings'
        throw new Error(errorMessage)
      }

      // Only update settings if we get success
      if (data.success) {
        setSettings({
          homeCountry: data.homeCountry,
          defaultLanguage: data.defaultLanguage,
          defaultCurrency: data.defaultCurrency
        })
        return true
      }

      throw new Error('Update failed without error message')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error updating system settings:', err)
      return false
    }
  }

  const refresh = () => {
    fetchSettings()
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    settings,
    loading,
    error,
    updateSettings,
    refresh
  }
}
