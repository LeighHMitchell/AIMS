'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Trash2,
  Map,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';


import {
  locationFormSchema,
  type LocationFormSchema,
  type LocationSchema,
  SITE_TYPES,
  LOCATION_REACH_CODES,
  LOCATION_EXACTNESS_CODES,
  LOCATION_CLASS_CODES,
  LOCATION_ID_VOCABULARIES,
  ADMIN_LEVELS,
  getDefaultLocationValues,
  validateCoordinates,
} from '@/lib/schemas/location';

import {
  smartLocationSearch,
  reverseGeocode,
  extractAdministrativeInfo,
  formatAddress,
  isValidCoordinate,
} from '@/lib/geo/nominatim';
import {
  type LocationSearchResult,
  type GeocodingResult,
} from '@/lib/schemas/location';

import { SelectIATI, type SelectIATIGroup } from '@/components/ui/SelectIATI';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { IATI_LOCATION_TYPE_GROUPS } from '@/data/iati-location-types';
import { countries } from '@/data/countries';
import { getCountryCoordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/data/country-coordinates';
import { apiFetch } from '@/lib/api-fetch';

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

// IATI Select Groups Configuration
// Use comprehensive IATI Location Type codelist from imported data

const COVERAGE_SCOPE_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Coverage Scope',
    options: [
      { code: 'national', name: 'National', description: 'Country-wide scope' },
      { code: 'subnational', name: 'Subnational', description: 'Regional or state-level coverage' },
      { code: 'regional', name: 'Regional', description: 'Multi-country region coverage' },
      { code: 'local', name: 'Local', description: 'District or community coverage' },
    ],
  },
];

const SITE_TYPE_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Site Type',
    options: SITE_TYPES.map((type) => ({
      code: type,
      name: type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    })),
  },
];

const OSM_TYPE_PREFIX: Record<string, string> = {
  node: 'node',
  way: 'way',
  relation: 'relation',
  n: 'node',
  w: 'way',
  r: 'relation',
};

const LOCATION_CLASS_BY_TYPE: Record<string, '1' | '2' | '3' | '4' | '5'> = {
  city: '2',
  town: '2',
  village: '2',
  hamlet: '2',
  suburb: '2',
  neighbourhood: '2',
  hospital: '3',
  clinic: '3',
  pharmacy: '3',
  school: '3',
  university: '3',
  college: '3',
  government: '3',
  building: '3',
  office: '3',
  church: '3',
  temple: '3',
  mosque: '3',
  monastery: '3',
  shrine: '3',
  structure: '3',
  airport: '4',
  railway: '4',
  station: '4',
};

const FEATURE_DESIGNATION_BY_TYPE: Record<string, string> = {
  hospital: 'HSP',
  clinic: 'CLIN',
  pharmacy: 'HSP',
  school: 'SCH',
  university: 'SCH',
  college: 'SCH',
  government: 'GOV',
  office: 'FAC',
  building: 'BLDG',
  airport: 'ADMF',
  city: 'PPL',
  town: 'PPL',
  village: 'PPL',
  hamlet: 'PPL',
  suburb: 'PPL',
  neighbourhood: 'PPL',
};

const DEFAULT_LOCATION_REACH: '1' = '1';
const DEFAULT_EXACTNESS: '1' = '1';
const DEFAULT_SPATIAL_REFERENCE_SYSTEM = 'http://www.opengis.net/def/crs/EPSG/0/4326';

type GeocodeAddress = Record<string, string | undefined>;

// Helper function: Country code to flag emoji mapping
const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode) return '🌍';
  const code = countryCode.toUpperCase();
  return String.fromCodePoint(
    ...[...code].map(c => 127397 + c.charCodeAt(0))
  );
};

const ISO_LEVEL_MAPPINGS: Array<{ key: string; level: typeof ADMIN_LEVELS[number] }> = [
  { key: 'ISO3166-2-lvl6', level: '3' },
  { key: 'ISO3166-2-lvl5', level: '2' },
  { key: 'ISO3166-2-lvl4', level: '1' },
];

const FALLBACK_ADMIN_ORDER: Array<{ level: typeof ADMIN_LEVELS[number]; keys: string[] }> = [
  { level: '1', keys: ['state', 'province', 'region', 'state_district'] },
  { level: '2', keys: ['county', 'district', 'municipality'] },
  { level: '3', keys: ['city', 'town', 'city_district'] },
  { level: '4', keys: ['village', 'hamlet', 'suburb', 'township'] },
];

function formatOsmIdentifier(osmType?: string, osmId?: string | number): string | undefined {
  if (!osmType || osmId === undefined || osmId === null) {
    return undefined;
  }

  const idString = typeof osmId === 'number' ? osmId.toString() : osmId;
  const normalizedType = osmType.toLowerCase();

  if (!idString) {
    return undefined;
  }

  if (['node', 'way', 'relation'].includes(normalizedType) && !idString.includes('/')) {
    return `${normalizedType}/${idString}`;
  }

  return idString;
}

function inferFeatureDesignation(
  type?: string,
  category?: string,
  address?: GeocodeAddress
): string | undefined {
  const normalizedType = type?.toLowerCase();
  if (normalizedType && FEATURE_DESIGNATION_BY_TYPE[normalizedType]) {
    return FEATURE_DESIGNATION_BY_TYPE[normalizedType];
  }

  const normalizedCategory = category?.toLowerCase();
  switch (normalizedCategory) {
    case 'boundary':
      return 'ADM1';
    case 'place':
      return 'PPL';
    case 'building':
    case 'amenity':
      return 'BLDG';
    default:
      break;
  }

  if (address) {
    if (address.city || address.town || address.village || address.hamlet) {
      return 'PPL';
    }
    if (address.state || address.county || address.district) {
      return 'ADM1';
    }
  }

  return undefined;
}

function inferLocationClass(
  type?: string,
  category?: string,
  address?: GeocodeAddress
): '1' | '2' | '3' | '4' | undefined {
  const normalizedType = type?.toLowerCase();
  const normalizedCategory = category?.toLowerCase();

  if (
    normalizedCategory === 'boundary' ||
    normalizedType === 'administrative' ||
    (address && (address.state || address.province || address.region || address.county))
  ) {
    return '1';
  }

  if (
    normalizedCategory === 'place' ||
    (address && (address.city || address.town || address.village || address.hamlet))
  ) {
    return '2';
  }

  if (
    normalizedCategory === 'building' ||
    normalizedCategory === 'amenity' ||
    normalizedType === 'building'
  ) {
    return '3';
  }

  if (normalizedCategory) {
    return '4';
  }

  return undefined;
}

