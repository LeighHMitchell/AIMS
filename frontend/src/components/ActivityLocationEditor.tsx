"use client"

import React, { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet"
import L from "leaflet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Globe, Info, Check, ChevronsUpDown, X, Search } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// IATI Activity Scope Codes
const ACTIVITY_SCOPES = [
  { code: "1", name: "Global" },
  { code: "2", name: "Regional" },
  { code: "3", name: "Multi-national" },
  { code: "4", name: "National" },
  { code: "5", name: "Sub-national: Multi First-Level Admin Areas" },
  { code: "6", name: "Sub-national: Single First-Level Admin Area" },
  { code: "7", name: "Sub-national: Single Second-Level Admin Area" },
  { code: "8", name: "Single Location" }
]

// Location Categories (for single location scope)
const LOCATION_CATEGORIES = [
  { value: "health_facility", label: "Health Facility" },
  { value: "education_center", label: "Education Center" },
  { value: "community_center", label: "Community Center" },
  { value: "government_office", label: "Government Office" },
  { value: "distribution_point", label: "Distribution Point" },
  { value: "project_site", label: "Project Site" },
  { value: "other", label: "Other" }
]

// Myanmar Administrative Units
const MYANMAR_REGIONS = [
  { value: "ayeyarwady", label: "Ayeyarwady Region", type: "region" },
  { value: "bago", label: "Bago Region", type: "region" },
  { value: "magway", label: "Magway Region", type: "region" },
  { value: "mandalay", label: "Mandalay Region", type: "region" },
  { value: "sagaing", label: "Sagaing Region", type: "region" },
  { value: "tanintharyi", label: "Tanintharyi Region", type: "region" },
  { value: "yangon", label: "Yangon Region", type: "region" },
  { value: "kachin", label: "Kachin State", type: "state" },
  { value: "kayah", label: "Kayah State", type: "state" },
  { value: "kayin", label: "Kayin State", type: "state" },
  { value: "chin", label: "Chin State", type: "state" },
  { value: "mon", label: "Mon State", type: "state" },
  { value: "rakhine", label: "Rakhine State", type: "state" },
  { value: "shan", label: "Shan State", type: "state" },
  { value: "naypyitaw", label: "Naypyitaw Union Territory", type: "territory" }
]

// Sample Townships (in production, this would be loaded dynamically)
const MYANMAR_TOWNSHIPS = [
  { value: "yangon_downtown", label: "Downtown", region: "yangon" },
  { value: "yangon_dagon", label: "Dagon", region: "yangon" },
  { value: "yangon_hlaing", label: "Hlaing", region: "yangon" },
  { value: "mandalay_aungmyethazan", label: "Aungmyethazan", region: "mandalay" },
  { value: "mandalay_chanayethazan", label: "Chanayethazan", region: "mandalay" },
  { value: "bago_bago", label: "Bago", region: "bago" },
  { value: "shan_taunggyi", label: "Taunggyi", region: "shan" },
  { value: "shan_lashio", label: "Lashio", region: "shan" }
]

// Countries list (simplified)
const COUNTRIES = [
  { value: "MM", label: "Myanmar" },
  { value: "TH", label: "Thailand" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "BD", label: "Bangladesh" },
  { value: "LA", label: "Laos" }
]

// Regional groups
const REGIONS = [
  { value: "southeast_asia", label: "Southeast Asia" },
  { value: "south_asia", label: "South Asia" },
  { value: "east_asia", label: "East Asia" },
  { value: "mekong", label: "Mekong Region" }
]

// Myanmar GeoJSON boundaries (simplified - in production, load from file)
const MYANMAR_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Myanmar", "admin": "country" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[92.0, 9.5], [101.2, 9.5], [101.2, 28.5], [92.0, 28.5], [92.0, 9.5]]]
      }
    }
  ]
}

interface ActivityLocationEditorProps {
  scope: string
  onScopeChange: (scope: string) => void
  locations: any
  onLocationsChange: (locations: any) => void
}

