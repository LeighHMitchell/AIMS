"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Globe, Save, CheckCircle, AlertCircle } from "lucide-react"
import { countries } from "@/data/countries"
import { useSystemSettings } from "@/hooks/useSystemSettings"

// Flag component to match the rest of the application
const CountryFlag = ({ countryCode }: { countryCode: string }) => {
  return (
    <img
      src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
      alt={`${countryCode} flag`}
      className="w-4 h-3 object-cover rounded-sm"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  )
}

export function SystemsSettings() {
  const { settings, loading, error, updateSettings } = useSystemSettings()
  const [saving, setSaving] = useState(false)
  const [localHomeCountry, setLocalHomeCountry] = useState<string>("")

  // Update local state when settings change from the API
  useEffect(() => {
    if (settings?.homeCountry) {
      setLocalHomeCountry(settings.homeCountry)
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await updateSettings({ homeCountry: localHomeCountry })
      if (success) {
        toast.success('System settings saved successfully')
      } else {
        // Show the error from the hook
        toast.error(error || 'Failed to save system settings')
      }
    } catch (err) {
      console.error('Error saving system settings:', err)
      toast.error('An unexpected error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const selectedCountry = countries.find(c => c.code === localHomeCountry)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Systems Settings
          </CardTitle>
          <CardDescription>
            Configure global system settings and defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Loading system settings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Systems Settings
          </CardTitle>
          <CardDescription>
            Configure global system settings and defaults
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-red-600">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading system settings: {error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Systems Settings
        </CardTitle>
        <CardDescription>
          Configure global system settings and defaults
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="home-country" className="text-sm font-medium">
            Home Country
          </Label>
          <Select
            value={localHomeCountry}
            onValueChange={(value) => setLocalHomeCountry(value)}
          >
            <SelectTrigger id="home-country" className="w-full">
              <SelectValue>
                {selectedCountry ? (
                  <div className="flex items-center gap-2">
                    <CountryFlag countryCode={selectedCountry.code} />
                    <span>{selectedCountry.name}</span>
                  </div>
                ) : (
                  "Select home country"
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center gap-2">
                    <CountryFlag countryCode={country.code} />
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This setting determines the default country for the system and affects various defaults throughout the application.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {settings && (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Settings loaded</span>
              </>
            )}
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving || !localHomeCountry}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