function deriveAdminData(address?: GeocodeAddress):
  | { vocabulary: string; level: typeof ADMIN_LEVELS[number]; code: string }
  | undefined {
  if (!address) {
    return undefined;
  }

  for (const mapping of ISO_LEVEL_MAPPINGS) {
    const code = address[mapping.key];
    if (code) {
      return {
        vocabulary: 'A4',
        level: mapping.level,
        code,
      };
    }
  }

  for (const fallback of FALLBACK_ADMIN_ORDER) {
    for (const key of fallback.keys) {
      const value = address[key];
      if (value) {
        return {
          vocabulary: 'G2',
          level: fallback.level,
          code: value,
        };
      }
    }
  }

  return undefined;
}
const LOCATION_REACH_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Location Reach',
    options: [
      { code: '1', name: 'Activity', description: 'The location specifies where the activity is carried out' },
      { code: '2', name: 'Intended Beneficiaries', description: 'The location specifies where the intended beneficiaries of the activity live' }
    ]
  }
];

const LOCATION_EXACTNESS_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Exactness',
    options: [
      { code: '1', name: 'Exact', description: 'The designated geographic location is exact' },
      { code: '2', name: 'Approximate', description: 'The designated geographic location is approximate' }
    ]
  }
];

const LOCATION_CLASS_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Location Class',
    options: [
      { code: '1', name: 'Administrative Region', description: 'The designated geographic location is an administrative region (state, county, province, district, municipality etc.)' },
      { code: '2', name: 'Populated Place', description: 'The designated geographic location is a populated place (town, village, farm etc.)' },
      { code: '3', name: 'Structure', description: 'The designated geopgraphic location is a structure (such as a school or a clinic)' },
      { code: '4', name: 'Other Topographical Feature', description: 'The designated geographic location is a topographical feature, such as a mountain, a river, a forest' }
    ]
  }
];

const LOCATION_ID_VOCABULARY_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Location ID Vocabularies',
    options: [
      { code: 'A1', name: 'Global Admininistrative Unit Layers', description: '' },
      { code: 'A2', name: 'UN Second Administrative Level Boundary Project', description: 'Note: the unsalb.org website is no longer accessible, and public access to the boundaries resources has been removed' },
      { code: 'A3', name: 'Global Administrative Areas', description: '' },
      { code: 'A4', name: 'ISO Country (3166-1 alpha-2)', description: '' },
      { code: 'G1', name: 'Geonames', description: '' },
      { code: 'G2', name: 'OpenStreetMap', description: 'Note: the code should be formed by prefixing the relevant OpenStreetMap ID with node/ way/ or relation/ as appropriate, e.g. node/1234567' }
    ]
  }
];

const ADMINISTRATIVE_VOCABULARY_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Administrative Vocabularies',
    options: [
      { code: 'A1', name: 'Global Admininistrative Unit Layers', description: '' },
      { code: 'A2', name: 'UN Second Administrative Level Boundary Project', description: 'Note: the unsalb.org website is no longer accessible, and public access to the boundaries resources has been removed http://www.ungiwg.org/content/united-nations-international-and-administrative-boundaries-resources' },
      { code: 'A3', name: 'Global Administrative Areas', description: '' },
      { code: 'A4', name: 'ISO Country (3166-1 alpha-2)', description: '' },
      { code: 'G1', name: 'Geonames', description: '' },
      { code: 'G2', name: 'OpenStreetMap', description: 'Note: the code should be formed by prefixing the relevant OpenStreetMap ID with node/ way/ or relation/ as appropriate, e.g. node/1234567' }
    ]
  }
];

const ADMINISTRATIVE_LEVEL_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Administrative Levels',
    options: [
      { code: '0', name: 'Country', description: 'Country level' },
      { code: '1', name: 'First Order', description: 'First-order administrative division (e.g., state, province)' },
      { code: '2', name: 'Second Order', description: 'Second-order administrative division (e.g., district, county)' },
      { code: '3', name: 'Third Order', description: 'Third-order administrative division (e.g., township, municipality)' },
      { code: '4', name: 'Fourth Order', description: 'Fourth-order administrative division (e.g., village, ward)' },
      { code: '5', name: 'Fifth Order', description: 'Fifth-order administrative division' }
    ]
  }
];