// Multi-select component
function MultiSelect({ 
  options, 
  value, 
  onChange, 
  placeholder 
}: { 
  options: Array<{value: string, label: string}>
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "w-full justify-between font-normal border border-input bg-background hover:bg-accent hover:text-accent-foreground px-3 py-2 text-sm rounded-md flex items-center",
          !value && "text-muted-foreground"
        )}
        aria-expanded={open}
        role="combobox">
        <span className="truncate">
          {value.length > 0 
            ? `${value.length} selected`
            : placeholder
          }
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} autoFocus />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    const newValue = value.includes(option.value)
                      ? value.filter(v => v !== option.value)
                      : [...value, option.value]
                    onChange(newValue)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Map controller component
function MapController({ bounds }: { bounds?: L.LatLngBounds }) {
  const map = useMap()
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [bounds, map])
  
  return null
}

// Main Activity Location Editor Component
export default function ActivityLocationEditor({
  scope,
  onScopeChange,
  locations,
  onLocationsChange
}: ActivityLocationEditorProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedCountry, setSelectedCountry] = useState("MM")
  const [selectedRegion, setSelectedRegion] = useState("")
  const [selectedRegionMulti, setSelectedRegionMulti] = useState<string[]>([])
  const [selectedTownship, setSelectedTownship] = useState("")
  const [singleLocation, setSingleLocation] = useState({
    name: "",
    latitude: 19.5,
    longitude: 96.5,
    category: "",
    description: ""
  })

  // Handle scope changes
  useEffect(() => {
    // Reset selections when scope changes
    setSelectedCountries([])
    setSelectedRegions([])
    setSelectedRegionMulti([])
    setSelectedRegion("")
    setSelectedTownship("")
    setSingleLocation({
      name: "",
      latitude: 19.5,
      longitude: 96.5,
      category: "",
      description: ""
    })
  }, [scope])

  // Get available townships based on selected region
  const availableTownships = selectedRegion 
    ? MYANMAR_TOWNSHIPS.filter(t => t.region === selectedRegion)
    : []

  // Style for highlighted regions
  const highlightStyle = {
    fillColor: "#3b82f6",
    fillOpacity: 0.3,
    color: "#1e3a8a",
    weight: 2,
    opacity: 1
  }

  return (
    <div className="space-y-6">
      {/* Activity Scope Selector */}
      <div className="space-y-2">
        <Label htmlFor="activityScope" className="text-sm font-medium">
          Activity Scope <span className="text-red-500">*</span>
        </Label>
        <Select value={scope} onValueChange={onScopeChange}>
          <SelectTrigger id="activityScope">
            <SelectValue placeholder="Select activity scope" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_SCOPES.map((scopeOption) => (
              <SelectItem key={scopeOption.code} value={scopeOption.code}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {scopeOption.code}
                  </Badge>
                  {scopeOption.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          The scope determines the geographic level of your activity
        </p>
      </div>

      {/* Dynamic UI based on scope */}
      {scope === "1" && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            No location input is required for globally scoped activities.
          </AlertDescription>
        </Alert>
      )}

      {(scope === "2" || scope === "3") && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {scope === "2" ? "Select Regions" : "Select Countries"}
            </Label>
            <MultiSelect
              options={scope === "2" ? REGIONS : COUNTRIES}
              value={scope === "2" ? selectedRegions : selectedCountries}
              onChange={scope === "2" ? setSelectedRegions : setSelectedCountries}
              placeholder={scope === "2" ? "Select regions" : "Select countries"}
            />
          </div>
          
          {/* Static map preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Coverage Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-500">
                  Map preview for {scope === "2" ? selectedRegions.length : selectedCountries.length} selected areas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {scope === "4" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium">
              Country <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger id="country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Static country map */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Country Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-hidden rounded border">
                <MapContainer
                  center={[19.0, 96.5]}
                  zoom={5}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                  dragging={false}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <GeoJSON 
                    data={MYANMAR_GEOJSON as any}
                    style={highlightStyle}
                  />
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {scope === "5" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Select Multiple Admin Areas <span className="text-red-500">*</span>
            </Label>
            <MultiSelect
              options={MYANMAR_REGIONS}
              value={selectedRegionMulti}
              onChange={setSelectedRegionMulti}
              placeholder="Select states/regions"
            />
          </div>

          {/* Map with highlighted regions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selected Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-hidden rounded border">
                <MapContainer
                  center={[19.0, 96.5]}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {/* In production, load actual GeoJSON for each selected region */}
                  {selectedRegionMulti.length > 0 && (
                    <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded shadow z-10">
                      {selectedRegionMulti.length} regions selected
                    </div>
                  )}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {scope === "6" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="singleRegion" className="text-sm font-medium">
              Select Admin Area <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger id="singleRegion">
                <SelectValue placeholder="Select state/region" />
              </SelectTrigger>
              <SelectContent>
                {MYANMAR_REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Map zoomed to selected region */}
          {selectedRegion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {MYANMAR_REGIONS.find(r => r.value === selectedRegion)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 overflow-hidden rounded border">
                  <MapContainer
                    center={[19.0, 96.5]}
                    zoom={8}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                  >
                    <TileLayer
                      url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {scope === "7" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region7" className="text-sm font-medium">
                State/Region <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger id="region7">
                  <SelectValue placeholder="Select state/region" />
                </SelectTrigger>
                <SelectContent>
                  {MYANMAR_REGIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="township" className="text-sm font-medium">
                Township <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={selectedTownship} 
                onValueChange={setSelectedTownship}
                disabled={!selectedRegion}
              >
                <SelectTrigger id="township">
                  <SelectValue placeholder="Select township" />
                </SelectTrigger>
                <SelectContent>
                  {availableTownships.map((township) => (
                    <SelectItem key={township.value} value={township.value}>
                      {township.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Map with township boundary and optional pin */}
          {selectedTownship && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {availableTownships.find(t => t.value === selectedTownship)?.label} Township
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 overflow-hidden rounded border">
                  <MapContainer
                    center={[19.0, 96.5]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                  >
                    <TileLayer
                      url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                  </MapContainer>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Click on the map to add a specific location within this township (optional)
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {scope === "8" && (
        <div className="space-y-4">
          {/* Address search */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Address Search
            </Label>
            <div className="flex gap-2">
              <Input
                id="address"
                placeholder="Search for an address..."
                className="flex-1"
              />
              <Button variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Interactive map */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-hidden rounded border">
                <MapContainer
                  center={[singleLocation.latitude, singleLocation.longitude]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {/* Add marker component here */}
                </MapContainer>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click on the map or search for an address to set the location
              </p>
            </CardContent>
          </Card>

          {/* Location details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationName" className="text-sm font-medium">
                Location Name
              </Label>
              <Input
                id="locationName"
                value={singleLocation.name}
                onChange={(e) => setSingleLocation({...singleLocation, name: e.target.value})}
                placeholder="e.g., Health Center, School"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Location Category <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={singleLocation.category} 
                onValueChange={(value) => setSingleLocation({...singleLocation, category: value})}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="text-sm font-medium">
                Latitude
              </Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={singleLocation.latitude}
                onChange={(e) => setSingleLocation({...singleLocation, latitude: parseFloat(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude" className="text-sm font-medium">
                Longitude
              </Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={singleLocation.longitude}
                onChange={(e) => setSingleLocation({...singleLocation, longitude: parseFloat(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={singleLocation.description}
              onChange={(e) => setSingleLocation({...singleLocation, description: e.target.value})}
              placeholder="Describe this location..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Summary of selected locations */}
      {scope !== "1" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Location Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {scope === "2" && `${selectedRegions.length} region(s) selected`}
              {scope === "3" && `${selectedCountries.length} country/countries selected`}
              {scope === "4" && `National scope: ${COUNTRIES.find(c => c.value === selectedCountry)?.label}`}
              {scope === "5" && `${selectedRegionMulti.length} administrative area(s) selected`}
              {scope === "6" && selectedRegion && `Single admin area: ${MYANMAR_REGIONS.find(r => r.value === selectedRegion)?.label}`}
              {scope === "7" && selectedTownship && `Township: ${availableTownships.find(t => t.value === selectedTownship)?.label}`}
              {scope === "8" && singleLocation.name && `Single location: ${singleLocation.name}`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}