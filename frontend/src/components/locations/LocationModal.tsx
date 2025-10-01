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
  Layers,
  Satellite,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
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
  type LocationSearchResult,
  type GeocodingResult,
} from '@/lib/geo/nominatim';

import { SelectIATI, type SelectIATIGroup } from '@/components/ui/SelectIATI';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { IATI_LOCATION_TYPE_GROUPS } from '@/data/iati-location-types';
import { countries } from '@/data/countries';

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

const ISO_LEVEL_MAPPINGS: Array<{ key: string; level: typeof ADMIN_LEVELS[number] }> = [
  { key: 'ISO3166-2-lvl6', level: 'admin3' },
  { key: 'ISO3166-2-lvl5', level: 'admin2' },
  { key: 'ISO3166-2-lvl4', level: 'admin1' },
];

const FALLBACK_ADMIN_ORDER: Array<{ level: typeof ADMIN_LEVELS[number]; keys: string[] }> = [
  { level: 'admin1', keys: ['state', 'province', 'region', 'state_district'] },
  { level: 'admin2', keys: ['county', 'district', 'municipality'] },
  { level: 'admin3', keys: ['city', 'town', 'city_district'] },
  { level: 'admin4', keys: ['village', 'hamlet', 'suburb', 'township'] },
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
      { code: 'admin1', name: 'Administrative Level 1', description: 'First-level administrative division (e.g., state, province)' },
      { code: 'admin2', name: 'Administrative Level 2', description: 'Second-level administrative division (e.g., district, county)' },
      { code: 'admin3', name: 'Administrative Level 3', description: 'Third-level administrative division (e.g., township, municipality)' },
      { code: 'admin4', name: 'Administrative Level 4', description: 'Fourth-level administrative division (e.g., ward, neighborhood)' }
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


// Default center (Myanmar)
const DEFAULT_CENTER: [number, number] = [21.9162, 96.0785];
const DEFAULT_ZOOM = 6;

// Map layer configuration
const MAP_LAYERS = {
  roads: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satellite Image',
    // Primary: ESRI World Imagery
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    // Fallbacks
    fallbacks: [
      // Mapbox (if token available)
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        ? `https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
        : null,
      // Google (if token available)
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        ? 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
        : null,
      // Back to OSM if all else fails
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    ].filter(Boolean)
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
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Partial<LocationFormSchema>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentLayer, setCurrentLayer] = useState<'roads' | 'satellite'>('roads');
  const [mapError, setMapError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [satelliteFallbackIndex, setSatelliteFallbackIndex] = useState(0);

  const mapRef = useRef<any>(null);

  // Load saved layer preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLayer = localStorage.getItem(LAYER_PREFERENCE_KEY) as 'roads' | 'satellite';
      if (savedLayer && ['roads', 'satellite'].includes(savedLayer)) {
        setCurrentLayer(savedLayer);
      }
    }
  }, []);

  // Save layer preference
  const saveLayerPreference = useCallback((layer: 'roads' | 'satellite') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAYER_PREFERENCE_KEY, layer);
      setCurrentLayer(layer);
    }
  }, []);

  // Get current layer URL with fallbacks
  const getLayerUrl = useCallback(() => {
    const layer = MAP_LAYERS[currentLayer];

    if (currentLayer === 'satellite') {
      const fallbacks = layer.fallbacks ?? [];
      const urls = [layer.url, ...fallbacks];
      const index = Math.min(satelliteFallbackIndex, urls.length - 1);
      return urls[index] ?? layer.url;
    }

    return layer.url;
  }, [currentLayer, satelliteFallbackIndex]);

  // Handle layer change
  const handleLayerChange = useCallback((layer: 'roads' | 'satellite') => {
    setMapError(null);
    if (layer !== 'satellite') {
      setSatelliteFallbackIndex(0);
    }
    saveLayerPreference(layer);
  }, [saveLayerPreference]);

  // Handle map tile error
  const handleMapError = useCallback(() => {
    if (currentLayer === 'satellite') {
      const fallbacks = MAP_LAYERS.satellite.fallbacks ?? [];
      const urls = [MAP_LAYERS.satellite.url, ...fallbacks];

      setSatelliteFallbackIndex((prev) => {
        const hasNext = prev < urls.length - 1;
        if (hasNext) {
          toast.warning('Satellite imagery unavailable from the current provider. Falling back to the next source.');
          return prev + 1;
        }
        return prev;
      });

      if (satelliteFallbackIndex >= urls.length - 1) {
        setMapError('Satellite tiles failed to load. Try switching layers or retry.');
      }
    } else {
      setMapError('Map tiles failed to load. Click retry to try again.');
    }
  }, [currentLayer, satelliteFallbackIndex]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setMapError(null);
    if (currentLayer === 'satellite') {
      setSatelliteFallbackIndex(0);
    }

    setTimeout(() => {
      setIsRetrying(false);
    }, 1000);
  }, [currentLayer]);

  useEffect(() => {
    if (currentLayer !== 'satellite') {
      setSatelliteFallbackIndex(0);
    }
  }, [currentLayer]);

  // Form setup
  const form = useForm<LocationFormSchema>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: getDefaultLocationValues('site'),
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

  // Watch form values
  const watchedLocationType = watch('location_type');
  const watchedLatitude = watch('latitude');
  const watchedLongitude = watch('longitude');

  // Initialize form with existing location data
  useEffect(() => {
    if (location) {
      console.log('Loading location data:', location);
      console.log('Country code from location:', location.country_code);
      
      reset({
        ...location,
        latitude: location.latitude || undefined,
        longitude: location.longitude || undefined,
        country_display: location.country_code
          ? COUNTRY_GROUPS[0]?.options.find(option => option.code === location.country_code)?.name
          : undefined,
      } as LocationFormSchema);

      // Debug: Check form value after reset
      setTimeout(() => {
        console.log('Form country_code value after reset:', watch('country_code'));
        console.log('All form values after reset:', watch());
      }, 100);

      if (location.latitude && location.longitude) {
        setMarkerPosition([location.latitude, location.longitude]);
        setMapCenter([location.latitude, location.longitude]);
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
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
    }
  }, [location, reset]);

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
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
      setValidationErrors({});
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, location, reset]);

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await smartLocationSearch(searchQuery.trim(), { limit: 8 });
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
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
      setValue('location_reach', DEFAULT_LOCATION_REACH);
    }
    if (!watch('exactness')) {
      setValue('exactness', DEFAULT_EXACTNESS);
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
      setValue('location_class', inferredLocationClass);
    }

    // Location ID vocabulary & code (OSM)
    const formattedOsmId = formatOsmIdentifier(osmType, osmId);
    if (formattedOsmId) {
      setValue('location_id_vocabulary', 'G2');
      setValue('location_id_code', formattedOsmId);
    }

    // Administrative data
    const adminData = deriveAdminData(address);
    if (adminData) {
      setValue('admin_vocabulary', adminData.vocabulary);
      setValue('admin_level', adminData.level);
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
          osmId: result.osm_id,
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
          osmId: result.osm_id,
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
    try {
      setIsSaving(true);
      setValidationErrors({});

      // Additional validation
      const errors: Record<string, string> = {};

      if (data.location_type === 'site') {
        if (data.latitude === undefined || data.longitude === undefined || !validateCoordinates(data.latitude, data.longitude)) {
          errors.coordinates = 'Valid latitude and longitude are required for site locations';
        }
      }


      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Prepare data for submission
      const allFormValues = watch();
      const locationData: LocationSchema = {
        ...data,
        ...allFormValues, // Include all form values, including country_code
        id: location?.id,
        activity_id: activityId,
        source: 'manual',
        validation_status: 'valid',
      };

      console.log('[LocationModal] Form data being submitted:', data);
      console.log('[LocationModal] Country code in form data:', data.country_code);
      console.log('[LocationModal] All form field names:', Object.keys(data));
      console.log('[LocationModal] All form values:', watch());
      console.log('[LocationModal] Final location data:', locationData);
      console.log('[LocationModal] Country code in final location data:', locationData.country_code);

      await onSave(locationData);

      toast.success(location?.id ? 'Location updated successfully' : 'Location added successfully');
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {location?.id ? 'Edit Location' : 'Add Location'}
          </DialogTitle>
        </DialogHeader>

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
                    {/* Map Layer Toggle */}
                    <Button
                      variant={currentLayer === 'roads' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleLayerChange(currentLayer === 'roads' ? 'satellite' : 'roads')}
                      className="flex items-center gap-2"
                    >
                      {currentLayer === 'roads' ? 'Street Map' : 'Satellite Image'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMapCenter(DEFAULT_CENTER);
                        setMapZoom(DEFAULT_ZOOM);
                        setMarkerPosition(null);
                        // Actually move the map to the new center
                        if (mapRef.current) {
                          mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
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
                  {mapError && (
                    <div className="absolute top-0 left-0 right-0 z-50 bg-red-100 border-b border-red-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{mapError}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRetry}
                          disabled={isRetrying}
                          className="text-red-800 border-red-300 hover:bg-red-50"
                        >
                          {isRetrying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          Retry
                        </Button>
                      </div>
                    </div>
                  )}

                  <LocationMap
                    mapCenter={mapCenter}
                    mapZoom={mapZoom}
                    mapRef={mapRef}
                    mapLayers={MAP_LAYERS}
                    currentLayer={currentLayer}
                    getLayerUrl={getLayerUrl}
                    onLayerChange={handleLayerChange}
                    onMapError={handleMapError}
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
                    💡 Click on the map to set coordinates
                  </div>

                  <div className="absolute top-4 left-4 bg-white/90 p-2 rounded shadow text-xs text-gray-600">
                    Layer: {MAP_LAYERS[currentLayer].name}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Search Locations</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search for a location (e.g., 'Yangon', 'Mandalay')..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto z-50">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectSearchResult(result)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                          >
                      <div className="font-medium text-gray-900">{result.name || result.display_name}</div>
                            <div className="text-sm text-gray-500 mt-1">{result.display_name}</div>
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Section */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)}>
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

                  {/* Coordinates (Site only) */}
                  {watchedLocationType === 'site' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="coordinates" className="flex items-center gap-2">
                          Coordinates
                          <HelpTextTooltip content="The geographic coordinates of the location in decimal degrees (latitude longitude). Must follow the WGS84 spatial reference standard (EPSG:4326)." />
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="coordinates"
                            type="text"
                            value={watchedLatitude !== undefined && watchedLongitude !== undefined 
                              ? `${watchedLatitude.toFixed(6)} ${watchedLongitude.toFixed(6)}`
                              : ''
                            }
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              if (value) {
                                const parts = value.split(/\s+/);
                                if (parts.length === 2) {
                                  const lat = parseFloat(parts[0]);
                                  const lng = parseFloat(parts[1]);
                                  if (!isNaN(lat) && !isNaN(lng) && validateCoordinates(lat, lng)) {
                                    setValue('latitude', lat);
                                    setValue('longitude', lng);
                                    // Clear any existing coordinate errors
                                    if (validationErrors.coordinates) {
                                      setValidationErrors(prev => {
                                        const { coordinates, ...rest } = prev;
                                        return rest;
                                      });
                                    }
                                  }
                                }
                              } else {
                                setValue('latitude', undefined);
                                setValue('longitude', undefined);
                              }
                            }}
                            placeholder="31.616944 65.716944"
                            className="flex-1"
                          />
                          {watchedLatitude !== undefined && watchedLongitude !== undefined && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const coords = `${watchedLatitude.toFixed(6)} ${watchedLongitude.toFixed(6)}`;
                              navigator.clipboard.writeText(coords);
                              toast.success('Coordinates copied to clipboard');
                            }}
                              className="px-2"
                          >
                              <Copy className="h-4 w-4" />
                          </Button>
                          )}
                        </div>
                        {(errors.latitude || errors.longitude) && (
                          <p className="text-sm text-red-600">
                            {errors.latitude?.message || errors.longitude?.message}
                          </p>
                      )}
                      </div>
                    </div>
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
                    onValueChange={(value) => setValue('location_reach', value)}
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
                    onValueChange={(value) => setValue('exactness', value)}
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
                    onValueChange={(value) => setValue('location_class', value)}
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
                        onValueChange={(value) => setValue('location_id_vocabulary', value)}
                        dropdownId="location-id-vocabulary-select"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location_id_code" className="flex items-center gap-2">
                        Location ID Code
                        {watch('location_id_vocabulary') && <span className="text-red-500">*</span>}
                        <HelpTextTooltip content="The actual identifier from the chosen vocabulary (e.g., GeoNames ID or OSM ID)." />
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="location_id_code"
                          type="text"
                          {...register('location_id_code', { 
                            setValueAs: (value) => value === '' ? undefined : Number(value)
                          })}
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
                        onValueChange={(value) => setValue('admin_vocabulary', value)}
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
                        onValueChange={(value) => setValue('admin_level', value)}
                        dropdownId="admin-level-select"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin_code" className="flex items-center gap-2">
                        Administrative Code
                        {watch('admin_level') && <span className="text-red-500">*</span>}
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

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
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
            </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