const COUNTRY_GROUPS: SelectIATIGroup[] = [
  {
    label: 'Countries',
    options: [
      { code: 'MM', name: 'Myanmar', description: '' },
      { code: 'TH', name: 'Thailand', description: '' },
      { code: 'VN', name: 'Vietnam', description: '' },
      { code: 'KH', name: 'Cambodia', description: '' },
      { code: 'LA', name: 'Laos', description: '' },
      { code: 'PH', name: 'Philippines', description: '' },
      { code: 'ID', name: 'Indonesia', description: '' },
      { code: 'MY', name: 'Malaysia', description: '' },
      { code: 'SG', name: 'Singapore', description: '' },
      { code: 'BN', name: 'Brunei', description: '' },
      { code: 'US', name: 'United States', description: '' },
      { code: 'CA', name: 'Canada', description: '' },
      { code: 'GB', name: 'United Kingdom', description: '' },
      { code: 'FR', name: 'France', description: '' },
      { code: 'DE', name: 'Germany', description: '' },
      { code: 'IT', name: 'Italy', description: '' },
      { code: 'ES', name: 'Spain', description: '' },
      { code: 'NL', name: 'Netherlands', description: '' },
      { code: 'AU', name: 'Australia', description: '' },
      { code: 'JP', name: 'Japan', description: '' },
      { code: 'KR', name: 'South Korea', description: '' },
      { code: 'CN', name: 'China', description: '' },
      { code: 'IN', name: 'India', description: '' },
      { code: 'BD', name: 'Bangladesh', description: '' },
      { code: 'PK', name: 'Pakistan', description: '' },
      { code: 'LK', name: 'Sri Lanka', description: '' },
      { code: 'NP', name: 'Nepal', description: '' },
      { code: 'BT', name: 'Bhutan', description: '' },
      { code: 'AF', name: 'Afghanistan', description: '' },
      { code: 'IR', name: 'Iran', description: '' },
      { code: 'IQ', name: 'Iraq', description: '' },
      { code: 'SA', name: 'Saudi Arabia', description: '' },
      { code: 'AE', name: 'United Arab Emirates', description: '' },
      { code: 'QA', name: 'Qatar', description: '' },
      { code: 'KW', name: 'Kuwait', description: '' },
      { code: 'BH', name: 'Bahrain', description: '' },
      { code: 'OM', name: 'Oman', description: '' },
      { code: 'YE', name: 'Yemen', description: '' },
      { code: 'JO', name: 'Jordan', description: '' },
      { code: 'LB', name: 'Lebanon', description: '' },
      { code: 'SY', name: 'Syria', description: '' },
      { code: 'TR', name: 'Turkey', description: '' },
      { code: 'IL', name: 'Israel', description: '' },
      { code: 'PS', name: 'Palestine', description: '' },
      { code: 'EG', name: 'Egypt', description: '' },
      { code: 'LY', name: 'Libya', description: '' },
      { code: 'TN', name: 'Tunisia', description: '' },
      { code: 'DZ', name: 'Algeria', description: '' },
      { code: 'MA', name: 'Morocco', description: '' },
      { code: 'SD', name: 'Sudan', description: '' },
      { code: 'SS', name: 'South Sudan', description: '' },
      { code: 'ET', name: 'Ethiopia', description: '' },
      { code: 'ER', name: 'Eritrea', description: '' },
      { code: 'DJ', name: 'Djibouti', description: '' },
      { code: 'SO', name: 'Somalia', description: '' },
      { code: 'KE', name: 'Kenya', description: '' },
      { code: 'UG', name: 'Uganda', description: '' },
      { code: 'TZ', name: 'Tanzania', description: '' },
      { code: 'RW', name: 'Rwanda', description: '' },
      { code: 'BI', name: 'Burundi', description: '' },
      { code: 'CD', name: 'Democratic Republic of the Congo', description: '' },
      { code: 'CG', name: 'Republic of the Congo', description: '' },
      { code: 'CF', name: 'Central African Republic', description: '' },
      { code: 'TD', name: 'Chad', description: '' },
      { code: 'CM', name: 'Cameroon', description: '' },
      { code: 'NG', name: 'Nigeria', description: '' },
      { code: 'NE', name: 'Niger', description: '' },
      { code: 'BF', name: 'Burkina Faso', description: '' },
      { code: 'ML', name: 'Mali', description: '' },
      { code: 'SN', name: 'Senegal', description: '' },
      { code: 'GM', name: 'Gambia', description: '' },
      { code: 'GN', name: 'Guinea', description: '' },
      { code: 'GW', name: 'Guinea-Bissau', description: '' },
      { code: 'SL', name: 'Sierra Leone', description: '' },
      { code: 'LR', name: 'Liberia', description: '' },
      { code: 'CI', name: 'Côte d\'Ivoire', description: '' },
      { code: 'GH', name: 'Ghana', description: '' },
      { code: 'TG', name: 'Togo', description: '' },
      { code: 'BJ', name: 'Benin', description: '' },
      { code: 'ZA', name: 'South Africa', description: '' },
      { code: 'NA', name: 'Namibia', description: '' },
      { code: 'BW', name: 'Botswana', description: '' },
      { code: 'ZW', name: 'Zimbabwe', description: '' },
      { code: 'ZM', name: 'Zambia', description: '' },
      { code: 'MW', name: 'Malawi', description: '' },
      { code: 'MZ', name: 'Mozambique', description: '' },
      { code: 'MG', name: 'Madagascar', description: '' },
      { code: 'MU', name: 'Mauritius', description: '' },
      { code: 'SC', name: 'Seychelles', description: '' },
      { code: 'KM', name: 'Comoros', description: '' },
      { code: 'BR', name: 'Brazil', description: '' },
      { code: 'AR', name: 'Argentina', description: '' },
      { code: 'CL', name: 'Chile', description: '' },
      { code: 'CO', name: 'Colombia', description: '' },
      { code: 'VE', name: 'Venezuela', description: '' },
      { code: 'PE', name: 'Peru', description: '' },
      { code: 'EC', name: 'Ecuador', description: '' },
      { code: 'BO', name: 'Bolivia', description: '' },
      { code: 'PY', name: 'Paraguay', description: '' },
      { code: 'UY', name: 'Uruguay', description: '' },
      { code: 'GY', name: 'Guyana', description: '' },
      { code: 'SR', name: 'Suriname', description: '' },
      { code: 'MX', name: 'Mexico', description: '' },
      { code: 'GT', name: 'Guatemala', description: '' },
      { code: 'BZ', name: 'Belize', description: '' },
      { code: 'SV', name: 'El Salvador', description: '' },
      { code: 'HN', name: 'Honduras', description: '' },
      { code: 'NI', name: 'Nicaragua', description: '' },
      { code: 'CR', name: 'Costa Rica', description: '' },
      { code: 'PA', name: 'Panama', description: '' },
      { code: 'CU', name: 'Cuba', description: '' },
      { code: 'JM', name: 'Jamaica', description: '' },
      { code: 'HT', name: 'Haiti', description: '' },
      { code: 'DO', name: 'Dominican Republic', description: '' },
      { code: 'TT', name: 'Trinidad and Tobago', description: '' },
      { code: 'BB', name: 'Barbados', description: '' },
      { code: 'RU', name: 'Russia', description: '' },
      { code: 'KZ', name: 'Kazakhstan', description: '' },
      { code: 'UZ', name: 'Uzbekistan', description: '' },
      { code: 'TM', name: 'Turkmenistan', description: '' },
      { code: 'TJ', name: 'Tajikistan', description: '' },
      { code: 'KG', name: 'Kyrgyzstan', description: '' },
      { code: 'MN', name: 'Mongolia', description: '' }
    ]
  }
];


// Note: DEFAULT_MAP_CENTER and DEFAULT_MAP_ZOOM are imported from country-coordinates
// They will be overridden by the home country from system settings

// Map layer configuration - names only, actual styles are in LocationMap
type MapLayerKey = 'osm_standard' | 'osm_humanitarian' | 'cyclosm' | 'opentopo' | 'satellite_esri';

interface MapLayerConfig {
  name: string;
  category: string;
}

const MAP_LAYERS: Record<MapLayerKey, MapLayerConfig> = {
  osm_standard: {
    name: 'Streets (Voyager)',
    category: 'Streets'
  },
  osm_humanitarian: {
    name: 'Humanitarian (HOT)',
    category: 'Humanitarian'
  },
  cyclosm: {
    name: 'Streets (Light)',
    category: 'Streets'
  },
  opentopo: {
    name: 'Streets (Positron)',
    category: 'Streets'
  },
  satellite_esri: {
    name: 'ESRI Satellite',
    category: 'Satellite'
  }
};

