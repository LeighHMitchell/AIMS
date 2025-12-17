"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Globe, Save, CheckCircle, AlertCircle } from "lucide-react"
import { countries } from "@/data/countries"
import { useSystemSettings } from "@/hooks/useSystemSettings"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
        toast.error(error || 'Failed to save system settings')
      }
    } catch (err) {
      console.error('Error saving system settings:', err)
      toast.error('An unexpected error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full lg:w-1/3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure global system settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full lg:w-1/3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure global system settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Error: {error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full lg:w-1/3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          System Settings
        </CardTitle>
        <CardDescription>
          Configure global system settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="home-country" className="text-sm font-medium">
              Home Country
            </Label>
            <HelpTextTooltip
              content="The default country for maps and other system defaults."
            />
            {settings && localHomeCountry && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
          <Select
            value={localHomeCountry}
            onValueChange={setLocalHomeCountry}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select country..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !localHomeCountry}
            size="sm"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
