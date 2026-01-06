"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Globe, Save, CheckCircle, AlertCircle, Languages, DollarSign, Calendar } from "lucide-react"
import { countries } from "@/data/countries"
import { useSystemSettings } from "@/hooks/useSystemSettings"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { SearchableSelect } from "@/components/ui/searchable-select"
import Flag from "react-world-flags"
import { CustomYearsManagement } from "./CustomYearsManagement"

// Get unique countries sorted alphabetically by name
const sortedCountries = Array.from(new Map(countries.map(c => [c.code, c])).values())
  .sort((a, b) => a.name.localeCompare(b.name))

// Convert countries to searchable select options with flag icons
const countryOptions = sortedCountries.map(country => ({
  value: country.code,
  label: country.name,
  icon: <Flag code={country.code} className="w-5 h-4 object-cover rounded-sm" />
}))

// Common languages list
const languages = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "hi", name: "Hindi" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "ko", name: "Korean" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "my", name: "Burmese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "sw", name: "Swahili" },
  { code: "rw", name: "Kinyarwanda" },
  { code: "am", name: "Amharic" },
].sort((a, b) => a.name.localeCompare(b.name))

// Convert languages to searchable select options
const languageOptions = languages.map(lang => ({
  value: lang.code,
  label: lang.name
}))

// Common currencies list
const currencies = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
  { code: "MMK", name: "Myanmar Kyat", symbol: "K" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$" },
  { code: "ARS", name: "Argentine Peso", symbol: "$" },
].sort((a, b) => a.name.localeCompare(b.name))

// Convert currencies to searchable select options
const currencyOptions = currencies.map(currency => ({
  value: currency.code,
  label: `${currency.name} (${currency.symbol})`
}))

export function SystemsSettings() {
  const { settings, loading, error, updateSettings } = useSystemSettings()
  const [savingCountry, setSavingCountry] = useState(false)
  const [savingLanguage, setSavingLanguage] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [localHomeCountry, setLocalHomeCountry] = useState<string>("")
  const [localLanguage, setLocalLanguage] = useState<string>("")
  const [localCurrency, setLocalCurrency] = useState<string>("")

  // Update local state when settings change from the API
  useEffect(() => {
    if (settings?.homeCountry) {
      setLocalHomeCountry(settings.homeCountry)
    }
    if (settings?.defaultLanguage) {
      setLocalLanguage(settings.defaultLanguage)
    }
    if (settings?.defaultCurrency) {
      setLocalCurrency(settings.defaultCurrency)
    }
  }, [settings])

  const handleSaveCountry = async () => {
    setSavingCountry(true)
    try {
      const success = await updateSettings({
        homeCountry: localHomeCountry,
        defaultLanguage: settings?.defaultLanguage || "en",
        defaultCurrency: settings?.defaultCurrency || "USD"
      })
      if (success) {
        toast.success('Home country saved successfully')
      } else {
        toast.error(error || 'Failed to save home country')
      }
    } catch (err) {
      console.error('Error saving home country:', err)
      toast.error('An unexpected error occurred while saving')
    } finally {
      setSavingCountry(false)
    }
  }

  const handleSaveLanguage = async () => {
    setSavingLanguage(true)
    try {
      const success = await updateSettings({
        homeCountry: settings?.homeCountry || "RW",
        defaultLanguage: localLanguage,
        defaultCurrency: settings?.defaultCurrency || "USD"
      })
      if (success) {
        toast.success('Default language saved successfully')
      } else {
        toast.error(error || 'Failed to save default language')
      }
    } catch (err) {
      console.error('Error saving default language:', err)
      toast.error('An unexpected error occurred while saving')
    } finally {
      setSavingLanguage(false)
    }
  }

  const handleSaveCurrency = async () => {
    setSavingCurrency(true)
    try {
      const success = await updateSettings({
        homeCountry: settings?.homeCountry || "RW",
        defaultLanguage: settings?.defaultLanguage || "en",
        defaultCurrency: localCurrency
      })
      if (success) {
        toast.success('Default currency saved successfully')
      } else {
        toast.error(error || 'Failed to save default currency')
      }
    } catch (err) {
      console.error('Error saving default currency:', err)
      toast.error('An unexpected error occurred while saving')
    } finally {
      setSavingCurrency(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p>Loading...</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Home Country
            </CardTitle>
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
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Home Country Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Home Country
          </CardTitle>
          <CardDescription>
            Set the default country for maps and system defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="home-country" className="text-sm font-medium">
                Country
              </Label>
              <HelpTextTooltip
                content="The default country for maps and other system defaults."
              />
              {settings && localHomeCountry && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <SearchableSelect
              options={countryOptions}
              value={localHomeCountry}
              onValueChange={setLocalHomeCountry}
              placeholder="Select country..."
              searchPlaceholder="Search countries..."
              emptyText="No countries found."
              disabled={savingCountry}
              showValueCode={false}
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              onClick={handleSaveCountry}
              disabled={savingCountry || !localHomeCountry}
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {savingCountry ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Language Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Default Language
          </CardTitle>
          <CardDescription>
            Set the default language for the system interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="default-language" className="text-sm font-medium">
                Language
              </Label>
              <HelpTextTooltip
                content="The default language for the system interface."
              />
              {settings && localLanguage && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <SearchableSelect
              options={languageOptions}
              value={localLanguage}
              onValueChange={setLocalLanguage}
              placeholder="Select language..."
              searchPlaceholder="Search languages..."
              emptyText="No languages found."
              disabled={savingLanguage}
              showValueCode={false}
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              onClick={handleSaveLanguage}
              disabled={savingLanguage || !localLanguage}
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {savingLanguage ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Currency Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Default Currency
          </CardTitle>
          <CardDescription>
            Set the default currency for financial data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="default-currency" className="text-sm font-medium">
                Currency
              </Label>
              <HelpTextTooltip
                content="The default currency for displaying financial amounts."
              />
              {settings && localCurrency && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
            <SearchableSelect
              options={currencyOptions}
              value={localCurrency}
              onValueChange={setLocalCurrency}
              placeholder="Select currency..."
              searchPlaceholder="Search currencies..."
              emptyText="No currencies found."
              disabled={savingCurrency}
              showValueCode={false}
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              onClick={handleSaveCurrency}
              disabled={savingCurrency || !localCurrency}
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {savingCurrency ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Years Card - spans 2 columns on next row */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Custom Years
          </CardTitle>
          <CardDescription>
            Define fiscal years for reporting and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomYearsManagement />
        </CardContent>
      </Card>
    </div>
  )
}