// Layer persistence key
const LAYER_PREFERENCE_KEY = 'aims-map-layer-preference';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: LocationSchema) => Promise<void>;
  onDelete?: (locationId: string) => Promise<void>;
  activityId: string;
  location?: LocationSchema;
  existingLocations?: LocationSchema[];
}

export default function LocationModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  activityId,
  location,
  existingLocations = [],
}: LocationModalProps) {
  // Form state
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Partial<LocationFormSchema>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentLayer, setCurrentLayer] = useState<MapLayerKey>('osm_standard');

  // Home country coordinates from system settings
  const [homeCountryCenter, setHomeCountryCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [homeCountryZoom, setHomeCountryZoom] = useState<number>(DEFAULT_MAP_ZOOM);

  const mapRef = useRef<any>(null);

  // Fetch home country from system settings
  useEffect(() => {
    const fetchHomeCountry = async () => {
      try {
        const response = await apiFetch('/api/admin/system-settings')
        if (response.ok) {
          const data = await response.json()
          if (data.homeCountry) {
            const countryCoords = getCountryCoordinates(data.homeCountry)
            setHomeCountryCenter(countryCoords.center)
            setHomeCountryZoom(countryCoords.zoom)
            // Also update map center if no location is being edited
            if (!location) {
              setMapCenter(countryCoords.center)
              setMapZoom(countryCoords.zoom)
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch home country setting:', error)
        // Keep defaults on error
      }
    }
    fetchHomeCountry()
  }, [location]);

  // Load saved layer preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLayer = localStorage.getItem(LAYER_PREFERENCE_KEY) as MapLayerKey;
      if (savedLayer && Object.keys(MAP_LAYERS).includes(savedLayer)) {
        setCurrentLayer(savedLayer);
      }
    }
  }, []);

  // Save layer preference
  const saveLayerPreference = useCallback((layer: MapLayerKey) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAYER_PREFERENCE_KEY, layer);
      setCurrentLayer(layer);
    }
  }, []);

  // Handle layer change
  const handleLayerChange = useCallback((layer: MapLayerKey) => {
    saveLayerPreference(layer);
  }, [saveLayerPreference]);

  // Form setup
  const form = useForm<LocationFormSchema>({
    resolver: zodResolver(locationFormSchema),
    mode: 'onSubmit', // Only validate on submit, not on change
    reValidateMode: 'onSubmit',
    defaultValues: getDefaultLocationValues('site'),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting, isValid } } = form;
  
  // Debug form state
  if (Object.keys(errors).length > 0) {
    console.log('[LocationModal] ❌ FORM HAS ERRORS:', errors);
    // Extract just the error messages without circular references
    const errorMessages = Object.keys(errors).reduce((acc, key) => {
      acc[key] = (errors as any)[key]?.message || 'Unknown error';
      return acc;
    }, {} as Record<string, string>);
    console.log('[LocationModal] Error messages:', errorMessages);
  }

  // Watch form values
  const watchedLocationType = watch('location_type');
  const watchedLatitude = watch('latitude');
  const watchedLongitude = watch('longitude');

  // Initialize form with existing location data
  useEffect(() => {
    if (location) {
      console.log('Loading location data:', location);
      console.log('Country code from location:', location.country_code);
      console.log('Location ref from location:', (location as any).location_ref);
      
      // Convert numeric IATI codes to strings for the form (database stores as integers)
      // Also convert all null values to undefined for Zod validation
      const formData = {
        ...location,
        latitude: (location as any).latitude || undefined,
        longitude: (location as any).longitude || undefined,
        country_display: location.country_code
          ? COUNTRY_GROUPS[0]?.options.find(option => option.code === location.country_code)?.name
          : undefined,
        // Convert numeric codes to string enums
        location_reach: location.location_reach ? String(location.location_reach) as '1' | '2' : undefined,
        exactness: location.exactness ? String(location.exactness) as '1' | '2' | '3' : undefined,
        location_class: location.location_class ? String(location.location_class) as '1' | '2' | '3' | '4' | '5' : undefined,
        admin_level: location.admin_level ? String(location.admin_level) as '0' | '1' | '2' | '3' | '4' | '5' : undefined,
        // Convert all null values to undefined
        address_line1: (location as any).address_line1 || undefined,
        address_line2: (location as any).address_line2 || undefined,
        state_region_code: (location as any).state_region_code || undefined,
        township_code: (location as any).township_code || undefined,
        district_name: (location as any).district_name || undefined,
        district_code: (location as any).district_code || undefined,
        village_name: (location as any).village_name || undefined,
        postal_code: (location as any).postal_code || undefined,
        city: (location as any).city || undefined,
        address: (location as any).address || undefined,
        description: location.description || undefined,
        location_description: location.location_description || undefined,
        activity_location_description: location.activity_location_description || undefined,
        feature_designation: location.feature_designation || undefined,
        location_id_code: location.location_id_code || undefined,
        admin_code: location.admin_code || undefined,
        spatial_reference_system: location.spatial_reference_system || undefined,
        admin_unit: (location as any).admin_unit || undefined,
        state_region_name: (location as any).state_region_name || undefined,
        township_name: (location as any).township_name || undefined,
      };
      
      reset(formData as LocationFormSchema);

      // Debug: Check form value after reset
      setTimeout(() => {
        console.log('Form country_code value after reset:', watch('country_code'));
        console.log('Form location_ref value after reset:', watch('location_ref'));
        console.log('All form values after reset:', watch());
      }, 100);

      if ((location as any).latitude && (location as any).longitude) {
        setMarkerPosition([(location as any).latitude, (location as any).longitude]);
        setMapCenter([(location as any).latitude, (location as any).longitude]);
        setMapZoom(15);
      }

      setSelectedLocation(location);
    } else {
      // Reset to defaults for new location
      const defaults = getDefaultLocationValues('site');
      reset({
        ...defaults,
        country_display: undefined,
      } as LocationFormSchema);
      setSelectedLocation({});
      setMarkerPosition(null);
      setMapCenter(homeCountryCenter);
      setMapZoom(homeCountryZoom);
    }
  }, [location, reset, homeCountryCenter, homeCountryZoom]);

  // Reset form when modal opens for new location
  useEffect(() => {
    if (isOpen && !location) {
      // Force reset to defaults when modal opens for new location
      const defaults = getDefaultLocationValues('site');
      reset({
        ...defaults,
      } as LocationFormSchema);
      setSelectedLocation({});
      setMarkerPosition(null);
      setMapCenter(homeCountryCenter);
      setMapZoom(homeCountryZoom);
      setValidationErrors({});
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, location, reset, homeCountryCenter, homeCountryZoom]);

  // Search functionality with cascading approach: Myanmar → Regional → Global
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const options: any = { limit: 30 };
        
        console.log('[Location Search] Starting cascading search for:', searchQuery.trim());
        
        const results = await smartLocationSearch(searchQuery.trim(), options);
        
        console.log('[Location Search] Results:', {
          count: results.length,
          results: results.slice(0, 3) // Log first 3 results for debugging
        });
        
        setSearchResults(results);
      } catch (error) {
        console.error('[Location Search] Error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle search result selection
const autoPopulateIatiFields = useCallback((params: {
    type?: string;
    category?: string;
    osmType?: string;
    osmId?: string;
    address?: Record<string, string | undefined>;
    displayName?: string;
    name?: string;
  }) => {
    const { type, category, osmType, osmId, address } = params;

    // Location reach & exactness defaults
    if (!watch('location_reach')) {
        setValue('location_reach', DEFAULT_LOCATION_REACH as any);
    }
    if (!watch('exactness')) {
      setValue('exactness', DEFAULT_EXACTNESS as any);
    }

    // Spatial reference system default
    if (!watch('spatial_reference_system')) {
      setValue('spatial_reference_system', DEFAULT_SPATIAL_REFERENCE_SYSTEM);
    }

    // Feature designation
    const inferredFeatureDesignation = inferFeatureDesignation(type, category, address);
    if (inferredFeatureDesignation) {
      setValue('feature_designation', inferredFeatureDesignation);
    }

    // Location class
    const inferredLocationClass = inferLocationClass(type, category, address);
    if (inferredLocationClass) {
      setValue('location_class', inferredLocationClass as any);
    }

    // Location ID vocabulary & code (OSM)
    const formattedOsmId = formatOsmIdentifier(osmType, osmId);
    if (formattedOsmId) {
        setValue('location_id_vocabulary', 'G2' as any);
      setValue('location_id_code', formattedOsmId);
    }

    // Administrative data
    const adminData = deriveAdminData(address);
    if (adminData) {
        setValue('admin_vocabulary', adminData.vocabulary as any);
      setValue('admin_level', adminData.level as any);
      setValue('admin_code', adminData.code);
    }
  }, [setValue, watch]);

  const handleSelectSearchResult = useCallback((result: LocationSearchResult) => {
    const lat = result.lat;
    const lng = result.lon;

    setValue('latitude', lat);
    setValue('longitude', lng);
    setMarkerPosition([lat, lng]);
    setMapCenter([lat, lng]);
    setMapZoom(15);
    
    // Actually move the map to the new location
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 15);
    }
    setSearchQuery('');
    setSearchResults([]);

    // Populate address fields
    // Only set address if it's not just coordinates
    const displayName = result.display_name || '';
    const isCoordinateString = /Lat:\s*\d+\.\d+,\s*Lng:\s*\d+\.\d+/.test(displayName);
    setValue('address', isCoordinateString ? '' : displayName);
    setValue('location_name', result.name || result.display_name);

    if (result.address) {
      setValue('city', result.address.city || result.address.town || '');
      setValue('state_region_name', result.address.state || result.address.province || '');
      setValue('township_name', result.address.county || '');
      setValue('district_name', result.address.district || '');
      setValue('village_name', result.address.village || result.address.suburb || result.address.hamlet || '');
      setValue('postal_code', result.address.postcode || '');
      // Set country code if available, otherwise try to match by country name
      if (result.address.country_code) {
        setValue('country_code', result.address.country_code);
      } else if (result.address.country) {
        // Try to find matching country code by name
        const countryOption = COUNTRY_GROUPS[0].options.find(option => 
          option.name.toLowerCase().includes(result.address.country?.toLowerCase() || '')
        );
        if (countryOption) {
          setValue('country_code', countryOption.code);
        }
      }
    }

    autoPopulateIatiFields({
      type: result.type,
      category: (result as any).category,
      osmType: result.osm_type,
      osmId: result.osm_id,
      address: result.address as Record<string, string | undefined>,
      displayName: result.display_name,
      name: result.name,
    });

    toast.success(`Selected: ${result.display_name}`);
  }, [autoPopulateIatiFields, setValue]);

  // Handle map click
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    console.log('[MAP CLICK] handleMapClick called with lat:', lat, 'lng:', lng);
    if (!isValidCoordinate(lat, lng)) {
      console.log('[MAP CLICK] Invalid coordinates, returning');
      return;
    }

    console.log('[MAP CLICK] Setting coordinates and marker position...');
    setValue('latitude', lat);
    setValue('longitude', lng);
    setMarkerPosition([lat, lng]);

    // Perform reverse geocoding to populate address fields
    try {
      console.log('[MAP CLICK] Starting reverse geocoding...');
      const result = await reverseGeocode(lat, lng);
      
      console.log('[MAP CLICK] Reverse geocoding result:', result);
      console.log('Address fields:', result.address);
      
      if (result && result.address) {
        // Populate all address fields from reverse geocoding
        const cityValue = result.address.city || result.address.town || result.address.city_district || '';
        const stateValue = result.address.state || result.address.province || result.address.region || '';
        const townshipValue = result.address.county || result.address.municipality || result.address.township || '';
        const districtValue = result.address.district || result.address.city_district || result.address.county || '';
        const villageValue = result.address.village || result.address.suburb || result.address.hamlet || result.address.neighbourhood || '';
        
        console.log('Setting values:', {
          address: result.display_name || '',
          city: cityValue,
          state: stateValue,
          township: townshipValue,
          district: districtValue,
          village: villageValue,
          postal: result.address.postcode || '',
          country_code: result.address.country_code,
          country: result.address.country
        });
        
        // Only set address if it's not just coordinates
        const displayName = result.display_name || '';
        const isCoordinateString = /Lat:\s*\d+\.\d+,\s*Lng:\s*\d+\.\d+/.test(displayName);
        setValue('address', isCoordinateString ? '' : displayName);
        setValue('city', cityValue || '');
        setValue('state_region_name', stateValue);
        setValue('township_name', townshipValue);
        setValue('district_name', districtValue);
        setValue('village_name', villageValue);
        setValue('postal_code', result.address.postcode || '');

        if (result.address.country_code) {
          const countryCodeUpper = result.address.country_code.toUpperCase();
          const countryExists = COUNTRY_GROUPS[0]?.options.find(
            country => country.code === countryCodeUpper
          );
          if (countryExists) {
            setValue('country_code', countryCodeUpper, { shouldValidate: true, shouldDirty: true });
          }
        } else if (result.address.country) {
          const matchingCountry = COUNTRY_GROUPS[0]?.options.find(
            country => country.name.toLowerCase() === result.address?.country?.toLowerCase()
          );
          if (matchingCountry) {
            setValue('country_code', matchingCountry.code, { shouldValidate: true, shouldDirty: true });
          }
        }

        autoPopulateIatiFields({
          type: result.type,
          category: (result as any).category,
          osmType: result.osm_type,
          osmId: String(result.osm_id),
          address: result.address as GeocodeAddress,
          displayName: result.display_name,
          name: result.name,
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [setValue, autoPopulateIatiFields, watch]);

  // Handle marker drag
  const handleMarkerDragEnd = useCallback(async (lat: number, lng: number) => {
    setValue('latitude', lat);
    setValue('longitude', lng);
    setMarkerPosition([lat, lng]);

    // Perform reverse geocoding to populate address fields
    try {
      const result = await reverseGeocode(lat, lng);
      
      console.log('Reverse geocoding result (marker drag):', result);
      console.log('Address fields (marker drag):', result.address);
      
      if (result && result.address) {
        // Populate all address fields from reverse geocoding
        // Only set address if it's not just coordinates
        const displayName = result.display_name || '';
        const isCoordinateString = /Lat:\s*\d+\.\d+,\s*Lng:\s*\d+\.\d+/.test(displayName);
        setValue('address', isCoordinateString ? '' : displayName);
        setValue('city', result.address.city || result.address.town || result.address.city_district || '');
        setValue('state_region_name', result.address.state || result.address.province || result.address.region || '');
        setValue('township_name', result.address.county || result.address.municipality || result.address.township || '');
        setValue('district_name', result.address.district || result.address.city_district || result.address.county || '');
        setValue('village_name', result.address.village || result.address.suburb || result.address.hamlet || result.address.neighbourhood || '');
        setValue('postal_code', result.address.postcode || '');
        
        if (result.address.country_code) {
          const countryCodeUpper = result.address.country_code.toUpperCase();
          const countryExists = COUNTRY_GROUPS[0]?.options.find(
            country => country.code === countryCodeUpper
          );
          if (countryExists) {
            setValue('country_code', countryCodeUpper, { shouldValidate: true, shouldDirty: true });
          }
        } else if (result.address.country) {
          const matchingCountry = COUNTRY_GROUPS[0]?.options.find(
            country => country.name.toLowerCase() === result.address?.country?.toLowerCase()
          );
          if (matchingCountry) {
            setValue('country_code', matchingCountry.code, { shouldValidate: true, shouldDirty: true });
          }
        }

        autoPopulateIatiFields({
          type: result.type,
          category: (result as any).category,
          osmType: result.osm_type,
          osmId: String(result.osm_id),
          address: result.address as GeocodeAddress,
          displayName: result.display_name,
          name: result.name,
        });

        toast.success('Location details updated from marker position');
      }
      } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }, [setValue, autoPopulateIatiFields]);


  // Form submission
  const onSubmit = async (data: LocationFormSchema) => {
    console.log('[LocationModal] 🔥 onSubmit called!');
    console.log('[LocationModal] Form data:', data);
    console.log('[LocationModal] Form errors:', errors);
    
    try {
      setIsSaving(true);
      setValidationErrors({});

      // Additional validation
      const validationErrors: Record<string, string> = {};

      // Validate coordinates if either latitude or longitude is provided
      if (data.latitude !== undefined || data.longitude !== undefined) {
        if (data.latitude === undefined || data.longitude === undefined) {
          validationErrors.coordinates = 'Both latitude and longitude are required when providing coordinates';
        } else if (!validateCoordinates(data.latitude, data.longitude)) {
          validationErrors.coordinates = 'Invalid coordinates. Latitude must be -90 to 90, longitude must be -180 to 180';
        }
      }


      if (Object.keys(validationErrors).length > 0) {
        console.log('[LocationModal] ❌ Validation errors:', validationErrors);
        setValidationErrors(validationErrors);
        return;
      }

      // Prepare data for submission
      const allFormValues = watch();
      const locationData: any = {
        ...data,
        ...allFormValues, // Include all form values, including country_code
        id: location?.id,
        activity_id: activityId,
        source: 'manual',
        validation_status: 'valid',
      };

      console.log('[LocationModal] ✅ Submitting location data:', locationData);

      console.log('[LocationModal] 🚀 Calling onSave function...');
      await onSave(locationData);
      console.log('[LocationModal] ✅ onSave completed successfully');

      toast.success(location?.id ? 'Location updated successfully' : 'Location added successfully');
      onClose();
    } catch (error) {
      console.error('[LocationModal] ❌ Error saving location:', error);
      toast.error('Failed to save location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!location?.id || !onDelete) return;

    try {
      await onDelete(location.id);
      toast.success('Location deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location?.id ? 'Edit Location' : 'Add Location'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Location Map
                </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Map Layer Dropdown */}
                    <Select value={currentLayer} onValueChange={handleLayerChange}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select map type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                          <SelectItem key={key} value={key}>
                            {layer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMapCenter(homeCountryCenter);
                        setMapZoom(homeCountryZoom);
                        setMarkerPosition(null);
                        // Actually move the map to the new center
                        if (mapRef.current) {
                          mapRef.current.setView(homeCountryCenter, homeCountryZoom);
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-[480px] bg-gray-100 rounded-lg overflow-hidden">
                  <LocationMap
                    mapCenter={mapCenter}
                    mapZoom={mapZoom}
                    mapRef={mapRef}
                    currentLayer={currentLayer}
                    existingLocations={existingLocations}
                    currentLocationId={location?.id}
                    markerPosition={markerPosition}
                    onMarkerDragEnd={handleMarkerDragEnd}
                    onMapClick={handleMapClick}
                    locationName={watch('location_name')}
                    displayLatitude={watchedLatitude}
                    displayLongitude={watchedLongitude}
                  />

                  <div className="absolute bottom-4 left-4 bg-white/90 p-3 rounded shadow text-xs text-gray-600">
                    Click on the map to set coordinates
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Search Locations</Label>
                  
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search for a location"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-auto z-50">
                        {/* Result count header */}
                        <div className="sticky top-0 bg-surface-muted px-4 py-2 border-b text-xs text-gray-600 font-medium">
                          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        </div>
                        
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectSearchResult(result)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-900 truncate">
                              {result.name || result.display_name}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {result.display_name}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isSearching && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  )}
                  
                  {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">No results found</div>
                          <div className="text-xs mt-1">
                            Try searching with different terms (e.g., city name, street name, address)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Section */}
          <div className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">

                  {/* Location Name */}
                  <div className="space-y-2">
                    <Label htmlFor="location_name" className="flex items-center gap-2">
                      Location Name
                      <HelpTextTooltip content="A human-readable name for the place. This provides a clear label for identifying the location within the activity record." />
                    </Label>
                    <Input
                      id="location_name"
                      {...register('location_name')}
                      placeholder="Enter location name"
                    />
                    {errors.location_name && (
                      <p className="text-sm text-red-600">{errors.location_name.message}</p>
                    )}
                  </div>

                  {/* Location Description */}
                        <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                      Location Description
                      <HelpTextTooltip content="A short narrative describing the place and its significance. This explains why the location is relevant to the activity." />
                    </Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Additional location details"
                      rows={3}
                    />
                        </div>

                  {/* Activity Description */}
                        <div className="space-y-2">
                    <Label htmlFor="activity_location_description" className="flex items-center gap-2">
                      Activity Description
                      <HelpTextTooltip content="Describes the nature of the activity that occurs at this location. This should distinguish between activities when multiple locations are reported." />
                    </Label>
                    <Textarea
                      id="activity_location_description"
                      {...register('activity_location_description')}
                      placeholder="Description of the activity at this location"
                      rows={3}
                    />
                      </div>

                  {/* Latitude and Longitude - Always visible */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude" className="flex items-center gap-2">
                        Latitude
                        <HelpTextTooltip content="The latitude coordinate in decimal degrees (-90 to 90). Click on the map or search for a location to auto-populate." />
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          value={watchedLatitude !== undefined ? watchedLatitude : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              setValue('latitude', undefined);
                            } else {
                              const lat = parseFloat(value);
                              if (!isNaN(lat) && lat >= -90 && lat <= 90) {
                                setValue('latitude', lat);
                                if (validationErrors.coordinates) {
                                  setValidationErrors(prev => {
                                    const { coordinates, ...rest } = prev;
                                    return rest;
                                  });
                                }
                              }
                            }
                          }}
                          placeholder="e.g., 16.798196"
                          className="flex-1"
                        />
                      </div>
                      {errors.latitude && (
                        <p className="text-sm text-red-600">{errors.latitude.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude" className="flex items-center gap-2">
                        Longitude
                        <HelpTextTooltip content="The longitude coordinate in decimal degrees (-180 to 180). Click on the map or search for a location to auto-populate." />
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          value={watchedLongitude !== undefined ? watchedLongitude : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              setValue('longitude', undefined);
                            } else {
                              const lng = parseFloat(value);
                              if (!isNaN(lng) && lng >= -180 && lng <= 180) {
                                setValue('longitude', lng);
                                if (validationErrors.coordinates) {
                                  setValidationErrors(prev => {
                                    const { coordinates, ...rest } = prev;
                                    return rest;
                                  });
                                }
                              }
                            }
                          }}
                          placeholder="e.g., 96.149497"
                          className="flex-1"
                        />
                        {watchedLatitude !== undefined && watchedLongitude !== undefined && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const coords = `${watchedLatitude.toFixed(6)}, ${watchedLongitude.toFixed(6)}`;
                              navigator.clipboard.writeText(coords);
                              toast.success('Coordinates copied to clipboard');
                            }}
                            className="px-2"
                            title="Copy coordinates"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {errors.longitude && (
                        <p className="text-sm text-red-600">{errors.longitude.message}</p>
                      )}
                    </div>
                  </div>
                  {validationErrors.coordinates && (
                    <p className="text-sm text-red-600">{validationErrors.coordinates}</p>
                  )}

                  {/* Coverage Scope (Coverage only) */}
                  {watchedLocationType === 'coverage' && (
                    <div className="space-y-2">
                      <Label htmlFor="coverage_scope">Coverage Scope</Label>
                  <SelectIATI
                    groups={COVERAGE_SCOPE_GROUPS}
                    value={watch('coverage_scope')}
                    onValueChange={(value) => setValue('coverage_scope', value as any)}
                    placeholder="Select coverage scope"
                    dropdownId="coverage-scope-select"
                  />
                    </div>
                  )}


                  {/* Address Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      Address
                      <HelpTextTooltip content="The street or site address of the location. Use when available to provide additional geographic context." />
                    </Label>
                    <Textarea
                      id="address"
                      {...register('address')}
                      placeholder="Full address or description"
                      rows={2}
                    />
                  </div>

                  {/* Ward/Village Tract and Town/City */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="village_name" className="flex items-center gap-2">
                        Ward/Village Tract
                        <HelpTextTooltip content="The lowest administrative unit relevant to the location. This adds detail to sub-national geographic reporting." />
                      </Label>
                      <Input
                        id="village_name"
                        {...register('village_name')}
                        placeholder="e.g., Ward 1, Village Tract"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="flex items-center gap-2">
                        Town/City
                        <HelpTextTooltip content="The town or city where the activity is located. This field helps in identifying urban-level geography." />
                      </Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="e.g., Yangon"
                      />
                    </div>
                  </div>

                  {/* Township and District */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="township_name" className="flex items-center gap-2">
                        Township
                        <HelpTextTooltip content="The township or equivalent mid-level administrative division. This allows further disaggregation of location reporting." />
                      </Label>
                      <Input
                        id="township_name"
                        {...register('township_name')}
                        placeholder="e.g., Hlaing Township"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district_name" className="flex items-center gap-2">
                        District
                        <HelpTextTooltip content="The district or county in which the location is situated. This provides clarity at a higher administrative level." />
                      </Label>
                      <Input
                        id="district_name"
                        {...register('district_name')}
                        placeholder="e.g., Yangon District"
                      />
                    </div>
                  </div>

                  {/* State/Region/Union Territory and Postal Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state_region_name" className="flex items-center gap-2">
                        State/Region/Union Territory
                        <HelpTextTooltip content="The larger administrative area such as a state, province, or region. This ensures consistency with national administrative classifications." />
                      </Label>
                      <Input
                        id="state_region_name"
                        {...register('state_region_name')}
                        placeholder="e.g., Yangon Region"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code" className="flex items-center gap-2">
                        Postal Code
                        <HelpTextTooltip content="The postal or ZIP code for the location. This adds precision for locating the site." />
                      </Label>
                      <Input
                        id="postal_code"
                        {...register('postal_code')}
                        placeholder="e.g., 11001"
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country_code" className="flex items-center gap-2">
                      Country
                      <HelpTextTooltip content="The country in which the location is situated. Must follow the ISO 3166-1 standard." />
                    </Label>
                    <Controller
                      name="country_code"
                      control={form.control}
                      render={({ field }) => (
                        <SelectIATI
                          groups={COUNTRY_GROUPS}
                          value={field.value ?? undefined}
                          onValueChange={(value) => {
                            field.onChange(value || undefined);
                          }}
                          placeholder="Select country"
                          dropdownId="country-select"
                          hideGroupLabels={true}
                        />
                      )}
                    />
                  </div>




                  {/* Validation Errors */}
                  {Object.keys(validationErrors).length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {Object.entries(validationErrors).map(([field, message]) => (
                            <div key={field}>{message}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                {/* Feature Designation */}
                <div className="space-y-2">
                  <Label htmlFor="feature_designation" className="flex items-center gap-2">
                    Feature Designation
                    <HelpTextTooltip content="A detailed coded classification of the site type based on an authorised vocabulary. This refines the description of the location beyond class or reach." />
                  </Label>
                  <SelectIATI
                    groups={IATI_LOCATION_TYPE_GROUPS}
                    value={watch('feature_designation')}
                    onValueChange={(value) => setValue('feature_designation', value)}
                    placeholder="Select feature designation"
                    dropdownId="feature-designation-select"
                  />
                </div>

                {/* Location Reference */}
                <div className="space-y-2">
                  <Label htmlFor="location_ref" className="flex items-center gap-2">
                    Location Reference
                    <HelpTextTooltip content="A unique identifier for this location (e.g., AF-KAN, KH-PNH). This is typically assigned by the reporting organization and matches the IATI location ref attribute." />
                  </Label>
                  <Input
                    id="location_ref"
                    {...register('location_ref')}
                    placeholder="e.g., AF-KAN, KH-PNH"
                  />
                </div>

                {/* IATI Advanced Fields */}
                <div className="space-y-4">
                  {/* Location Reach */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Location Reach
                      <HelpTextTooltip content="Clarifies whether the location is where the activity is implemented (Activity) or where intended beneficiaries live (Beneficiaries)." />
                    </Label>
                  <SelectIATI
                    groups={LOCATION_REACH_GROUPS}
                    value={watch('location_reach')}
                    onValueChange={(value) => setValue('location_reach', value as any)}
                    dropdownId="location-reach-select"
                  />
                  </div>

                  {/* Exactness */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Exactness
                      <HelpTextTooltip content="Indicates how precisely the location is known (e.g., exact site, approximate area, unknown)." />
                    </Label>
                  <SelectIATI
                    groups={LOCATION_EXACTNESS_GROUPS}
                    value={watch('exactness')}
                    onValueChange={(value) => setValue('exactness', value as any)}
                    dropdownId="location-exactness-select"
                  />
                  </div>

                  {/* Location Class */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Location Class
                      <HelpTextTooltip content="Specifies whether this is a site, a populated place, an administrative division, or another geographic feature." />
                    </Label>
                  <SelectIATI
                    groups={LOCATION_CLASS_GROUPS}
                    value={watch('location_class')}
                    onValueChange={(value) => setValue('location_class', value as any)}
                    dropdownId="location-class-select"
                  />
                  </div>

                  {/* Location ID Information */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Location ID Vocabulary
                        <HelpTextTooltip content="The reference system used to identify the location (e.g., G1 = GeoNames, G2 = OpenStreetMap)." />
                      </Label>
                      <SelectIATI
                        groups={LOCATION_ID_VOCABULARY_GROUPS}
                        value={watch('location_id_vocabulary')}
                        onValueChange={(value) => setValue('location_id_vocabulary', value as any)}
                        dropdownId="location-id-vocabulary-select"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location_id_code" className="flex items-center gap-2">
                        Location ID Code
                        {watch('location_id_vocabulary') && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />}
                        <HelpTextTooltip content="The actual identifier from the chosen vocabulary (e.g., GeoNames ID or OSM ID)." />
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="location_id_code"
                          type="text"
                          {...register('location_id_code')}
                          placeholder="e.g., 1821306"
                          className="flex-1"
                        />
                        {watch('location_id_code') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const codeValue = watch('location_id_code');
                              navigator.clipboard.writeText(String(codeValue || ''));
                              toast.success('Code copied to clipboard');
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Administrative Divisions */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Administrative Vocabulary
                        <HelpTextTooltip content="The system used to classify administrative divisions (e.g., GeoNames, OSM)." />
                      </Label>
                      <SelectIATI
                        groups={ADMINISTRATIVE_VOCABULARY_GROUPS}
                        value={watch('admin_vocabulary')}
                        onValueChange={(value) => setValue('admin_vocabulary', value as any)}
                        dropdownId="admin-vocabulary-select"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Administrative Level
                        <HelpTextTooltip content="The level of administrative hierarchy (e.g., 1 = state/province, 2 = district, 3 = township)." />
                      </Label>
                      <SelectIATI
                        groups={ADMINISTRATIVE_LEVEL_GROUPS}
                        value={watch('admin_level')}
                        onValueChange={(value) => setValue('admin_level', value as any)}
                        dropdownId="admin-level-select"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin_code" className="flex items-center gap-2">
                        Administrative Code
                        {watch('admin_level') && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />}
                        <HelpTextTooltip content="The code from the chosen vocabulary identifying the specific administrative unit." />
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="admin_code"
                          {...register('admin_code')}
                          placeholder="e.g., MMR013"
                          className="flex-1"
                        />
                        {watch('admin_code') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(watch('admin_code') || '');
                              toast.success('Code copied to clipboard');
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Spatial Reference System */}
                  <div className="space-y-2">
                    <Label htmlFor="spatial_reference_system" className="flex items-center gap-2">
                      Spatial Reference System
                      <HelpTextTooltip content="Defines the coordinate reference system used for latitude/longitude. Default is EPSG:4326 (WGS84)." />
                    </Label>
                    <Input
                      id="spatial_reference_system"
                      {...register('spatial_reference_system')}
                      defaultValue="http://www.opengis.net/def/crs/EPSG/0/4326"
                      placeholder="http://www.opengis.net/def/crs/EPSG/0/4326"
                      className="w-full"
                    />
                  </div>

                </div>
              </TabsContent>
            </Tabs>

          </div>
        </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0 sm:justify-between">
          <div className="flex gap-2">
            {location?.id && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              onClick={() => {
                console.log('[LocationModal] Submit button clicked!');
                console.log('[LocationModal] Current form errors:', errors);
                console.log('[LocationModal] Form values:', watch());
                console.log('[LocationModal] Is form valid:', isValid);
              }}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {location?.id ? 'Update' : 'Save'} Location
            </Button>
          </div>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
